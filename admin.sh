#!/usr/bin/env bash
# ==============================================================================
#  AlEx Platform v3 — admin.sh · Painel de Controle & Monitoramento
# ==============================================================================
#  Comandos rápidos:
#    ./admin.sh              → Menu interativo
#    ./admin.sh start        → Inicia tudo
#    ./admin.sh stop         → Para tudo
#    ./admin.sh restart      → Reinicia tudo
#    ./admin.sh monitor      → Console de monitoramento
#    ./admin.sh status       → Status rápido
#    ./admin.sh back:start   → Só o backend
#    ./admin.sh back:stop
#    ./admin.sh back:build   → Recompila + inicia
#    ./admin.sh ngrok:start
#    ./admin.sh ngrok:stop
#    ./admin.sh ollama:start
#    ./admin.sh ollama:stop
# ==============================================================================

set -Eeuo pipefail

# ── Diretórios ─────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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
  printf '\n[AlEx] ERRO: Java 25 nao encontrado. Configure JAVA_HOME para um JDK 25 antes de iniciar a plataforma.\n' >&2
  return 1
}

configure_java_runtime
ROOT_DIR="$SCRIPT_DIR"
BACKEND_DIR="$ROOT_DIR/backend"
JAR_FILE="$BACKEND_DIR/target/alex-platform-3.0.0.jar"

LOG_DIR="/tmp/alex-logs"
mkdir -p "$LOG_DIR"
BACKEND_LOG="$LOG_DIR/backend.log"
OLLAMA_LOG="$LOG_DIR/ollama.log"
NGROK_LOG="$LOG_DIR/ngrok.log"

# ── Carrega .env ───────────────────────────────────────────────────────────────
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a; source "$ROOT_DIR/.env"; set +a
fi

PORT="${PORT:-8080}"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5-coder:7b}"
EMBED_MODEL="${EMBED_MODEL:-nomic-embed-text}"
NGROK_DOMAIN="${NGROK_DOMAIN:-}"
ADMIN_EMAILS="${ADMIN_EMAILS:-asizaguirre@gmail.com}"
USER_DB_PATH="${USER_DB_PATH:-$ROOT_DIR/db/users.json}"

# ── Cores ──────────────────────────────────────────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BG_DARK='\033[48;5;234m'

# ── Utilitários ────────────────────────────────────────────────────────────────
command_exists() { command -v "$1" &>/dev/null; }
log_ok()   { printf "${GREEN}✔${RESET}  %s\n" "$*"; }
log_err()  { printf "${RED}✖${RESET}  %s\n" "$*"; }
log_warn() { printf "${YELLOW}⚠${RESET}  %s\n" "$*"; }
log_info() { printf "${CYAN}→${RESET}  %s\n" "$*"; }
log_step() { printf "\n${BOLD}${BLUE}▶ %s${RESET}\n" "$*"; }
press_enter() { printf "\n${DIM}  Pressione ENTER para continuar...${RESET}"; read -r; }

# ── Status de cada componente ──────────────────────────────────────────────────
status_backend() {
  if curl -fsS "http://127.0.0.1:${PORT}/" &>/dev/null 2>&1 || \
     curl -fsS "http://127.0.0.1:${PORT}/actuator/health" &>/dev/null 2>&1; then
    echo "ONLINE"
  else
    echo "OFFLINE"
  fi
}

status_ollama() {
  if curl -fsS "http://127.0.0.1:11434/api/tags" &>/dev/null 2>&1; then
    echo "ONLINE"
  else
    echo "OFFLINE"
  fi
}

status_ngrok() {
  if pgrep -f "ngrok http" &>/dev/null; then
    echo "ONLINE"
  else
    echo "OFFLINE"
  fi
}

pid_backend() { pgrep -f "alex-platform" 2>/dev/null | head -1 || echo "—"; }
pid_ollama()  { pgrep -f "ollama serve"  2>/dev/null | head -1 || echo "—"; }
pid_ngrok()   { pgrep -f "ngrok http"    2>/dev/null | head -1 || echo "—"; }

