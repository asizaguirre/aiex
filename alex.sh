#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
MODE="docker"
INSTALL_SYSTEM_DEPS="false"
OPEN_BROWSER="true"
PORT="${PORT:-8080}"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5-coder:7b}"
RAG_MODEL="${RAG_MODEL:-qwen2.5:7b-instruct-q4_K_M}"
EMBEDDING_MODEL="${EMBEDDING_MODEL:-nomic-embed-text}"

log() { printf '\n[AlEx] %s\n' "$*"; }
fail() { printf '\n[AlEx] ERRO: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Uso: ./alex.sh [opcoes]

  --docker                 inicia a plataforma em Docker (padrao)
  --local                  inicia Ollama e o backend diretamente no sistema
  --install-system-deps    tenta instalar Java, Maven, Python e Docker via apt
  --no-browser             nao abre o navegador automaticamente
  --help                   mostra esta ajuda

O comando e idempotente: pode ser executado novamente sem recriar dados ou
baixar modelos que ja estejam instalados.
EOF
}

command_exists() { command -v "$1" >/dev/null 2>&1; }
configure_java_runtime() {
  local candidate major
  for candidate in "${JAVA_HOME:-}" "$HOME"/.jdk/jdk-25* /usr/lib/jvm/*25*; do
    [[ -x "$candidate/bin/java" ]] || continue
    major=$("$candidate/bin/java" -version 2>&1 | sed -n 's/.*version "\([0-9]*\).*/\1/p' | head -1)
    if [[ "$major" == "25" ]]; then
      export JAVA_HOME="$candidate"
      export PATH="$JAVA_HOME/bin:$PATH"
      return 0
    fi
  done
  fail "Java 25 nao encontrado. Configure JAVA_HOME para um JDK 25 antes de iniciar a plataforma."
}

install_system_deps() {
  [[ "$(uname -s)" == "Linux" ]] || fail "A instalacao automatica so esta preparada para Linux. Instale Docker, Java 25, Maven, Python 3 e curl manualmente."
  command_exists apt-get || fail "apt-get nao encontrado. Instale Docker, Java 25, Maven, Python 3 e curl manualmente."

  local sudo_cmd=()
  if [[ "$(id -u)" -ne 0 ]]; then
    command_exists sudo || fail "E necessario sudo para instalar dependencias do sistema."
    sudo_cmd=(sudo)
  fi

  log "Instalando dependencias do sistema"
  "${sudo_cmd[@]}" apt-get update
  local packages=(ca-certificates curl openjdk-25-jdk maven python3 python3-venv)
  if [[ "$MODE" == "docker" ]]; then
    packages+=(docker.io docker-compose-plugin)
  fi
  "${sudo_cmd[@]}" apt-get install -y "${packages[@]}"
  if [[ "$MODE" == "docker" ]]; then
    "${sudo_cmd[@]}" systemctl enable --now docker 2>/dev/null || true
  fi

  if [[ "$MODE" == "local" ]] && ! command_exists ollama; then
    log "Instalando Ollama"
    curl -fsSL https://ollama.com/install.sh | sh
  fi
}

