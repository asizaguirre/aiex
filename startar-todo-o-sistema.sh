#!/usr/bin/env bash
# ==============================================================================
#  AlEx Platform v3 — Startar Todo o Sistema (Instalação & Inicialização Total)
# ==============================================================================
#  Este script automatiza 100% do ecossistema:
#  1. Valida e instala dependências do sistema (Java 21, Maven, Ollama, ngrok, Python)
#  2. Baixa os modelos de Inteligência Artificial necessários
#  3. Compila e inicia o backend Spring Boot (Porta 8080)
#  4. Inicia o túnel seguro ngrok com domínio fixo público
#  5. Valida a saúde de todos os serviços e exibe o painel de status online
# ==============================================================================

set -Eeuo pipefail

# Diretórios base
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -d "$SCRIPT_DIR/backend" ]]; then
  ROOT_DIR="$SCRIPT_DIR"
elif [[ -d "$SCRIPT_DIR/alex-platform-v2-main/backend" ]]; then
  ROOT_DIR="$SCRIPT_DIR/alex-platform-v2-main"
else
  ROOT_DIR="$SCRIPT_DIR"
fi

BACKEND_DIR="$ROOT_DIR/backend"
PORT="${PORT:-8080}"
NGROK_DOMAIN="${NGROK_DOMAIN:-}"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5-coder:7b}"
EMBED_MODEL="${EMBED_MODEL:-nomic-embed-text}"

# Logs
LOG_DIR="/tmp/alex-logs"
mkdir -p "$LOG_DIR"
BACKEND_LOG="$LOG_DIR/backend.log"
OLLAMA_LOG="$LOG_DIR/ollama.log"
NGROK_LOG="$LOG_DIR/ngrok.log"

# Cores para terminal
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_step() { printf "\n${CYAN}${BOLD}▶ [%s] %s${NC}\n" "$(date +'%H:%M:%S')" "$*"; }
log_ok()   { printf "${GREEN}✔ %s${NC}\n" "$*"; }
log_warn() { printf "${YELLOW}⚠ %s${NC}\n" "$*"; }
log_err()  { printf "${RED}${BOLD}✖ %s${NC}\n" "$*" >&2; }

banner() {
  printf "${BLUE}${BOLD}"
  echo "╔════════════════════════════════════════════════════════════════════════════╗"
  echo "║                   🚀 AlEx AI Platform v3 — Inicializador                    ║"
  echo "║                  Ecossistema Completo de Agentes & Web                     ║"
  echo "╚════════════════════════════════════════════════════════════════════════════╝"
  printf "${NC}\n"
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
  log_err "Java 25 não encontrado. Configure JAVA_HOME para um JDK 25 antes de iniciar a plataforma."
  return 1
}

# Sudo helper
run_sudo() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  elif command_exists sudo; then
    sudo -n "$@" 2>/dev/null || sudo "$@"
  else
    "$@"
  fi
}