color_status() {
  local s="$1"
  if [[ "$s" == "ONLINE" ]]; then
    printf "${GREEN}${BOLD}● ONLINE ${RESET}"
  else
    printf "${RED}${BOLD}○ OFFLINE${RESET}"
  fi
}

# ── Banner / Header ────────────────────────────────────────────────────────────
draw_header() {
  clear
  local BACK OLLA NGRO
  BACK=$(status_backend)
  OLLA=$(status_ollama)
  NGRO=$(status_ngrok)

  printf "${BG_DARK}${WHITE}${BOLD}"
  printf "╔══════════════════════════════════════════════════════════════════════════╗\n"
  printf "║       🚀  AlEx Platform v3 — Painel de Controle & Monitoramento         ║\n"
  printf "╠══════════════════════════════════════════════════════════════════════════╣\n"
  printf "${RESET}${BG_DARK}"

  printf "║  ${CYAN}☕ Backend  (:%s)${RESET}${BG_DARK}  " "$PORT"
  color_status "$BACK"
  printf "${BG_DARK}   PID: ${DIM}%-6s${RESET}${BG_DARK}                      ║\n" "$(pid_backend)"

  printf "║  ${YELLOW}🧠 Ollama   (:11434)${RESET}${BG_DARK} "
  color_status "$OLLA"
  printf "${BG_DARK}   PID: ${DIM}%-6s${RESET}${BG_DARK}                      ║\n" "$(pid_ollama)"

  printf "║  ${MAGENTA}🌐 Túnel    ngrok   ${RESET}${BG_DARK}  "
  color_status "$NGRO"
  printf "${BG_DARK}   PID: ${DIM}%-6s${RESET}${BG_DARK}                      ║\n" "$(pid_ngrok)"

  printf "${BG_DARK}${WHITE}${BOLD}"
  printf "╠══════════════════════════════════════════════════════════════════════════╣\n"
  printf "║  ${DIM}Admin: %-40s localhost:%-5s${BOLD}${WHITE}║\n" "$ADMIN_EMAILS" "$PORT"
  printf "╚══════════════════════════════════════════════════════════════════════════╝\n"
  printf "${RESET}\n"
}

# ── Menu principal ─────────────────────────────────────────────────────────────
draw_menu() {
  printf "  ${GREEN}${BOLD}[1]${RESET}  🚀  Iniciar TODO o sistema\n"
  printf "  ${RED}${BOLD}[2]${RESET}  🛑  Parar TODO o sistema\n"
  printf "  ${YELLOW}${BOLD}[3]${RESET}  🔄  Reiniciar TODO o sistema\n"
  printf "\n"
  printf "  ${BOLD}${DIM}──── Backend (Spring Boot) ────────────────────${RESET}\n"
  printf "  ${GREEN}${BOLD}[4]${RESET}  ▶   Start Backend\n"
  printf "  ${RED}${BOLD}[5]${RESET}  ■   Stop Backend\n"
  printf "  ${YELLOW}${BOLD}[6]${RESET}  ↺   Restart Backend\n"
  printf "  ${CYAN}${BOLD}[7]${RESET}  🔨  Recompilar (Maven) + Restart\n"
  printf "\n"
  printf "  ${BOLD}${DIM}──── Túnel Público (ngrok) ────────────────────${RESET}\n"
  printf "  ${GREEN}${BOLD}[8]${RESET}  ▶   Start Túnel\n"
  printf "  ${RED}${BOLD}[9]${RESET}  ■   Stop Túnel\n"
  printf "  ${YELLOW}${BOLD}[10]${RESET} ↺   Restart Túnel\n"
  printf "\n"
  printf "  ${BOLD}${DIM}──── Ollama (IA Engine) ───────────────────────${RESET}\n"
  printf "  ${GREEN}${BOLD}[11]${RESET} ▶   Start Ollama\n"
  printf "  ${RED}${BOLD}[12]${RESET} ■   Stop Ollama\n"
  printf "\n"
  printf "  ${BOLD}${DIM}──── Monitoramento ────────────────────────────${RESET}\n"
  printf "  ${CYAN}${BOLD}[13]${RESET} 📊  Console de Monitoramento (todos os logs)\n"
  printf "  ${CYAN}${BOLD}[14]${RESET} 📋  Logs do Backend\n"
  printf "  ${CYAN}${BOLD}[15]${RESET} 📋  Logs do Ollama\n"
  printf "  ${CYAN}${BOLD}[16]${RESET} 📋  Logs do Túnel ngrok\n"
  printf "\n"
  printf "  ${DIM}[0]  Sair${RESET}\n"
  printf "\n"
  printf "  ${BOLD}Escolha: ${RESET}"
}