check_dependencies() {
  local missing=()
  if [[ "$MODE" == "docker" ]]; then
    command_exists docker || missing+=(docker)
    docker compose version >/dev/null 2>&1 || missing+=("docker compose")
  else
    configure_java_runtime
    command_exists java || missing+=(java)
    command_exists curl || missing+=(curl)
    command_exists ollama || missing+=(ollama)
    if ! command_exists mvn && ! command_exists docker; then
      missing+=("maven ou docker")
    fi
  fi

  if (( ${#missing[@]} > 0 )); then
    if [[ "$INSTALL_SYSTEM_DEPS" == "true" ]]; then
      install_system_deps
      check_dependencies
    else
      fail "Dependencias ausentes: ${missing[*]}. Execute novamente com --install-system-deps ou instale-as manualmente."
    fi
  fi
}

open_browser() {
  [[ "$OPEN_BROWSER" == "true" ]] || return 0
  local url="http://localhost:${PORT}"
  if command_exists xdg-open; then
    xdg-open "$url" >/dev/null 2>&1 &
  elif command_exists open; then
    open "$url" >/dev/null 2>&1 &
  elif command_exists start; then
    start "$url" >/dev/null 2>&1 &
  else
    log "Abra manualmente: $url"
  fi
}

wait_for_http() {
  local url="$1"
  local attempts=60
  until curl -fsS "$url" >/dev/null 2>&1; do
    ((attempts--))
    (( attempts > 0 )) || fail "A aplicacao nao respondeu em $url. Consulte os logs do backend."
    sleep 2
  done
}

pull_docker_model() {
  local model="$1"
  log "Verificando modelo Ollama: $model"
  docker compose -f "$COMPOSE_FILE" exec -T ollama ollama pull "$model"
}

start_docker() {
  [[ -f "$COMPOSE_FILE" ]] || fail "Arquivo docker-compose.yml nao encontrado."
  mkdir -p "$ROOT_DIR/db" "$ROOT_DIR/rag/documents" "$ROOT_DIR/rag/vectorstore"

  log "Construindo e iniciando backend, Ollama e persistencia local"
  docker compose -f "$COMPOSE_FILE" up -d --build
  pull_docker_model "$OLLAMA_MODEL"
  pull_docker_model "$RAG_MODEL"
  pull_docker_model "$EMBEDDING_MODEL"

  log "Aguardando a interface web"
  wait_for_http "http://localhost:${PORT}/actuator/health"
  open_browser
  log "Plataforma pronta em http://localhost:${PORT}"
  log "Documentos RAG: $ROOT_DIR/rag/documents"
  log "Para parar: docker compose down"
}

start_ollama_local() {
  if curl -fsS http://localhost:11434/api/tags >/dev/null 2>&1; then
    return 0
  fi
  log "Iniciando Ollama local"
  ollama serve >/tmp/alex-ollama.log 2>&1 &
  OLLAMA_PID=$!
  trap 'kill "$OLLAMA_PID" 2>/dev/null || true' EXIT
  wait_for_http "http://localhost:11434/api/tags"
}

start_local() {
  mkdir -p "$ROOT_DIR/db" "$ROOT_DIR/rag/documents" "$ROOT_DIR/rag/vectorstore"
  configure_java_runtime
  start_ollama_local
  log "Baixando modelos Ollama, se necessario"
  ollama pull "$OLLAMA_MODEL"
  ollama pull "$RAG_MODEL"
  ollama pull "$EMBEDDING_MODEL"

  export PORT OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}" OLLAMA_MODEL
  if command_exists mvn; then
    log "Construindo backend com Maven local"
    (cd "$BACKEND_DIR" && mvn -B -DskipTests package)
    log "Iniciando backend local"
    java -jar "$BACKEND_DIR/target/alex-platform-3.0.0.jar" &
    BACKEND_PID=$!
    trap 'kill "$BACKEND_PID" 2>/dev/null || true' EXIT
  else
    log "Maven ausente; construindo e executando somente o backend em Docker"
    docker build -t alex-platform-local "$BACKEND_DIR"
    docker run --rm --name alex-platform-local --network host \
      -e PORT="$PORT" -e OLLAMA_URL="$OLLAMA_URL" -e OLLAMA_MODEL="$OLLAMA_MODEL" \
      -v "$ROOT_DIR/db:/IA/workspace/alex-platform-v2/db" \
      -v "$ROOT_DIR/rag:/IA/workspace/alex-platform-v2/rag" \
      alex-platform-local &
    BACKEND_PID=$!
    trap 'docker stop alex-platform-local >/dev/null 2>&1 || true; kill "$BACKEND_PID" 2>/dev/null || true' EXIT
  fi
  wait_for_http "http://localhost:${PORT}/actuator/health"
  open_browser
  log "Plataforma pronta em http://localhost:${PORT}"
  wait "$BACKEND_PID"
}

while (( $# > 0 )); do
  case "$1" in
    --docker) MODE="docker" ;;
    --local) MODE="local" ;;
    --install-system-deps) INSTALL_SYSTEM_DEPS="true" ;;
    --no-browser) OPEN_BROWSER="false" ;;
    --help|-h) usage; exit 0 ;;
    *) fail "Opcao desconhecida: $1" ;;
  esac
  shift
done

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

check_dependencies
if [[ "$MODE" == "docker" ]]; then
  start_docker
else
  start_local
fi