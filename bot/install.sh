#!/bin/bash

# ============================================
# 🤖 OrangePi 6 Plus - CONTROLE TOTAL
# 🖱️ Mouse + ⌨️ Teclado + 🧠 IA
# ============================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   🤖 OrangePi 6 Plus - CONTROLE TOTAL                      ║"
echo "║                                                            ║"
echo "║   🖱️  Mouse + ⌨️  Teclado + 🧠 IA Local                     ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================
# CONFIGURAÇÕES
# ============================================

TELEGRAM_TOKEN="${TELEGRAM_TOKEN:-SEU_TOKEN_AQUI}"
ALLOWED_USERS="${ALLOWED_USERS:-SEU_CHAT_ID_AQUI}"
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.1:8b}"
INSTALL_DIR="$HOME/orangepi-bot"
REPO_URL="https://raw.githubusercontent.com/empadacss/agente-ia-clawdbot12/main/bot"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Configurações:${NC}"
echo -e "  📱 Token: ${TELEGRAM_TOKEN:0:20}..."
echo -e "  👤 Usuários: $ALLOWED_USERS"
echo -e "  🧠 Modelo: $OLLAMA_MODEL"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [[ "$TELEGRAM_TOKEN" == "SEU_TOKEN_AQUI" ]]; then
    echo -e "${RED}❌ Configure o TELEGRAM_TOKEN!${NC}"
    echo ""
    echo "Execute:"
    echo -e "${GREEN}TELEGRAM_TOKEN=\"seu_token\" ALLOWED_USERS=\"seu_id\" bash install.sh${NC}"
    exit 1
fi

# ============================================
# 1. ATUALIZAR SISTEMA
# ============================================

echo -e "${BLUE}[1/8]${NC} Atualizando sistema..."
sudo apt update
sudo apt upgrade -y

echo -e "${GREEN}✅ Sistema atualizado${NC}"

# ============================================
# 2. DEPENDÊNCIAS - MOUSE E TECLADO
# ============================================

echo -e "${BLUE}[2/8]${NC} Instalando ferramentas de controle..."

# Ferramentas essenciais
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates

# 🖱️ MOUSE E TECLADO - Ferramentas principais
echo -e "${BLUE}[2/8]${NC} Instalando xdotool, scrot, wmctrl..."
sudo apt install -y \
    xdotool \
    scrot \
    wmctrl \
    xclip \
    xsel \
    imagemagick \
    x11-utils \
    x11-xserver-utils

# Navegador para automação web
echo -e "${BLUE}[2/8]${NC} Instalando Chromium..."
sudo apt install -y chromium-browser || sudo apt install -y chromium || true

# Ferramentas de rede
sudo apt install -y \
    net-tools \
    wireless-tools \
    network-manager || true

# GPIO tools
sudo apt install -y python3-gpiod gpiod || true

echo -e "${GREEN}✅ Ferramentas de controle instaladas${NC}"

# ============================================
# 3. NODE.JS 22
# ============================================

echo -e "${BLUE}[3/8]${NC} Instalando Node.js 22..."

export NVM_DIR="$HOME/.nvm"

if [ ! -d "$NVM_DIR" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

if ! command -v node &> /dev/null || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 20 ]; then
    nvm install 22
    nvm use 22
    nvm alias default 22
fi

# Adicionar ao bashrc
if ! grep -q "NVM_DIR" ~/.bashrc; then
    cat >> ~/.bashrc << 'BASHEOF'

# NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
BASHEOF
fi

echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# ============================================
# 4. OLLAMA
# ============================================

echo -e "${BLUE}[4/8]${NC} Instalando Ollama..."

if ! command -v ollama &> /dev/null; then
    curl -fsSL https://ollama.com/install.sh | sh
fi

sudo systemctl enable ollama 2>/dev/null || true
sudo systemctl start ollama 2>/dev/null || ollama serve &
sleep 5

echo -e "${GREEN}✅ Ollama instalado${NC}"

# ============================================
# 5. MODELO DE IA
# ============================================

echo -e "${BLUE}[5/8]${NC} Baixando modelo $OLLAMA_MODEL..."
echo -e "${YELLOW}⏳ Isso pode demorar...${NC}"

ollama pull "$OLLAMA_MODEL"

echo -e "${GREEN}✅ Modelo pronto${NC}"

# ============================================
# 6. INSTALAR BOT
# ============================================

echo -e "${BLUE}[6/8]${NC} Instalando bot..."

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