# ══════════════════════════════════════════════════════════════════════════════
#  BACKEND
# ══════════════════════════════════════════════════════════════════════════════
do_start_backend() {
  log_step "Iniciando Backend Spring Boot..."
  mkdir -p "$ROOT_DIR/db/public_media" "$ROOT_DIR/rag/documents" "$ROOT_DIR/rag/vectorstore"

  if [[ ! -f "$JAR_FILE" ]]; then
    log_warn "JAR não encontrado. Compilando com Maven..."
    (cd "$BACKEND_DIR" && mvn -B -DskipTests package) \
      && log_ok "Compilação concluída." \
      || { log_err "Falha na compilação."; return 1; }
  fi

  pkill -f "alex-platform" 2>/dev/null || true
  fuser -k "${PORT}/tcp" 2>/dev/null || true
  sleep 1

  export PORT OLLAMA_MODEL
  export OLLAMA_URL="http://127.0.0.1:11434"
  export PUBLIC_MEDIA_DIR="$ROOT_DIR/db/public_media"
  export ADMIN_EMAILS="$ADMIN_EMAILS"
  export USER_DB_PATH="$USER_DB_PATH"

  : > "$BACKEND_LOG"
  nohup java -jar "$JAR_FILE" >> "$BACKEND_LOG" 2>&1 &
  local pid=$!
  log_info "Backend iniciado (PID $pid). Aguardando resposta..."

  local attempts=40
  while (( attempts-- > 0 )); do
    if curl -fsS "http://127.0.0.1:${PORT}/" &>/dev/null || \
       curl -fsS "http://127.0.0.1:${PORT}/actuator/health" &>/dev/null; then
      log_ok "Backend online em http://localhost:${PORT}"
      return 0
    fi
    sleep 1
    printf "."
  done
  printf "\n"
  log_warn "Backend ainda subindo. Verifique: tail -f $BACKEND_LOG"
}

do_stop_backend() {
  log_step "Parando Backend..."
  if pkill -f "alex-platform" 2>/dev/null; then
    fuser -k "${PORT}/tcp" 2>/dev/null || true
    log_ok "Backend parado."
  else
    log_warn "Backend não estava em execução."
  fi
}

do_restart_backend() { do_stop_backend; sleep 1; do_start_backend; }

do_rebuild_backend() {
  log_step "Recompilando Backend com Maven..."
  pkill -f "alex-platform" 2>/dev/null || true
  fuser -k "${PORT}/tcp" 2>/dev/null || true
  (cd "$BACKEND_DIR" && mvn -B -DskipTests package) \
    && log_ok "Compilação concluída." \
    || { log_err "Falha na compilação."; return 1; }
  do_start_backend
}

