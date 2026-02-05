#!/bin/bash

# ============================================
# 🤖 INSTALADOR - OrangePi IA Bot
# Simples, direto e funcional!
# ============================================

set -e

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║  🤖 Instalador - OrangePi IA Bot                       ║"
echo "║     Telegram + Ollama + Controle Total                 ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================
# CONFIGURAÇÕES
# ============================================

TELEGRAM_TOKEN="${TELEGRAM_TOKEN:-8342604056:AAGgB6WDFzD_nciqyI-By2ux8bN2mT5Jahs}"
ALLOWED_USERS="${ALLOWED_USERS:-5075455416}"
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.1:8b}"
INSTALL_DIR="$HOME/orangepi-ia-bot"
REPO_URL="https://raw.githubusercontent.com/empadacss/agente-ia-clawdbot12/main/bot"

echo -e "${YELLOW}Configurações:${NC}"
echo -e "  📱 Telegram Token: ${TELEGRAM_TOKEN:0:20}..."
echo -e "  👤 Usuários: $ALLOWED_USERS"
echo -e "  🧠 Modelo: $OLLAMA_MODEL"
echo ""

# ============================================
# 1. DEPENDÊNCIAS
# ============================================

echo -e "${BLUE}[1/7]${NC} Atualizando sistema e instalando dependências..."
sudo apt update
sudo apt install -y curl wget git build-essential ca-certificates

# Chromium para ARM (Orange Pi)
if ! command -v chromium-browser &> /dev/null && ! command -v chromium &> /dev/null; then
    echo -e "${BLUE}[1/7]${NC} Instalando Chromium..."
    sudo apt install -y chromium-browser || sudo apt install -y chromium
fi

echo -e "${GREEN}✅ Dependências instaladas${NC}"

# ============================================
# 2. NODE.JS 22
# ============================================

echo -e "${BLUE}[2/7]${NC} Verificando Node.js..."

export NVM_DIR="$HOME/.nvm"

if [ ! -d "$NVM_DIR" ]; then
    echo -e "${BLUE}[2/7]${NC} Instalando NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

if ! command -v node &> /dev/null || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 20 ]; then
    echo -e "${BLUE}[2/7]${NC} Instalando Node.js 22..."
    nvm install 22
    nvm use 22
    nvm alias default 22
fi

echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# ============================================
# 3. OLLAMA
# ============================================

echo -e "${BLUE}[3/7]${NC} Verificando Ollama..."

if ! command -v ollama &> /dev/null; then
    echo -e "${BLUE}[3/7]${NC} Instalando Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
fi

sudo systemctl enable ollama 2>/dev/null || true
sudo systemctl start ollama 2>/dev/null || ollama serve &
sleep 5

echo -e "${GREEN}✅ Ollama instalado${NC}"

# ============================================
# 4. MODELO DE IA
# ============================================

echo -e "${BLUE}[4/7]${NC} Baixando modelo $OLLAMA_MODEL (pode demorar)..."
ollama pull "$OLLAMA_MODEL"

echo -e "${GREEN}✅ Modelo $OLLAMA_MODEL pronto${NC}"

# ============================================
# 5. BAIXAR BOT
# ============================================

echo -e "${BLUE}[5/7]${NC} Baixando bot..."

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Baixar arquivos do GitHub
curl -fsSL "$REPO_URL/index.js" -o index.js
curl -fsSL "$REPO_URL/package.json" -o package.json

# Instalar dependências do Node
echo -e "${BLUE}[5/7]${NC} Instalando dependências npm..."
npm install --omit=dev

echo -e "${GREEN}✅ Bot instalado em $INSTALL_DIR${NC}"

# ============================================
# 6. SERVIÇO SYSTEMD
# ============================================

echo -e "${BLUE}[6/7]${NC} Criando serviço systemd..."

NODE_PATH="$(dirname "$(which node)")"

# Detectar Chromium
CHROMIUM_PATH="/usr/bin/chromium-browser"
[ -f "/usr/bin/chromium" ] && CHROMIUM_PATH="/usr/bin/chromium"

sudo tee /etc/systemd/system/orangepi-bot.service > /dev/null <<EOF
[Unit]
Description=OrangePi IA Telegram Bot
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
Environment="HOME=$HOME"
Environment="PATH=$NODE_PATH:/usr/local/bin:/usr/bin:/bin"
Environment="NODE_ENV=production"
Environment="TELEGRAM_TOKEN=$TELEGRAM_TOKEN"
Environment="ALLOWED_USERS=$ALLOWED_USERS"
Environment="OLLAMA_MODEL=$OLLAMA_MODEL"
Environment="OLLAMA_URL=http://localhost:11434"
Environment="PUPPETEER_EXECUTABLE_PATH=$CHROMIUM_PATH"
Environment="PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true"
ExecStart=$NODE_PATH/node index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable orangepi-bot

echo -e "${GREEN}✅ Serviço criado${NC}"

# ============================================
# 7. INICIAR BOT
# ============================================

echo -e "${BLUE}[7/7]${NC} Iniciando bot..."

sudo systemctl restart orangepi-bot
sleep 3

# Verificar se iniciou
if sudo systemctl is-active --quiet orangepi-bot; then
    echo -e "${GREEN}✅ Bot rodando!${NC}"
else
    echo -e "${RED}⚠️ Bot pode não ter iniciado. Verificando logs...${NC}"
    sudo journalctl -u orangepi-bot -n 20 --no-pager
fi

# ============================================
# FINALIZAÇÃO
# ============================================

IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗"
echo -e "║  🎉 INSTALAÇÃO CONCLUÍDA!                              ║"
echo -e "╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📱 ${BLUE}Bot Telegram:${NC} @orangepi32bot"
echo -e "🧠 ${BLUE}Modelo IA:${NC} $OLLAMA_MODEL"
echo -e "📁 ${BLUE}Diretório:${NC} $INSTALL_DIR"
echo -e "🌐 ${BLUE}IP Local:${NC} $IP"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Comandos úteis:${NC}"
echo ""
echo "  sudo systemctl status orangepi-bot   # Ver status"
echo "  sudo journalctl -u orangepi-bot -f   # Ver logs"
echo "  sudo systemctl restart orangepi-bot  # Reiniciar"
echo "  sudo systemctl stop orangepi-bot     # Parar"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}🤖 Abra o Telegram e fale com @orangepi32bot!${NC}"
echo ""
echo -e "Comandos do bot:"
echo "  /start    - Ver ajuda"
echo "  /status   - Status do sistema"
echo "  /exec ls  - Executar comando"
echo "  Ou envie qualquer pergunta para a IA!"
echo ""
