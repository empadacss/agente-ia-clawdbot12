#!/bin/bash

# ============================================
# 🧠 CLAUDE AGENT - Script de Instalação
# ============================================
# Agente de IA de Próximo Nível
# Orange Pi 6 Plus 32GB
# ============================================

set -e

# ============================================
# CORES
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

print_banner() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                                ║${NC}"
    echo -e "${CYAN}║   ${PURPLE}🧠 CLAUDE AGENT${CYAN} - Orange Pi 6 Plus                           ║${NC}"
    echo -e "${CYAN}║                                                                ║${NC}"
    echo -e "${CYAN}║   Agente de IA de Próximo Nível                                ║${NC}"
    echo -e "${CYAN}║   Usando Claude API com Tool Use (Function Calling)            ║${NC}"
    echo -e "${CYAN}║                                                                ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}▶ $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_banner

# ============================================
# VERIFICAR VARIÁVEIS
# ============================================

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}❌ ERRO: ANTHROPIC_API_KEY não configurada!${NC}"
    echo ""
    echo "Configure sua API key do Claude Anthropic:"
    echo ""
    echo "  export ANTHROPIC_API_KEY=\"sk-ant-api03-...\""
    echo ""
    echo "Obtenha sua API key em: https://console.anthropic.com/"
    echo ""
    exit 1
fi

if [ -z "$TELEGRAM_TOKEN" ]; then
    echo -e "${RED}❌ ERRO: TELEGRAM_TOKEN não configurado!${NC}"
    echo ""
    echo "Configure seu token do Telegram:"
    echo ""
    echo "  export TELEGRAM_TOKEN=\"123456789:ABC...\""
    echo ""
    echo "Obtenha seu token falando com @BotFather no Telegram"
    echo ""
    exit 1
fi

# Valores padrão
ALLOWED_USERS="${ALLOWED_USERS:-}"
CLAUDE_MODEL="${CLAUDE_MODEL:-claude-sonnet-4-20250514}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/claude-agent}"

echo -e "${GREEN}📋 Configuração:${NC}"
echo -e "   API Key: ${CYAN}${ANTHROPIC_API_KEY:0:15}...${NC}"
echo -e "   Telegram: ${CYAN}${TELEGRAM_TOKEN:0:12}...${NC}"
echo -e "   Modelo: ${CYAN}$CLAUDE_MODEL${NC}"
echo -e "   Usuários: ${CYAN}${ALLOWED_USERS:-TODOS}${NC}"
echo -e "   Diretório: ${CYAN}$INSTALL_DIR${NC}"
echo ""

# ============================================
# 1. ATUALIZAR SISTEMA
# ============================================

print_step "1/8 Atualizando sistema..."

sudo apt update
sudo apt upgrade -y

# ============================================
# 2. INSTALAR DEPENDÊNCIAS
# ============================================

print_step "2/8 Instalando dependências..."

sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    xdotool \
    scrot \
    wmctrl \
    xclip \
    xsel \
    imagemagick \
    x11-utils \
    x11-xserver-utils \
    network-manager \
    gpiod \
    chromium-browser || sudo apt install -y chromium

echo -e "${GREEN}✅ Dependências instaladas${NC}"

# ============================================
# 3. INSTALAR NODE.JS 22
# ============================================

print_step "3/8 Instalando Node.js 22..."

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm install 22
nvm use 22
nvm alias default 22

NODE_VERSION=$(node --version)
NODE_BIN=$(dirname "$(which node)")

echo -e "${GREEN}✅ Node.js instalado: $NODE_VERSION${NC}"
echo -e "${GREEN}   Path: $NODE_BIN${NC}"

# ============================================
# 4. CONFIGURAR SWAP (8GB)
# ============================================

print_step "4/8 Configurando swap..."

if [ "$(free -m | awk '/^Swap:/{print $2}')" -lt 4000 ]; then
    sudo fallocate -l 8G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=8192
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    grep -q "/swapfile" /etc/fstab || echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
    echo -e "${GREEN}✅ Swap de 8GB configurado${NC}"
else
    echo -e "${GREEN}✅ Swap já existe${NC}"
fi