# ══════════════════════════════════════════════════════════════════════════════
#  NGROK
# ══════════════════════════════════════════════════════════════════════════════
do_start_ngrok() {
  log_step "Iniciando túnel ngrok..."
  pkill -f "ngrok http" 2>/dev/null || true
  sleep 1

  if ! command_exists ngrok; then
    log_err "ngrok não encontrado. Instale em https://ngrok.com/download"
    return 1
  fi

  # Configura authtoken se disponível no .env
  if [[ -n "${NGROK_AUTHTOKEN:-}" ]]; then
    log_info "Configurando authtoken ngrok..."
    if ngrok config add-authtoken "$NGROK_AUTHTOKEN" &>/dev/null; then
      log_ok "Authtoken configurado com sucesso."
    else
      log_err "Falha ao configurar o authtoken ngrok."
      log_warn "Verifique o token em: https://dashboard.ngrok.com/get-started/your-authtoken"
      return 1
    fi
  else
    log_warn "NGROK_AUTHTOKEN não definido no .env — tentando com config existente."
  fi

  : > "$NGROK_LOG"
  # Usa --url (novo padrão) em vez de --domain (depreciado)
  if [[ -n "${NGROK_DOMAIN:-}" ]]; then
    nohup ngrok http "$PORT" --url="$NGROK_DOMAIN" --log=stdout >> "$NGROK_LOG" 2>&1 &
    sleep 3
    # Verifica se subiu com sucesso
    if pgrep -f "ngrok http" &>/dev/null; then
      log_ok "Túnel iniciado → https://${NGROK_DOMAIN}"
    else
      log_err "Túnel falhou ao iniciar. Verifique os logs: tail -f $NGROK_LOG"
      return 1
    fi
  else
    nohup ngrok http "$PORT" --log=stdout >> "$NGROK_LOG" 2>&1 &
    sleep 4
    local url
    url=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null \
          | grep -o '"public_url":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "—")
    if [[ "$url" != "—" && -n "$url" ]]; then
      log_ok "Túnel iniciado → $url"
    else
      log_err "Túnel falhou. Verifique: tail -f $NGROK_LOG"
      return 1
    fi
  fi
}


do_stop_ngrok() {
  log_step "Parando túnel ngrok..."
  if pkill -f "ngrok http" 2>/dev/null; then
    log_ok "Túnel encerrado."
  else
    log_warn "Túnel não estava em execução."
  fi
}

do_restart_ngrok() { do_stop_ngrok; sleep 1; do_start_ngrok; }

# ══════════════════════════════════════════════════════════════════════════════
#  OLLAMA
# ══════════════════════════════════════════════════════════════════════════════
do_start_ollama() {
  log_step "Iniciando Ollama..."
  if curl -fsS http://127.0.0.1:11434/api/tags &>/dev/null; then
    log_ok "Ollama já está rodando."
    return 0
  fi
  pkill -f "ollama serve" 2>/dev/null || true
  : > "$OLLAMA_LOG"
  nohup ollama serve >> "$OLLAMA_LOG" 2>&1 &
  local attempts=30
  until curl -fsS http://127.0.0.1:11434/api/tags &>/dev/null; do
    (( attempts-- )) || { log_warn "Ollama demorou para responder."; break; }
    sleep 1; printf "."
  done
  printf "\n"
  log_ok "Ollama online em :11434"
}

do_stop_ollama() {
  log_step "Parando Ollama..."
  if pkill -f "ollama serve" 2>/dev/null; then
    log_ok "Ollama parado."
  else
    log_warn "Ollama não estava em execução."
  fi
}

# ══════════════════════════════════════════════════════════════════════════════
#  START / STOP TUDO
# ══════════════════════════════════════════════════════════════════════════════
do_start_all() {
  do_start_ollama
  do_start_backend
  do_start_ngrok
  printf "\n"
  log_ok "══════════════════════════════════════════"
  log_ok " Todo o sistema está em execução!"
  log_ok " Local:   http://localhost:${PORT}"
  [[ -n "${NGROK_DOMAIN:-}" ]] && log_ok " Público: https://${NGROK_DOMAIN}"
  log_ok "══════════════════════════════════════════"
}