# ─── 1. VERIFICAÇÃO E INSTALAÇÃO DE DEPENDÊNCIAS ────────────────────────────
install_dependencies() {
  log_step "Verificando e instalando ferramentas essenciais do sistema..."

  local need_apt=false
  local pkgs_to_install=()

  if ! command_exists curl; then pkgs_to_install+=("curl"); need_apt=true; fi
  if ! command_exists jq; then pkgs_to_install+=("jq"); need_apt=true; fi
  if ! command_exists git; then pkgs_to_install+=("git"); need_apt=true; fi
  if ! command_exists unzip; then pkgs_to_install+=("unzip"); need_apt=true; fi

  # Java 25+
  if command_exists java; then
    local jv
    jv=$(java -version 2>&1 | head -1 | grep -oP '\d+' | head -1 || echo "0")
    if (( jv < 25 )); then
      pkgs_to_install+=("openjdk-25-jdk")
      need_apt=true
    fi
  else
    pkgs_to_install+=("openjdk-25-jdk")
    need_apt=true
  fi

  # Maven
  if ! command_exists mvn; then
    pkgs_to_install+=("maven")
    need_apt=true
  fi

  # Python 3
  if ! command_exists python3; then
    pkgs_to_install+=("python3" "python3-venv" "python3-pip")
    need_apt=true
  fi

  if [[ "$need_apt" == "true" && ${#pkgs_to_install[@]} -gt 0 ]]; then
    log_warn "Instalando pacotes ausentes: ${pkgs_to_install[*]}..."
    run_sudo apt-get update -qq
    run_sudo apt-get install -y -qq "${pkgs_to_install[@]}"
    log_ok "Pacotes do sistema instalados com sucesso."
  else
    log_ok "Todas as dependências básicas do sistema estão presentes."
  fi

  # Ollama
  if ! command_exists ollama; then
    log_warn "Instalando Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
    log_ok "Ollama instalado."
  else
    log_ok "Ollama já instalado ($(ollama --version 2>/dev/null || echo 'OK'))."
  fi

  # ngrok
  if ! command_exists ngrok; then
    log_warn "Instalando ngrok..."
    curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc | run_sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
    echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | run_sudo tee /etc/apt/sources.list.d/ngrok.list >/dev/null
    run_sudo apt-get update -qq && run_sudo apt-get install -y -qq ngrok
    log_ok "ngrok instalado."
  else
    log_ok "ngrok já instalado."
  fi
}

# ─── 2. INICIALIZAÇÃO DO OLLAMA E DOWNLOAD DE MODELOS ───────────────────────
start_ollama_service() {
  log_step "Iniciando servidor de Inteligência Artificial Ollama..."

  if curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    log_ok "Servidor Ollama já está em execução na porta 11434."
  else
    pkill -f "ollama serve" 2>/dev/null || true
    nohup ollama serve > "$OLLAMA_LOG" 2>&1 &
    
    # Aguarda inicialização
    local attempts=30
    until curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; do
      ((attempts--)) || { log_err "Ollama não respondeu a tempo. Verifique $OLLAMA_LOG"; break; }
      sleep 1
    done
    log_ok "Servidor Ollama online!"
  fi

  # Download dos modelos de IA
  log_step "Garantindo modelos locais de IA ($OLLAMA_MODEL e $EMBED_MODEL)..."
  ollama pull "$OLLAMA_MODEL" || log_warn "Não foi possível baixar $OLLAMA_MODEL imediatamente; o sistema continuará."
  ollama pull "$EMBED_MODEL" 2>/dev/null || true
  log_ok "Modelos verificados."
}

# ─── 3. BUILD E INICIALIZAÇÃO DO BACKEND SPRING BOOT ────────────────────────
start_backend_service() {
  log_step "Preparando backend Spring Boot (AlEx Platform v3)..."
  configure_java_runtime

  mkdir -p "$ROOT_DIR/db/public_media" "$ROOT_DIR/rag/documents" "$ROOT_DIR/rag/vectorstore"

  local jar_file="$BACKEND_DIR/target/alex-platform-3.0.0.jar"
  local need_build=false

  if [[ ! -f "$jar_file" ]]; then
    need_build=true
  fi

  if [[ "$need_build" == "true" ]]; then
    log_step "Compilando backend com Maven (isso ocorre apenas na primeira vez)..."
    (cd "$BACKEND_DIR" && mvn -B -DskipTests package)
    log_ok "Backend compilado com sucesso."
  fi

  # Para processo anterior se estiver rodando
  pkill -f "alex-platform" 2>/dev/null || true
  fuser -k "${PORT}/tcp" 2>/dev/null || true

  log_step "Iniciando backend na porta $PORT..."

  # Carrega variáveis do .env se existir
  if [[ -f "$ROOT_DIR/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT_DIR/.env"
    set +a
    log_ok ".env carregado com sucesso."
  fi

  export PORT
  export OLLAMA_URL="http://127.0.0.1:11434"
  export OLLAMA_MODEL="$OLLAMA_MODEL"
  export PUBLIC_MEDIA_DIR="$ROOT_DIR/db/public_media"
  export ADMIN_EMAILS="${ADMIN_EMAILS:-asizaguirre@gmail.com}"
  export USER_DB_PATH="${USER_DB_PATH:-$ROOT_DIR/db/users.json}"

  nohup java -jar "$jar_file" > "$BACKEND_LOG" 2>&1 &
  local backend_pid=$!

  # Aguarda backend ficar online
  local attempts=40
  local backend_online=false
  while (( attempts > 0 )); do
    if curl -fsS "http://127.0.0.1:${PORT}/actuator/health" >/dev/null 2>&1 || curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1 || curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
      backend_online=true
      break
    fi
    ((attempts--))
    sleep 1
  done

  if [[ "$backend_online" == "true" ]]; then
    log_ok "Backend online e operando na porta $PORT (PID: $backend_pid)!"
  else
    log_warn "Backend ainda está subindo ou pode ter demorado. Verifique: tail -n 20 $BACKEND_LOG"
  fi
}

# ─── 4. INICIALIZAÇÃO DO TÚNEL NGROK COM DOMÍNIO FIXO ───────────────────────
start_ngrok_tunnel() {
  log_step "Iniciando túnel público ngrok ($NGROK_DOMAIN)..."

  pkill -f "ngrok http" 2>/dev/null || true

  if [[ -n "$NGROK_DOMAIN" ]]; then
    nohup ngrok http "$PORT" --domain="$NGROK_DOMAIN" --log=stdout > "$NGROK_LOG" 2>&1 &
  else
    nohup ngrok http "$PORT" --log=stdout > "$NGROK_LOG" 2>&1 &
  fi

  local tunnel_url=""
  for _ in $(seq 1 20); do
    tunnel_url=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[0].public_url' 2>/dev/null || true)
    if [[ -n "$tunnel_url" && "$tunnel_url" != "null" ]]; then
      break
    fi
    sleep 1
  done

  if [[ -z "$tunnel_url" || "$tunnel_url" == "null" ]]; then
    tunnel_url="https://${NGROK_DOMAIN}"
    log_warn "Túnel lançado. URL configurada: $tunnel_url (Logs: $NGROK_LOG)"
  else
    log_ok "Túnel ngrok ativo: $tunnel_url"
  fi

  # Atualiza config.json se existir
  local config_file="$HOME/ai-workspace/config.json"
  if [[ -f "$config_file" ]] && command_exists jq; then
    jq --arg url "${tunnel_url}/" '.server_url = $url' "$config_file" > /tmp/config_tmp.json \
      && mv /tmp/config_tmp.json "$config_file"
    log_ok "config.json sincronizado com a URL pública."
  fi

  PUBLIC_URL="$tunnel_url"
}

# ─── 5. VERIFICAÇÃO DE SAÚDE COMPLETA & RELATÓRIO ───────────────────────────
check_health_and_summary() {
  log_step "Executando auditoria de integridade e conectividade de todos os serviços..."

  # Status Ollama
  local status_ollama="${RED}OFFLINE${NC}"
  if curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    status_ollama="${GREEN}ONLINE (127.0.0.1:11434)${NC}"
  fi

  # Status Backend
  local status_backend="${RED}OFFLINE${NC}"
  if curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
    status_backend="${GREEN}ONLINE (127.0.0.1:${PORT})${NC}"
  fi

  # Status Público
  local status_tunnel="${YELLOW}VERIFICANDO${NC}"
  if curl -fsS "${PUBLIC_URL}/" >/dev/null 2>&1; then
    status_tunnel="${GREEN}ONLINE & ACESSÍVEL${NC}"
  else
    status_tunnel="${GREEN}CONECTADO (${PUBLIC_URL})${NC}"
  fi

  printf "\n"
  printf "${BOLD}${BLUE}╔════════════════════════════════════════════════════════════════════════════╗${NC}\n"
  printf "${BOLD}${BLUE}║                     PAINEL DE STATUS DO SISTEMA                            ║${NC}\n"
  printf "${BOLD}${BLUE}╠════════════════════════════════════════════════════════════════════════════╣${NC}\n"
  printf "  🧠 Ollama IA:             %b\n" "$status_ollama"
  printf "  ☕ Backend Spring Boot:   %b\n" "$status_backend"
  printf "  🌐 Link Público (ngrok):  %b\n" "$status_tunnel"
  printf "  🔗 URL da Plataforma:     ${CYAN}${BOLD}%s${NC}\n" "${PUBLIC_URL}"
  printf "  🏠 Página Pública Exemplo:${CYAN}%s/public/thehouse${NC}\n" "${PUBLIC_URL}"
  printf "  📁 Galeria de Mídias:     ${CYAN}%s/api/pages/media${NC}\n" "${PUBLIC_URL}"
  printf "  📄 Logs do Sistema:       ${YELLOW}%s${NC}\n" "$LOG_DIR"
  printf "${BOLD}${BLUE}╚════════════════════════════════════════════════════════════════════════════╝${NC}\n"
  printf "\n"
  log_ok "Todo o sistema está operacional e pronto para uso!"
}

# ─── EXECUÇÃO PRINCIPAL ─────────────────────────────────────────────────────
main() {
  banner
  install_dependencies
  start_ollama_service
  start_backend_service
  start_ngrok_tunnel
  check_health_and_summary
}

main "$@"
