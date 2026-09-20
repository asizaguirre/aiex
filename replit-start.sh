#!/usr/bin/env bash
#
# AlEx Platform v3 — startup no Replit (sem Docker).
#
# - Compila o backend (Maven) e sobe o JAR Spring Boot (frontend estático embutido).
# - Porta: $PORT (o Replit expõe a Webview na 5000 por padrão).
# - Modo reduzido: sem Ollama e sem Elasticsearch (a UI e os recursos com
#   persistência JSON funcionam; o chat IA responde erro amigável até
#   OLLAMA_URL ser configurado).
#
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
JAR_FILE="$BACKEND_DIR/target/alex-platform-3.0.0.jar"

PORT="${PORT:-5000}"
export PORT

# Serviços opcionais indisponíveis no Replit → desligados por padrão.
export OLLAMA_WARMUP_ENABLED="${OLLAMA_WARMUP_ENABLED:-false}"
export ELASTICSEARCH_ENABLED="${ELASTICSEARCH_ENABLED:-false}"
export OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"
export OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5-coder:7b}"

log()  { printf '\n[AlEx:replit] %s\n' "$*"; }
fail() { printf '\n[AlEx:replit] ERRO: %s\n' "$*" >&2; exit 1; }

java_major() { "$1" -version 2>&1 | sed -n 's/.*version "\([0-9]*\).*/\1/p' | head -1; }

configure_java_runtime() {
  local candidate major
  for candidate in "${JAVA_HOME:-}" "$HOME"/.jdk/jdk-25* /usr/lib/jvm/*25*; do
    [[ -x "$candidate/bin/java" ]] || continue
    major="$(java_major "$candidate/bin/java")"
    if [[ "$major" == "25" ]]; then
      export JAVA_HOME="$candidate"
      export PATH="$JAVA_HOME/bin:$PATH"
      log "Java 25 em $JAVA_HOME"
      return 0
    fi
  done
  if command -v java >/dev/null 2>&1; then
    major="$(java_major java)"
    [[ "$major" == "25" ]] || fail "Java 25 é obrigatório (encontrado: ${major:-desconhecido} em $(command -v java)). No Replit, ative um runtime Java 25 e rode de novo."
    log "Java 25 do sistema em $(command -v java)"
    return 0
  fi
  fail "Java 25 não encontrado. Instale um JDK 25 (local: ~/.jdk/jdk-25*; Replit: runtime Java 25) e rode de novo."
}

mkdir -p "$ROOT_DIR/db" "$ROOT_DIR/db/public_media" "$ROOT_DIR/rag/documents" "$ROOT_DIR/rag/vectorstore"

configure_java_runtime

if [[ ! -f "$JAR_FILE" ]] || [[ "${REBUILD:-false}" == "true" ]]; then
  command -v mvn >/dev/null 2>&1 || fail "Maven (mvn) não encontrado. Instale o Maven 3.9+ e rode de novo."
  log "Compilando backend (mvn -DskipTests package)…"
  (cd "$BACKEND_DIR" && mvn -B -DskipTests package)
else
  log "Usando JAR existente: $JAR_FILE (REBUILD=true para recompilar)"
fi

log "Subindo AlEx Platform v3 em http://0.0.0.0:${PORT} (modo reduzido: Ollama/ES desligados)"
log "Saúde: /actuator/health · API: /api/health"
exec java -jar "$JAR_FILE"