curl -fsSL "$REPO_URL/index.js" -o index.js
curl -fsSL "$REPO_URL/package.json" -o package.json

npm install --omit=dev

mkdir -p /home/backup 2>/dev/null || sudo mkdir -p /home/backup
sudo chown $USER:$USER /home/backup 2>/dev/null || true

echo -e "${GREEN}✅ Bot instalado${NC}"

# ============================================
# 7. CONFIGURAR DISPLAY E PERMISSÕES
# ============================================

echo -e "${BLUE}[7/8]${NC} Configurando permissões..."

# Detectar Chromium
CHROMIUM_PATH="/usr/bin/chromium-browser"
[ -f "/usr/bin/chromium" ] && CHROMIUM_PATH="/usr/bin/chromium"

NODE_PATH="$(dirname "$(which node)")"

# Detectar DISPLAY automaticamente
DISPLAY_VAR="${DISPLAY:-:0}"

# Criar serviço systemd
sudo tee /etc/systemd/system/orangepi-bot.service > /dev/null <<EOF
[Unit]
Description=OrangePi 6 Plus - Bot com Mouse e Teclado
After=network.target ollama.service graphical.target
Wants=ollama.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
Environment="HOME=$HOME"
Environment="PATH=$NODE_PATH:/usr/local/bin:/usr/bin:/bin"
Environment="NODE_ENV=production"
Environment="DISPLAY=$DISPLAY_VAR"
Environment="XAUTHORITY=$HOME/.Xauthority"
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

# Configurar sudoers
sudo tee /etc/sudoers.d/orangepi-bot > /dev/null <<EOF
$USER ALL=(ALL) NOPASSWD: /sbin/shutdown
$USER ALL=(ALL) NOPASSWD: /sbin/reboot
$USER ALL=(ALL) NOPASSWD: /bin/systemctl
$USER ALL=(ALL) NOPASSWD: /usr/bin/docker
EOF
sudo chmod 440 /etc/sudoers.d/orangepi-bot

# Permitir acesso ao X server para o usuário
xhost +local: 2>/dev/null || true

sudo systemctl daemon-reload
sudo systemctl enable orangepi-bot

echo -e "${GREEN}✅ Permissões configuradas${NC}"

# ============================================
# 8. INICIAR BOT
# ============================================

echo -e "${BLUE}[8/8]${NC} Iniciando bot..."

sudo systemctl restart orangepi-bot
sleep 3

if sudo systemctl is-active --quiet orangepi-bot; then
    echo -e "${GREEN}✅ Bot rodando!${NC}"
else
    echo -e "${YELLOW}⚠️ Verificando logs...${NC}"
    sudo journalctl -u orangepi-bot -n 30 --no-pager
fi

# ============================================
# FINALIZAÇÃO
# ============================================

IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗"
echo -e "║                                                            ║"
echo -e "║   🎉 INSTALAÇÃO CONCLUÍDA!                                 ║"
echo -e "║                                                            ║"
echo -e "╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "🌐 ${BLUE}IP:${NC} $IP"
echo -e "🧠 ${BLUE}Modelo:${NC} $OLLAMA_MODEL"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🖱️ COMANDOS DE MOUSE:${NC}"
echo ""
echo "  /mouse X Y     - Mover mouse"
echo "  /click         - Clique esquerdo"
echo "  /click r       - Clique direito"
echo "  /dclick        - Duplo clique"
echo "  /scroll up     - Rolar para cima"
echo "  /scroll down   - Rolar para baixo"
echo "  /arrastar X1 Y1 X2 Y2"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⌨️ COMANDOS DE TECLADO:${NC}"
echo ""
echo "  /digitar texto - Digitar texto"
echo "  /tecla enter   - Pressionar tecla"
echo "  /tecla ctrl+c  - Combo de teclas"
echo "  /atalho copiar - Atalho pré-definido"
echo "  /atalhos       - Ver todos atalhos"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📸 TELA E JANELAS:${NC}"
echo ""
echo "  /tela          - Screenshot"
echo "  /janelas       - Listar janelas"
echo "  /focar nome    - Focar janela"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Gerenciamento:${NC}"
echo "  sudo systemctl status orangepi-bot"
echo "  sudo journalctl -u orangepi-bot -f"
echo "  sudo systemctl restart orangepi-bot"
echo ""
echo -e "${CYAN}🤖 Envie /start no Telegram para começar!${NC}"
echo ""
