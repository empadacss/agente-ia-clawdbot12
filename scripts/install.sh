#!/bin/bash
# ============================================
# CLAUDE AGENT - Instalador para Orange Pi 6 Plus
# ============================================
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'
YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[ERRO]${NC} $1"; exit 1; }

echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  CLAUDE AGENT - Orange Pi 6 Plus${NC}"
echo -e "${CYAN}  Powered by Claude API (Anthropic)${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""

# ---- Config ----
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
TELEGRAM_TOKEN="${TELEGRAM_TOKEN:-}"
ALLOWED_USERS="${ALLOWED_USERS:-}"
CLAUDE_MODEL="${CLAUDE_MODEL:-claude-sonnet-4-20250514}"
INSTALL_DIR="$HOME/claude-agent"
REPO="https://github.com/empadacss/agente-ia-clawdbot12.git"

# ---- Validacao ----
[ -z "$ANTHROPIC_API_KEY" ] && fail "ANTHROPIC_API_KEY obrigatoria!\n\nUso:\n  ANTHROPIC_API_KEY=\"sk-ant-...\" TELEGRAM_TOKEN=\"...\" ALLOWED_USERS=\"id\" bash install.sh"
[ -z "$TELEGRAM_TOKEN" ]    && fail "TELEGRAM_TOKEN obrigatorio! Crie com @BotFather"

echo -e "  API Key: ${ANTHROPIC_API_KEY:0:15}..."
echo -e "  Telegram: ${TELEGRAM_TOKEN:0:15}..."
echo -e "  Users: ${ALLOWED_USERS:-todos}"
echo -e "  Modelo: $CLAUDE_MODEL"
echo ""

# ---- 1. Sistema ----
log "Atualizando sistema..."
sudo apt update -qq
sudo apt upgrade -y -qq
ok "Sistema atualizado"

# ---- 2. Dependencias ----
log "Instalando dependencias..."
sudo apt install -y -qq curl wget git build-essential ca-certificates gnupg 2>/dev/null
ok "Dependencias base"

# ---- 3. X11 Tools ----
log "Instalando ferramentas X11..."
sudo apt install -y -qq xdotool wmctrl xclip xsel scrot imagemagick x11-utils x11-xserver-utils 2>/dev/null
ok "Ferramentas X11"

# Chromium
if ! command -v chromium-browser &>/dev/null && ! command -v chromium &>/dev/null; then
    log "Instalando Chromium..."
    sudo apt install -y chromium-browser 2>/dev/null || sudo apt install -y chromium 2>/dev/null || warn "Chromium nao encontrado"
fi
ok "Navegador"

# ---- 4. Node.js ----
log "Configurando Node.js 22..."
export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

NODE_MAJOR="$(node -v 2>/dev/null | cut -d. -f1 | tr -d 'v' || echo 0)"
if [ "$NODE_MAJOR" -lt 20 ]; then
    nvm install 22
    nvm use 22
    nvm alias default 22
fi

# Garantir NVM no bashrc
grep -q "NVM_DIR" ~/.bashrc 2>/dev/null || cat >> ~/.bashrc << 'EOF'
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
EOF

ok "Node.js $(node -v)"

# ---- 5. Repositorio ----
log "Baixando agente..."
if [ -d "$INSTALL_DIR/.git" ]; then
    cd "$INSTALL_DIR" && git pull --ff-only 2>/dev/null || true
else
    rm -rf "$INSTALL_DIR" 2>/dev/null
    git clone "$REPO" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"
ok "Repositorio"

# ---- 6. Deps Node ----
log "Instalando modulos..."
npm install --omit=dev 2>&1 | tail -3
ok "Modulos Node"

# ---- 7. Ambiente ----
log "Configurando ambiente..."

# Detectar chromium
CHROMIUM=""
command -v chromium-browser &>/dev/null && CHROMIUM="chromium-browser"
command -v chromium         &>/dev/null && CHROMIUM="chromium"
CHROMIUM_PATH="$(command -v $CHROMIUM 2>/dev/null || echo /usr/bin/chromium-browser)"

cat > .env << ENVEOF
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
CLAUDE_MODEL=$CLAUDE_MODEL
TELEGRAM_BOT_TOKEN=$TELEGRAM_TOKEN
TELEGRAM_ALLOWED_CHAT_ID=$ALLOWED_USERS
MAX_ITERATIONS=25
MAX_TOKENS=8192
DISPLAY=:0
PUPPETEER_EXECUTABLE_PATH=$CHROMIUM_PATH
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
NODE_ENV=production
ENVEOF

xhost +local: 2>/dev/null || true
ok "Ambiente"

# ---- 8. Swap ----
SWAP_MB=$(free -m | awk '/^Swap:/{print $2}')
if [ "${SWAP_MB:-0}" -lt 4000 ]; then
    log "Configurando swap 8GB..."
    sudo fallocate -l 8G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=8192 status=progress
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    grep -q "/swapfile" /etc/fstab || echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab >/dev/null
    ok "Swap 8GB"
else
    ok "Swap ja existe (${SWAP_MB}MB)"
fi

# ---- 9. Systemd ----
log "Criando servico..."
NODE_BIN="$(dirname "$(which node)")"

sudo tee /etc/systemd/system/claude-agent.service > /dev/null << SVCEOF
[Unit]
Description=Claude Agent - Orange Pi 6 Plus
After=network.target graphical.target
Wants=graphical.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
EnvironmentFile=$INSTALL_DIR/.env
Environment="HOME=$HOME"
Environment="PATH=$NODE_BIN:/usr/local/bin:/usr/bin:/bin"
Environment="XAUTHORITY=$HOME/.Xauthority"
ExecStart=$NODE_BIN/node index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

# Sudoers
sudo tee /etc/sudoers.d/claude-agent > /dev/null << EOF
$USER ALL=(ALL) NOPASSWD: /sbin/shutdown, /sbin/reboot, /bin/systemctl, /usr/bin/apt, /usr/bin/apt-get
EOF
sudo chmod 440 /etc/sudoers.d/claude-agent

sudo systemctl daemon-reload
sudo systemctl enable claude-agent
ok "Servico systemd"

# ---- 10. Iniciar ----
log "Iniciando agente..."
sudo systemctl restart claude-agent
sleep 3

if sudo systemctl is-active --quiet claude-agent; then
    ok "Agente rodando!"
else
    warn "Verifique logs: sudo journalctl -u claude-agent -n 30 --no-pager"
    sudo journalctl -u claude-agent -n 20 --no-pager
fi

# ---- Final ----
IP=$(hostname -I | awk '{print $1}')
echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${GREEN}  INSTALACAO CONCLUIDA!${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""
echo "  IP: $IP"
echo "  Modelo: $CLAUDE_MODEL"
echo "  Dir: $INSTALL_DIR"
echo ""
echo "  Gerenciamento:"
echo "    sudo systemctl status claude-agent"
echo "    sudo journalctl -u claude-agent -f"
echo "    sudo systemctl restart claude-agent"
echo ""
echo -e "${GREEN}  Abra o Telegram e converse com seu agente!${NC}"
echo ""