do_stop_all() {
  do_stop_ngrok
  do_stop_backend
  do_stop_ollama
  log_ok "Sistema parado completamente."
}

do_restart_all() { do_stop_all; sleep 2; do_start_all; }

# ══════════════════════════════════════════════════════════════════════════════
#  CONSOLE DE MONITORAMENTO
# ══════════════════════════════════════════════════════════════════════════════
do_monitor() {
  if command_exists tmux; then
    do_monitor_tmux
  else
    do_monitor_tail
  fi
}

do_monitor_tmux() {
  local SESSION="alex-monitor"
  tmux kill-session -t "$SESSION" 2>/dev/null || true
  sleep 0.3

  printf "\n${CYAN}${BOLD}Abrindo console tmux de monitoramento...${RESET}\n"
  printf "${DIM}Ctrl+B → D  para voltar ao menu  |  Ctrl+B → ←→  para navegar entre painéis${RESET}\n"
  sleep 1

  # Cria sessão e painéis
  tmux new-session  -d -s "$SESSION" -x "$(tput cols)" -y "$(tput lines)"
  tmux rename-window -t "$SESSION:0" "AlEx Monitor"

  # Pane 0: Backend (topo esquerdo)
  tmux send-keys -t "$SESSION:0.0" \
    "printf '\033[1m\033[0;36m════ ☕ BACKEND ════\033[0m\n'; touch '$BACKEND_LOG'; tail -n 60 -f '$BACKEND_LOG'" Enter

  # Pane 1: Ollama (topo direito)
  tmux split-window -t "$SESSION:0.0" -h
  tmux send-keys -t "$SESSION:0.1" \
    "printf '\033[1m\033[1;33m════ 🧠 OLLAMA ════\033[0m\n'; touch '$OLLAMA_LOG'; tail -n 60 -f '$OLLAMA_LOG'" Enter

  # Pane 2: ngrok (baixo esquerdo)
  tmux split-window -t "$SESSION:0.0" -v
  tmux send-keys -t "$SESSION:0.2" \
    "printf '\033[1m\033[0;35m════ 🌐 NGROK ════\033[0m\n'; touch '$NGROK_LOG'; tail -n 60 -f '$NGROK_LOG'" Enter

  # Pane 3: Status em tempo real (baixo direito)
  tmux split-window -t "$SESSION:0.1" -v
  tmux send-keys -t "$SESSION:0.3" "
while true; do
  clear
  printf '\033[1m\033[1;37m════ 📊 STATUS ════\033[0m\n'
  printf '\033[2mAtualizado: %s\033[0m\n\n' \"\$(date '+%H:%M:%S')\"

  if curl -fsS 'http://127.0.0.1:${PORT}/' &>/dev/null || curl -fsS 'http://127.0.0.1:${PORT}/actuator/health' &>/dev/null; then
    printf '  \033[1m\033[0;32m● BACKEND\033[0m  online  :${PORT}\n'
  else
    printf '  \033[1m\033[0;31m○ BACKEND\033[0m  offline\n'
  fi

  if curl -fsS 'http://127.0.0.1:11434/api/tags' &>/dev/null; then
    printf '  \033[1m\033[0;32m● OLLAMA\033[0m   online  :11434\n'
  else
    printf '  \033[1m\033[0;31m○ OLLAMA\033[0m   offline\n'
  fi

  if pgrep -f 'ngrok http' &>/dev/null; then
    printf '  \033[1m\033[0;32m● NGROK\033[0m    online\n'
  else
    printf '  \033[1m\033[0;31m○ NGROK\033[0m    offline\n'
  fi

  printf '\n\033[2m  Backend PID : %s\033[0m\n' \"\$(pgrep -f 'alex-platform' 2>/dev/null | head -1 || echo '—')\"
  printf '\033[2m  Ollama  PID : %s\033[0m\n'  \"\$(pgrep -f 'ollama serve'  2>/dev/null | head -1 || echo '—')\"
  printf '\033[2m  Ngrok   PID : %s\033[0m\n'  \"\$(pgrep -f 'ngrok http'    2>/dev/null | head -1 || echo '—')\"
  printf '\n\033[2m  Ctrl+B D = voltar ao menu\033[0m\n'
  sleep 5
done
" Enter

  # Layout tiled e barra de status
  tmux select-layout -t "$SESSION:0" tiled 2>/dev/null || true
  tmux select-pane   -t "$SESSION:0.0"
  tmux set-option    -t "$SESSION" status on
  tmux set-option    -t "$SESSION" status-style  "bg=colour234,fg=colour252"
  tmux set-option    -t "$SESSION" status-left   "  🚀 AlEx Monitor  "
  tmux set-option    -t "$SESSION" status-right  " Ctrl+B D=sair | Ctrl+B ←→=navegar  "

  tmux attach-session -t "$SESSION"
}

