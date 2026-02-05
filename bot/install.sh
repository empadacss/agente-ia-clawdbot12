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
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║  🤖 Instalador - OrangePi IA Bot                       ║"
echo "║     Telegram + Ollama + Controle Total                 ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================
# CONFIGURAÇÕES - EDITE AQUI!
# ============================================

TELEGRAM_TOKEN="${TELEGRAM_TOKEN:-8342604056:AAGgB6WDFzD_nciqyI-By2ux8bN2mT5Jahs}"
ALLOWED_USERS="${ALLOWED_USERS:-5075455416}"
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.1:8b}"

# ============================================
# 1. DEPENDÊNCIAS
# ============================================

echo -e "${BLUE}[1/6]${NC} Instalando dependências..."
sudo apt update
sudo apt install -y curl wget git build-essential chromium-browser

# ============================================
# 2. NODE.JS
# ============================================

echo -e "${BLUE}[2/6]${NC} Instalando Node.js 22..."

if ! command -v node &> /dev/null || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 20 ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 22
    nvm use 22
    nvm alias default 22
fi

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# ============================================
# 3. OLLAMA
# ============================================

echo -e "${BLUE}[3/6]${NC} Instalando Ollama..."

if ! command -v ollama &> /dev/null; then
    curl -fsSL https://ollama.com/install.sh | sh
fi

sudo systemctl enable ollama
sudo systemctl start ollama
sleep 3

echo -e "${BLUE}[3/6]${NC} Baixando modelo $OLLAMA_MODEL..."
ollama pull "$OLLAMA_MODEL"

echo -e "${GREEN}✅ Ollama instalado${NC}"

# ============================================
# 4. BOT
# ============================================

echo -e "${BLUE}[4/6]${NC} Configurando bot..."

INSTALL_DIR="$HOME/orangepi-ia-bot"
mkdir -p "$INSTALL_DIR"

# Copiar arquivos ou clonar
if [ -f "$(dirname "$0")/index.js" ]; then
    cp "$(dirname "$0")"/*.js "$INSTALL_DIR/"
    cp "$(dirname "$0")"/*.json "$INSTALL_DIR/"
else
    # Baixar do GitHub
    curl -fsSL "https://raw.githubusercontent.com/empadacss/agente-ia-clawdbot12/main/bot/index.js" -o "$INSTALL_DIR/index.js"
    curl -fsSL "https://raw.githubusercontent.com/empadacss/agente-ia-clawdbot12/main/bot/package.json" -o "$INSTALL_DIR/package.json"
fi

cd "$INSTALL_DIR"

# Instalar dependências
npm install

echo -e "${GREEN}✅ Bot configurado em $INSTALL_DIR${NC}"

# ============================================
# 5. SERVIÇO SYSTEMD
# ============================================

echo -e "${BLUE}[5/6]${NC} Criando serviço systemd..."

NODE_PATH="$(dirname "$(which node)")"

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
Environment="TELEGRAM_TOKEN=$TELEGRAM_TOKEN"
Environment="ALLOWED_USERS=$ALLOWED_USERS"
Environment="OLLAMA_MODEL=$OLLAMA_MODEL"
Environment="OLLAMA_URL=http://localhost:11434"
Environment="PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser"
ExecStart=$NODE_PATH/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable orangepi-bot

echo -e "${GREEN}✅ Serviço criado${NC}"

# ============================================
# 6. INICIAR
# ============================================

echo -e "${BLUE}[6/6]${NC} Iniciando bot..."

sudo systemctl start orangepi-bot
sleep 3

# ============================================
# FINALIZAÇÃO
# ============================================

IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗"
echo -e "║  🎉 INSTALAÇÃO CONCLUÍDA!                              ║"
echo -e "╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📱 ${BLUE}Bot:${NC} @orangepi32bot"
echo -e "🧠 ${BLUE}Modelo:${NC} $OLLAMA_MODEL"
echo -e "📁 ${BLUE}Diretório:${NC} $INSTALL_DIR"
echo -e "🌐 ${BLUE}IP:${NC} $IP"
echo ""
echo -e "${YELLOW}Comandos úteis:${NC}"
echo "  sudo systemctl status orangepi-bot   # Ver status"
echo "  sudo journalctl -u orangepi-bot -f   # Ver logs"
echo "  sudo systemctl restart orangepi-bot  # Reiniciar"
echo ""
echo -e "${GREEN}🤖 Abra o Telegram e fale com @orangepi32bot!${NC}"
echo ""
