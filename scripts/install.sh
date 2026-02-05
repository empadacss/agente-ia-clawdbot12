#!/bin/bash

# ============================================
# 🤖 CLAWDBOT - OrangePi 6 Plus AGENT
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
cat << 'BANNER'
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🤖 CLAWDBOT - Orange Pi 6 Plus AGENT                     ║
║                                                            ║
║   🖱️  Mouse + ⌨️  Teclado + 🌐 Web + 🧠 IA Local            ║
║                                                            ║
║   Agente de IA completo e 100% funcional                   ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
BANNER
echo -e "${NC}"

# ============================================
# CONFIGURAÇÕES - EDITE AQUI
# ============================================

TELEGRAM_TOKEN="${TELEGRAM_TOKEN:-SEU_TOKEN_AQUI}"
ALLOWED_USERS="${ALLOWED_USERS:-SEU_CHAT_ID_AQUI}"
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.1:8b}"
INSTALL_DIR="$HOME/clawdbot-agent"
GITHUB_REPO="https://github.com/empadacss/agente-ia-clawdbot12.git"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Configurações:${NC}"
echo -e "  📱 Token: ${TELEGRAM_TOKEN:0:25}..."
echo -e "  👤 Chat ID: $ALLOWED_USERS"
echo -e "  🧠 Modelo: $OLLAMA_MODEL"
echo -e "  📁 Diretório: $INSTALL_DIR"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [[ "$TELEGRAM_TOKEN" == "SEU_TOKEN_AQUI" ]]; then
    echo -e "${RED}❌ Configure o TELEGRAM_TOKEN!${NC}"
    echo ""
    echo "Execute assim:"
    echo -e "${GREEN}TELEGRAM_TOKEN=\"seu_token\" ALLOWED_USERS=\"seu_id\" bash install.sh${NC}"
    echo ""
    exit 1
fi

# ============================================
# 1. ATUALIZAR SISTEMA
# ============================================

echo -e "${BLUE}[1/9]${NC} Atualizando sistema..."
sudo apt update
sudo apt upgrade -y

echo -e "${GREEN}✅ Sistema atualizado${NC}"

# ============================================
# 2. DEPENDÊNCIAS DO SISTEMA
# ============================================

echo -e "${BLUE}[2/9]${NC} Instalando dependências do sistema..."

sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release

echo -e "${GREEN}✅ Dependências base instaladas${NC}"

# ============================================
# 3. FERRAMENTAS DE CONTROLE (MOUSE/TECLADO/TELA)
# ============================================

echo -e "${BLUE}[3/9]${NC} Instalando ferramentas de controle..."

# Mouse e Teclado
sudo apt install -y \
    xdotool \
    wmctrl \
    xclip \
    xsel

# Screenshot
sudo apt install -y \
    scrot \
    imagemagick

# X11 utils
sudo apt install -y \
    x11-utils \
    x11-xserver-utils

# Navegador
sudo apt install -y chromium-browser || sudo apt install -y chromium || true

# Rede
sudo apt install -y \
    net-tools \
    wireless-tools \
    network-manager || true

# GPIO
sudo apt install -y python3-gpiod gpiod || true

echo -e "${GREEN}✅ Ferramentas de controle instaladas${NC}"

# ============================================
# 4. NODE.JS 22 VIA NVM
# ============================================

echo -e "${BLUE}[4/9]${NC} Instalando Node.js 22..."

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

# Garantir NVM no bashrc
if ! grep -q "NVM_DIR" ~/.bashrc; then
    cat >> ~/.bashrc << 'BASHEOF'

# NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
BASHEOF
fi

echo -e "${GREEN}✅ Node.js $(node -v) instalado${NC}"

# ============================================
# 5. OLLAMA
# ============================================

echo -e "${BLUE}[5/9]${NC} Instalando Ollama..."

if ! command -v ollama &> /dev/null; then
    curl -fsSL https://ollama.com/install.sh | sh
fi

sudo systemctl enable ollama 2>/dev/null || true
sudo systemctl start ollama 2>/dev/null || (ollama serve &)
sleep 5

echo -e "${GREEN}✅ Ollama instalado${NC}"

# ============================================
# 6. MODELO DE IA
# ============================================

echo -e "${BLUE}[6/9]${NC} Baixando modelo $OLLAMA_MODEL..."
echo -e "${YELLOW}⏳ Isso pode demorar vários minutos...${NC}"

ollama pull "$OLLAMA_MODEL"

echo -e "${GREEN}✅ Modelo $OLLAMA_MODEL pronto${NC}"

# ============================================
# 7. CLAWDBOT E AGENTE
# ============================================

echo -e "${BLUE}[7/9]${NC} Instalando Clawdbot e Agente..."

# Instalar Clawdbot globalmente
npm install -g clawdbot@latest

# Clonar repositório
if [ -d "$INSTALL_DIR" ]; then
    cd "$INSTALL_DIR"
    git pull || true
else
    git clone "$GITHUB_REPO" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# Instalar dependências do projeto
npm install

# Criar arquivo .env
cat > .env << EOF
# Telegram
TELEGRAM_BOT_TOKEN=$TELEGRAM_TOKEN
TELEGRAM_ALLOWED_CHAT_ID=$ALLOWED_USERS