do_monitor_tail() {
  clear
  printf "${BOLD}${CYAN}"
  printf "╔══════════════════════════════════════════════════════════════════════════╗\n"
  printf "║        📊 Console de Monitoramento — AlEx Platform v3                   ║\n"
  printf "╠══════════════════════════════════════════════════════════════════════════╣\n"
  printf "║  ${DIM}Instale tmux para console dividido em painéis: sudo apt install tmux${BOLD}${CYAN}   ║\n"
  printf "║  ${DIM}Ctrl+C para voltar ao menu${BOLD}${CYAN}                                               ║\n"
  printf "╚══════════════════════════════════════════════════════════════════════════╝\n"
  printf "${RESET}\n"
  printf "  ${CYAN}[BACKEND]${RESET}  $BACKEND_LOG\n"
  printf "  ${YELLOW}[OLLAMA] ${RESET}  $OLLAMA_LOG\n"
  printf "  ${MAGENTA}[NGROK]  ${RESET}  $NGROK_LOG\n"
  printf "\n${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n\n"

  touch "$BACKEND_LOG" "$OLLAMA_LOG" "$NGROK_LOG"

  # Todos os logs intercalados com awk colorindo por fonte
  tail -n 30 -f \
    "$BACKEND_LOG" \
    "$OLLAMA_LOG"  \
    "$NGROK_LOG"   \
  2>/dev/null | awk \
    -v BFILE="$BACKEND_LOG" -v OFILE="$OLLAMA_LOG" -v NFILE="$NGROK_LOG" \
    -v R="\033[0m" -v BOLD="\033[1m" -v DIM="\033[2m" \
    -v CYAN="\033[0;36m" -v YELLOW="\033[1;33m" -v MAGENTA="\033[0;35m" \
    -v GREEN="\033[0;32m" -v RED="\033[0;31m" '
  /^==> / {
    f = $2
    if      (f ~ /backend/) tag = CYAN    BOLD "[BACKEND] " R
    else if (f ~ /ollama/)  tag = YELLOW  BOLD "[OLLAMA]  " R
    else                    tag = MAGENTA BOLD "[NGROK]   " R
    next
  }
  {
    ts  = strftime("%H:%M:%S")
    lc  = R
    if      ($0 ~ /[Ee][Rr][Rr][Oo][Rr]|[Ee]xception|FATAL|[Ff]ailed/) lc = RED  BOLD
    else if ($0 ~ /[Ww][Aa][Rr][Nn]/)                                    lc = YELLOW
    else if ($0 ~ /[Ii][Nn][Ff][Oo]|[Ss]tarted|online/)                  lc = GREEN
    else if ($0 ~ /[Dd][Ee][Bb][Uu][Gg]|TRACE/)                          lc = DIM
    printf DIM "%s" R " %s" lc "%s" R "\n", ts, tag, $0
  }
'
}

