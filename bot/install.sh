#!/bin/bash

# ============================================
# 🤖 OrangePi 6 Plus - CONTROLE TOTAL
# Instalador Completo
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
echo "║   Telegram + Ollama + GPIO + Docker + Automação            ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================
# CONFIGURAÇÕES - EDITE AQUI SE NECESSÁRIO
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
echo -e "  📁 Diretório: $INSTALL_DIR"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificar se token foi configurado
if [[ "$TELEGRAM_TOKEN" == "SEU_TOKEN_AQUI" ]]; then
    echo -e "${RED}❌ ERRO: Configure o TELEGRAM_TOKEN antes de executar!${NC}"
    echo ""
    echo "Execute assim:"
    echo -e "${GREEN}TELEGRAM_TOKEN=\"seu_token\" ALLOWED_USERS=\"seu_id\" bash install.sh${NC}"
    echo ""
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
# 2. DEPENDÊNCIAS
# ============================================

echo -e "${BLUE}[2/8]${NC} Instalando dependências..."

sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release \
    htop \
    net-tools \
    wireless-tools \
    network-manager \
    chromium-browser || sudo apt install -y chromium

# GPIO tools
sudo apt install -y python3-gpiod gpiod || true

echo -e "${GREEN}✅ Dependências instaladas${NC}"

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

# Adicionar ao bashrc se não existir
if ! grep -q "NVM_DIR" ~/.bashrc; then
    cat >> ~/.bashrc << 'BASHEOF'

# NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
BASHEOF
fi

echo -e "${GREEN}✅ Node.js $(node -v) instalado${NC}"

# ============================================
# 4. OLLAMA
# ============================================

echo -e "${BLUE}[4/8]${NC} Instalando Ollama..."

if ! command -v ollama &> /dev/null; then
    curl -fsSL https://ollama.com/install.sh | sh
fi

# Configurar serviço
sudo systemctl enable ollama 2>/dev/null || true
sudo systemctl start ollama 2>/dev/null || ollama serve &
sleep 5

echo -e "${GREEN}✅ Ollama instalado${NC}"

# ============================================
# 5. MODELO DE IA
# ============================================

echo -e "${BLUE}[5/8]${NC} Baixando modelo $OLLAMA_MODEL..."
echo -e "${YELLOW}⏳ Isso pode demorar vários minutos...${NC}"

ollama pull "$OLLAMA_MODEL"

echo -e "${GREEN}✅ Modelo $OLLAMA_MODEL pronto${NC}"

# ============================================
# 6. INSTALAR BOT
# ============================================

echo -e "${BLUE}[6/8]${NC} Instalando bot..."

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Baixar arquivos
curl -fsSL "$REPO_URL/index.js" -o index.js
curl -fsSL "$REPO_URL/package.json" -o package.json

# Instalar dependências
npm install --omit=dev

# Criar diretórios necessários
mkdir -p /home/backup 2>/dev/null || sudo mkdir -p /home/backup
mkdir -p /home/scripts 2>/dev/null || sudo mkdir -p /home/scripts
sudo chown $USER:$USER /home/backup /home/scripts 2>/dev/null || true

echo -e "${GREEN}✅ Bot instalado em $INSTALL_DIR${NC}"

# ============================================
# 7. CONFIGURAR SYSTEMD
# ============================================

echo -e "${BLUE}[7/8]${NC} Configurando serviço systemd..."

NODE_PATH="$(dirname "$(which node)")"

# Detectar Chromium
CHROMIUM_PATH="/usr/bin/chromium-browser"
[ -f "/usr/bin/chromium" ] && CHROMIUM_PATH="/usr/bin/chromium"

# Criar serviço
sudo tee /etc/systemd/system/orangepi-bot.service > /dev/null <<EOF
[Unit]
Description=OrangePi 6 Plus - Bot IA com Controle Total
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

# Configurar sudoers para comandos de energia sem senha
echo -e "${BLUE}[7/8]${NC} Configurando permissões sudo..."
sudo tee /etc/sudoers.d/orangepi-bot > /dev/null <<EOF
# Permitir comandos de energia sem senha para o bot
$USER ALL=(ALL) NOPASSWD: /sbin/shutdown
$USER ALL=(ALL) NOPASSWD: /sbin/reboot
$USER ALL=(ALL) NOPASSWD: /bin/systemctl
$USER ALL=(ALL) NOPASSWD: /usr/bin/docker
EOF
sudo chmod 440 /etc/sudoers.d/orangepi-bot

sudo systemctl daemon-reload
sudo systemctl enable orangepi-bot

echo -e "${GREEN}✅ Serviço configurado${NC}"

# ============================================
# 8. INICIAR BOT
# ============================================

echo -e "${BLUE}[8/8]${NC} Iniciando bot..."

sudo systemctl restart orangepi-bot
sleep 3

# Verificar status
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
echo -e "📱 ${BLUE}Bot:${NC} Fale no Telegram com seu bot"
echo -e "🧠 ${BLUE}Modelo:${NC} $OLLAMA_MODEL"
echo -e "📁 ${BLUE}Diretório:${NC} $INSTALL_DIR"
echo -e "🌐 ${BLUE}IP Local:${NC} $IP"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}FUNCIONALIDADES DISPONÍVEIS:${NC}"
echo ""
echo "  📊 Monitoramento: /status /cpu /ram /temp /disco"
echo "  💻 Terminal: /exec <comando>"
echo "  📍 GPIO: /gpio <pin> out <0|1>"
echo "  🌐 Rede: /rede /wifi /wificonnect"
echo "  ⚙️  Serviços: /servicos /servico <nome> <ação>"
echo "  🐳 Docker: /docker /dockerctl"
echo "  ⏰ Cron: /cron /addcron"
echo "  📦 Backup: /backups /backup <pasta>"
echo "  🔌 Energia: /shutdown /reboot"
echo "  🌐 Navegador: /abrir /screenshot"
echo "  💬 IA: Qualquer mensagem!"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Comandos de gerenciamento:${NC}"
echo ""
echo "  sudo systemctl status orangepi-bot   # Ver status"
echo "  sudo journalctl -u orangepi-bot -f   # Ver logs"
echo "  sudo systemctl restart orangepi-bot  # Reiniciar"
echo "  sudo systemctl stop orangepi-bot     # Parar"
echo ""
echo -e "${CYAN}🤖 Abra o Telegram e envie /start para começar!${NC}"
echo ""