# Ollama
LLM_PROVIDER=ollama
LLM_MODEL=$OLLAMA_MODEL
OLLAMA_BASE_URL=http://localhost:11434

# Display
DISPLAY=:0

# Configurações
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=4096
EOF

echo -e "${GREEN}✅ Agente instalado${NC}"

# ============================================
# 8. CONFIGURAR CLAWDBOT
# ============================================

echo -e "${BLUE}[8/9]${NC} Configurando Clawdbot..."

# Criar diretório de configuração
mkdir -p ~/.clawdbot

# Criar configuração do Clawdbot
cat > ~/.clawdbot/clawdbot.json << EOF
{
  "llm": {
    "provider": "ollama",
    "model": "$OLLAMA_MODEL",
    "baseUrl": "http://localhost:11434"
  },
  "channels": {
    "telegram-main": {
      "type": "telegram",
      "enabled": true,
      "token": "$TELEGRAM_TOKEN",
      "allowedChatIds": ["$ALLOWED_USERS"]
    }
  },
  "gateway": {
    "mode": "local",
    "bind": "lan",
    "port": 18789
  },
  "skills": {
    "enabled": true,
    "path": "$INSTALL_DIR/skills"
  }
}
EOF

# Configurar permissões de X11
xhost +local: 2>/dev/null || true

echo -e "${GREEN}✅ Clawdbot configurado${NC}"

# ============================================
# 9. SERVIÇO SYSTEMD
# ============================================

echo -e "${BLUE}[9/9]${NC} Criando serviço systemd..."

NODE_PATH="$(dirname "$(which node)")"
CHROMIUM_PATH="/usr/bin/chromium-browser"
[ -f "/usr/bin/chromium" ] && CHROMIUM_PATH="/usr/bin/chromium"

# Serviço principal do agente
sudo tee /etc/systemd/system/clawdbot-agent.service > /dev/null << EOF
[Unit]
Description=Clawdbot AI Agent - Orange Pi 6 Plus
After=network.target ollama.service graphical.target
Wants=ollama.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
Environment="HOME=$HOME"
Environment="PATH=$NODE_PATH:/usr/local/bin:/usr/bin:/bin"
Environment="NODE_ENV=production"
Environment="DISPLAY=:0"
Environment="XAUTHORITY=$HOME/.Xauthority"
Environment="TELEGRAM_BOT_TOKEN=$TELEGRAM_TOKEN"
Environment="TELEGRAM_ALLOWED_CHAT_ID=$ALLOWED_USERS"
Environment="LLM_PROVIDER=ollama"
Environment="LLM_MODEL=$OLLAMA_MODEL"
Environment="OLLAMA_BASE_URL=http://localhost:11434"
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
sudo tee /etc/sudoers.d/clawdbot > /dev/null << EOF
$USER ALL=(ALL) NOPASSWD: /sbin/shutdown
$USER ALL=(ALL) NOPASSWD: /sbin/reboot
$USER ALL=(ALL) NOPASSWD: /bin/systemctl
$USER ALL=(ALL) NOPASSWD: /usr/bin/docker
EOF
sudo chmod 440 /etc/sudoers.d/clawdbot

sudo systemctl daemon-reload
sudo systemctl enable clawdbot-agent

echo -e "${GREEN}✅ Serviço criado${NC}"

# ============================================
# INICIAR AGENTE
# ============================================

echo -e "${BLUE}[FINAL]${NC} Iniciando agente..."

sudo systemctl restart clawdbot-agent
sleep 3

if sudo systemctl is-active --quiet clawdbot-agent; then
    STATUS="${GREEN}✅ RODANDO${NC}"
else
    STATUS="${YELLOW}⚠️ VERIFICAR LOGS${NC}"
    sudo journalctl -u clawdbot-agent -n 20 --no-pager
fi

# ============================================
# FINALIZAÇÃO
# ============================================

IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${CYAN}"
cat << 'DONE'
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎉 INSTALAÇÃO CONCLUÍDA!                                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
DONE
echo -e "${NC}"

echo -e "📊 Status: $STATUS"
echo -e "🌐 IP: $IP"
echo -e "🧠 Modelo: $OLLAMA_MODEL"
echo -e "📁 Diretório: $INSTALL_DIR"
echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}FUNCIONALIDADES DO AGENTE:${NC}"
echo ""
echo "  🖱️  MOUSE"
echo "      Mover, clicar, duplo clique, scroll, arrastar"
echo ""
echo "  ⌨️  TECLADO"
echo "      Digitar, teclas, combos (ctrl+c), atalhos"
echo ""
echo "  🚀 APLICATIVOS"
echo "      Abrir apps, arquivos, pastas, gerenciar janelas"
echo ""
echo "  🌐 WEB"
echo "      Pesquisar Google/YouTube/Maps, navegar, screenshot"
echo ""
echo "  📊 SISTEMA"
echo "      Status, CPU, RAM, disco, temperatura, serviços"
echo ""
echo "  💬 IA"
echo "      Conversar em linguagem natural!"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Comandos de gerenciamento:${NC}"
echo ""
echo "  sudo systemctl status clawdbot-agent"
echo "  sudo journalctl -u clawdbot-agent -f"
echo "  sudo systemctl restart clawdbot-agent"
echo ""
echo -e "${CYAN}🤖 Abra o Telegram e converse com seu agente!${NC}"
echo ""