do_logs_backend() {
  clear
  printf "${CYAN}${BOLD}════ ☕ Backend Logs ════${RESET}  ${DIM}Ctrl+C para sair${RESET}\n\n"
  touch "$BACKEND_LOG"; tail -n 100 -f "$BACKEND_LOG"
}

do_logs_ollama() {
  clear
  printf "${YELLOW}${BOLD}════ 🧠 Ollama Logs ════${RESET}  ${DIM}Ctrl+C para sair${RESET}\n\n"
  touch "$OLLAMA_LOG"; tail -n 100 -f "$OLLAMA_LOG"
}

do_logs_ngrok() {
  clear
  printf "${MAGENTA}${BOLD}════ 🌐 Túnel ngrok Logs ════${RESET}  ${DIM}Ctrl+C para sair${RESET}\n\n"
  touch "$NGROK_LOG"; tail -n 100 -f "$NGROK_LOG"
}

# ══════════════════════════════════════════════════════════════════════════════
#  MODO CLI (argumentos diretos)
# ══════════════════════════════════════════════════════════════════════════════
if [[ $# -gt 0 ]]; then
  case "$1" in
    start)        do_start_all;;
    stop)         do_stop_all;;
    restart)      do_restart_all;;
    monitor)      do_monitor;;
    status)
      printf "\n${BOLD}Status AlEx Platform v3${RESET}\n\n"
      printf "  ☕ Backend : "; color_status "$(status_backend)"; printf "\n"
      printf "  🧠 Ollama  : "; color_status "$(status_ollama)";  printf "\n"
      printf "  🌐 Ngrok   : "; color_status "$(status_ngrok)";   printf "\n\n"
      ;;
    back:start)   do_start_backend;;
    back:stop)    do_stop_backend;;
    back:restart) do_restart_backend;;
    back:build)   do_rebuild_backend;;
    ngrok:start)  do_start_ngrok;;
    ngrok:stop)   do_stop_ngrok;;
    ngrok:restart) do_restart_ngrok;;
    ollama:start) do_start_ollama;;
    ollama:stop)  do_stop_ollama;;
    *)
      printf "${RED}Comando desconhecido: $1${RESET}\n"
      printf "Uso: ./admin.sh [start|stop|restart|status|monitor]\n"
      printf "     ./admin.sh [back:start|back:stop|back:restart|back:build]\n"
      printf "     ./admin.sh [ngrok:start|ngrok:stop|ngrok:restart]\n"
      printf "     ./admin.sh [ollama:start|ollama:stop]\n"
      exit 1
      ;;
  esac
  exit 0
fi

# ══════════════════════════════════════════════════════════════════════════════
#  LOOP DO MENU INTERATIVO
# ══════════════════════════════════════════════════════════════════════════════
while true; do
  draw_header
  draw_menu
  read -r choice

  case "$choice" in
    1)  do_start_all;       press_enter;;
    2)  do_stop_all;        press_enter;;
    3)  do_restart_all;     press_enter;;
    4)  do_start_backend;   press_enter;;
    5)  do_stop_backend;    press_enter;;
    6)  do_restart_backend; press_enter;;
    7)  do_rebuild_backend; press_enter;;
    8)  do_start_ngrok;     press_enter;;
    9)  do_stop_ngrok;      press_enter;;
    10) do_restart_ngrok;   press_enter;;
    11) do_start_ollama;    press_enter;;
    12) do_stop_ollama;     press_enter;;
    13) do_monitor;;
    14) do_logs_backend;;
    15) do_logs_ollama;;
    16) do_logs_ngrok;;
    0|q|Q)
      printf "\n${DIM}Saindo. Os serviços continuam rodando em background.${RESET}\n\n"
      exit 0
      ;;
    *)
      printf "\n${RED}Opção inválida: '$choice'${RESET}\n"
      sleep 1
      ;;
  esac
done
