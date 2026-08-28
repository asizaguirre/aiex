#!/usr/bin/env bash
# ============================================
# AlEx AI Platform v2 - Environment Setup
# ============================================
# This script validates and installs all required
# dependencies. Idempotent: safe to run multiple times.
# Only runs on Linux. Requires sudo.

set -Eeuo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { printf "${GREEN}[AlEx]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[AlEx]${NC} %s\n" "$*"; }
fail() { printf "${RED}[AlEx] ERRO:${NC} %s\n" "$*" >&2; exit 1; }
info() { printf "${BLUE}[AlEx]${NC} %s\n" "$*"; }

# ─── Only Linux ───────────────────────────────
[[ "$(uname -s)" == "Linux" ]] || fail "Este script só roda em Linux."

# ─── Sudo check ───────────────────────────────
if [[ "$(id -u)" -ne 0 ]]; then
  if ! sudo -n true 2>/dev/null; then
    warn "Senha de sudo necessária para instalar dependências."
    sudo -v || fail "Não foi possível obter acesso sudo."
  fi
  SUDO_CMD="sudo"
else
  SUDO_CMD=""
fi

# ─── Idempotent installer ─────────────────────
installed=()
skipped=()

install_if_missing() {
  local cmd="$1"
  local pkg="${2:-$1}"
  if command -v "$cmd" >/dev/null 2>&1; then
    skipped+=("$cmd")
  else
    log "Instalando $pkg..."
    $SUDO_CMD apt-get install -y -qq "$pkg" >/dev/null 2>&1
    installed+=("$cmd")
  fi
}

# ─── Update apt cache (once) ──────────────────
log "Atualizando cache de pacotes..."
$SUDO_CMD apt-get update -qq >/dev/null 2>&1

# ─── Core tools ───────────────────────────────
install_if_missing git git
install_if_missing curl curl
install_if_missing unzip unzip
install_if_missing jq jq

# ─── Java 21 ──────────────────────────────────
if command -v java >/dev/null 2>&1; then
  JAVA_VER=$(java -version 2>&1 | head -1 | grep -oP '\d+' | head -1)
  if [[ "$JAVA_VER" -ge 17 ]]; then
    skipped+=("java($JAVA_VER)")
  else
    log "Java $JAVA_VER encontrado, mas Java 17+ é necessário. Instalando..."
    $SUDO_CMD apt-get install -y -qq openjdk-21-jdk >/dev/null 2>&1
    installed+=("java-21")
  fi
else
  log "Instalando OpenJDK 21..."
  $SUDO_CMD apt-get install -y -qq openjdk-21-jdk >/dev/null 2>&1
  installed+=("java-21")
fi

# ─── Docker ───────────────────────────────────
if command -v docker >/dev/null 2>&1; then
  skipped+=("docker")
else
  log "Instalando Docker..."
  curl -fsSL https://get.docker.com | $SUDO_CMD sh >/dev/null 2>&1
  $SUDO_CMD usermod -aG docker "$USER" 2>/dev/null || true
  installed+=("docker")
fi

# Docker Compose plugin
if docker compose version >/dev/null 2>&1; then
  skipped+=("docker-compose")
else
  log "Instalando Docker Compose plugin..."
  $SUDO_CMD apt-get install -y -qq docker-compose-plugin >/dev/null 2>&1
  installed+=("docker-compose")
fi

# ─── ngrok ────────────────────────────────────
if command -v ngrok >/dev/null 2>&1; then
  skipped+=("ngrok")
else
  log "Instalando ngrok..."
  curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc | $SUDO_CMD tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
  echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | $SUDO_CMD tee /etc/apt/sources.list.d/ngrok.list >/dev/null
  $SUDO_CMD apt-get update -qq >/dev/null 2>&1
  $SUDO_CMD apt-get install -y -qq ngrok >/dev/null 2>&1
  installed+=("ngrok")
fi

# ─── Ollama ───────────────────────────────────
if command -v ollama >/dev/null 2>&1; then
  skipped+=("ollama")
else
  log "Instalando Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh >/dev/null 2>&1
  installed+=("ollama")
fi

# ─── Maven ────────────────────────────────────
if command -v mvn >/dev/null 2>&1; then
  skipped+=("maven")
else
  log "Instalando Maven..."
  $SUDO_CMD apt-get install -y -qq maven >/dev/null 2>&1
  installed+=("maven")
fi

# ─── Python 3 ─────────────────────────────────
install_if_missing python3 python3
install_if_missing pip3 python3-pip

# ─── Report ───────────────────────────────────
echo ""
info "════════════════════════════════════════"
info "  AlEx AI Platform v2 - Setup Complete  "
info "════════════════════════════════════════"
if [[ ${#skipped[@]} -gt 0 ]]; then
  log "Já instalados (pulados): ${skipped[*]}"
fi
if [[ ${#installed[@]} -gt 0 ]]; then
  log "Recém-instalados: ${installed[*]}"
else
  log "Nenhuma instalação necessária. Tudo pronto!"
fi
echo ""