# ============================================
# 5. CLONAR REPOSITÓRIO
# ============================================

print_step "5/8 Clonando repositório..."

if [ -d "$INSTALL_DIR" ]; then
    cd "$INSTALL_DIR"
    git pull origin main || true
else
    git clone https://github.com/empadacss/agente-ia-clawdbot12.git "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

echo -e "${GREEN}✅ Repositório clonado em $INSTALL_DIR${NC}"

# ============================================
# 6. INSTALAR DEPENDÊNCIAS NPM
# ============================================

print_step "6/8 Instalando dependências NPM..."

npm install

echo -e "${GREEN}✅ Dependências NPM instaladas${NC}"

# ============================================
# 7. CRIAR ARQUIVO .ENV
# ============================================

print_step "7/8 Configurando ambiente..."

cat > "$INSTALL_DIR/.env" << EOF
# ============================================
# CLAUDE AGENT - Configuração
# ============================================

# Claude API (Anthropic)
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
CLAUDE_MODEL=$CLAUDE_MODEL

# Telegram
TELEGRAM_BOT_TOKEN=$TELEGRAM_TOKEN
TELEGRAM_ALLOWED_CHAT_ID=$ALLOWED_USERS

# Sistema
NODE_OPTIONS=--max-old-space-size=4096
EOF

# Configurar xhost para GUI
echo "xhost +local: 2>/dev/null || true" >> ~/.bashrc
xhost +local: 2>/dev/null || true

echo -e "${GREEN}✅ Arquivo .env criado${NC}"

# ============================================
# 8. CRIAR SERVIÇO SYSTEMD
# ============================================

print_step "8/8 Criando serviço systemd..."

sudo tee /etc/systemd/system/claude-agent.service > /dev/null << EOF
[Unit]
Description=Claude Agent - Orange Pi 6 Plus
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
Environment=HOME=$HOME
Environment=PATH=$NODE_BIN:/usr/local/bin:/usr/bin:/bin
Environment=DISPLAY=:0
Environment=NODE_OPTIONS=--max-old-space-size=4096
ExecStart=$NODE_BIN/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Configurar sudoers para comandos de sistema
echo "$USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl, /sbin/reboot, /sbin/poweroff, /sbin/shutdown" | sudo tee /etc/sudoers.d/claude-agent

sudo systemctl daemon-reload
sudo systemctl enable claude-agent
sudo systemctl start claude-agent

echo -e "${GREEN}✅ Serviço systemd criado e iniciado${NC}"

# ============================================
# FINALIZAÇÃO
# ============================================

IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                                ║${NC}"
echo -e "${CYAN}║   ${GREEN}✅ INSTALAÇÃO CONCLUÍDA!${CYAN}                                    ║${NC}"
echo -e "${CYAN}║                                                                ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📊 Informações:${NC}"
echo -e "   🧠 Modelo: ${CYAN}$CLAUDE_MODEL${NC}"
echo -e "   📁 Diretório: ${CYAN}$INSTALL_DIR${NC}"
echo -e "   🌐 IP: ${CYAN}$IP${NC}"
echo ""
echo -e "${GREEN}📱 Como usar:${NC}"
echo -e "   1. Abra o Telegram"
echo -e "   2. Converse com seu bot"
echo -e "   3. Dê comandos naturais como:"
echo -e "      ${CYAN}• \"Mova o mouse para 500, 300\"${NC}"
echo -e "      ${CYAN}• \"Abra o navegador e pesquise o clima\"${NC}"
echo -e "      ${CYAN}• \"Tire um print da tela\"${NC}"
echo -e "      ${CYAN}• \"Qual o status do sistema?\"${NC}"
echo ""
echo -e "${GREEN}🔧 Comandos úteis:${NC}"
echo -e "   ${YELLOW}sudo systemctl status claude-agent${NC}  # Ver status"
echo -e "   ${YELLOW}sudo journalctl -u claude-agent -f${NC}  # Ver logs"
echo -e "   ${YELLOW}sudo systemctl restart claude-agent${NC} # Reiniciar"
echo ""
echo -e "${PURPLE}🤖 O agente está pronto! Converse no Telegram.${NC}"
echo ""
