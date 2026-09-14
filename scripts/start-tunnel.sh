#!/usr/bin/env bash
# ============================================
# AlEx AI Platform v3 - ngrok Tunnel
# ============================================
# Inicia o tunnel ngrok com domínio fixo para o backend AlEx.
# Uso: ./scripts/start-tunnel.sh [porta] [dominio]

set -Eeuo pipefail

# Carrega variáveis do .env (raiz do projeto ou config/.env)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
for ENV_FILE in "$PROJECT_ROOT/.env" "$PROJECT_ROOT/config/.env"; do
  if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
    break
  fi
done

PORT="${1:-${PORT:-8080}}"
DOMAIN="${2:-${NGROK_DOMAIN:-}}"
LOG_FILE="/tmp/ngrok.log"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log()  { printf "${GREEN}[AlEx]${NC} %s\n" "$*"; }
fail() { printf "${RED}[AlEx] ERRO:${NC} %s\n" "$*" >&2; exit 1; }

command -v ngrok >/dev/null 2>&1 || fail "ngrok não encontrado. Execute ./scripts/setup.sh primeiro."

# Configura o authtoken do ngrok (se definido no .env)
if [[ -n "${NGROK_AUTHTOKEN:-}" ]]; then
  ngrok config add-authtoken "$NGROK_AUTHTOKEN" >/dev/null 2>&1 \
    || log "Aviso: não foi possível salvar o authtoken no ngrok (pode já estar configurado)."
fi

# Mata tunnel anterior se existir
pkill -9 -f "ngrok http" 2>/dev/null || true

log "Iniciando ngrok na porta $PORT com domínio $DOMAIN..."
if [[ -n "$DOMAIN" ]]; then
  ngrok http "$PORT" --domain="$DOMAIN" --log=stdout > "$LOG_FILE" 2>&1 &
else
  ngrok http "$PORT" --log=stdout > "$LOG_FILE" 2>&1 &
fi
TUNNEL_PID=$!

# Aguarda a URL ser gerada pela API do ngrok
TUNNEL_URL=""
for i in $(seq 1 30); do
  TUNNEL_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[0].public_url' 2>/dev/null || true)
  if [[ -n "$TUNNEL_URL" && "$TUNNEL_URL" != "null" ]]; then
    break
  fi
  sleep 1
done

if [[ -z "$TUNNEL_URL" || "$TUNNEL_URL" == "null" ]]; then
  fail "Timeout aguardando URL do ngrok. Verifique: cat $LOG_FILE"
fi

echo ""
printf "${BLUE}════════════════════════════════════════${NC}\n"
printf "${GREEN}  🌐 ngrok ativo: ${NC}%s\n" "$TUNNEL_URL"
printf "${GREEN}  📋 PID: ${NC}%s\n" "$TUNNEL_PID"
printf "${GREEN}  📄 Log: ${NC}%s\n" "$LOG_FILE"
printf "${BLUE}════════════════════════════════════════${NC}\n"
echo ""

# Atualiza config.json do workspace se existir
CONFIG_FILE="$HOME/ai-workspace/config.json"
if [[ -f "$CONFIG_FILE" ]] && command -v jq >/dev/null 2>&1; then
  jq --arg url "${TUNNEL_URL}/" '.server_url = $url' "$CONFIG_FILE" > /tmp/config_tmp.json \
    && mv /tmp/config_tmp.json "$CONFIG_FILE"
  log "config.json atualizado com a URL do ngrok"
fi

log "Para parar: pkill ngrok"
