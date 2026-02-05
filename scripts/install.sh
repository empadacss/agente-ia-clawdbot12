#!/bin/bash

# ============================================
# 🤖 CLAUDE AGENT - INSTALADOR
# Orange Pi 6 Plus
# ============================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

clear
echo -e "${MAGENTA}"
cat << 'BANNER'
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🤖 CLAUDE AGENT - Orange Pi 6 Plus                           ║
║                                                                ║
║   Agente de IA de Nível Empresarial                            ║
║   Powered by Claude API (Anthropic)                            ║
║                                                                ║
║   🧠 Claude Sonnet | 🖥️ Computer Use | 💻 Bash | 🌐 Browser    ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
BANNER
echo -e "${NC}"

# ============================================
# CONFIGURAÇÕES - OBRIGATÓRIAS
# ============================================

ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
TELEGRAM_TOKEN="${TELEGRAM_TOKEN:-}"
ALLOWED_USERS="${ALLOWED_USERS:-}"

# Opcionais
CLAUDE_MODEL="${CLAUDE_MODEL:-claude-sonnet-4-20250514}"
INSTALL_DIR="$HOME/claude-agent"
GITHUB_REPO="https://github.com/empadacss/agente-ia-clawdbot12.git"

# ============================================
# VALIDAÇÃO
# ============================================

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Configurações:${NC}"
echo -e "  🔑 Anthropic API: ${ANTHROPIC_API_KEY:0:20}..."
echo -e "  📱 Telegram: ${TELEGRAM_TOKEN:0:20}..."
echo -e "  👤 Usuários: $ALLOWED_USERS"
echo -e "  🧠 Modelo: $CLAUDE_MODEL"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [[ -z "$ANTHROPIC_API_KEY" ]]; then
    echo -e "${RED}❌ ANTHROPIC_API_KEY é obrigatória!${NC}"
    echo ""
    echo "Obtenha sua API key em: https://console.anthropic.com/"
    echo ""
    echo "Execute assim:"
    echo -e "${GREEN}ANTHROPIC_API_KEY=\"sk-ant-...\" TELEGRAM_TOKEN=\"...\" ALLOWED_USERS=\"seu_id\" bash install.sh${NC}"
    echo ""
    exit 1
fi

if [[ -z "$TELEGRAM_TOKEN" ]]; then
    echo -e "${RED}❌ TELEGRAM_TOKEN é obrigatório!${NC}"
    echo ""
    echo "Crie um bot com @BotFather no Telegram"
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
# 2. DEPENDÊNCIAS BASE
# ============================================

echo -e "${BLUE}[2/8]${NC} Instalando dependências..."

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
# 3. FERRAMENTAS DE CONTROLE (X11)
# ============================================

echo -e "${BLUE}[3/8]${NC} Instalando ferramentas de controle..."

# Ferramentas essenciais para Computer Use
sudo apt install -y \
    xdotool \
    wmctrl \
    xclip \
    xsel \
    scrot \
    imagemagick \
    x11-utils \
    x11-xserver-utils

# Navegador
sudo apt install -y chromium-browser || sudo apt install -y chromium || true

echo -e "${GREEN}✅ Ferramentas de controle instaladas${NC}"

# ============================================
# 4. NODE.JS 22
# ============================================

echo -e "${BLUE}[4/8]${NC} Instalando Node.js 22..."

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
# 5. CLONAR REPOSITÓRIO
# ============================================

echo -e "${BLUE}[5/8]${NC} Baixando agente..."

if [ -d "$INSTALL_DIR" ]; then
    cd "$INSTALL_DIR"
    git pull || true
else
    git clone "$GITHUB_REPO" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

echo -e "${GREEN}✅ Repositório clonado${NC}"

# ============================================
# 6. INSTALAR DEPENDÊNCIAS NODE
# ============================================

echo -e "${BLUE}[6/8]${NC} Instalando dependências do Node..."

npm install

echo -e "${GREEN}✅ Dependências instaladas${NC}"

# ============================================
# 7. CONFIGURAR AMBIENTE
# ============================================

echo -e "${BLUE}[7/8]${NC} Configurando ambiente..."

# Criar .env
cat > .env << EOF
# Anthropic (Claude API)
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
CLAUDE_MODEL=$CLAUDE_MODEL

# Telegram
TELEGRAM_BOT_TOKEN=$TELEGRAM_TOKEN
TELEGRAM_ALLOWED_CHAT_ID=$ALLOWED_USERS

# Agente
MAX_ITERATIONS=25
MAX_TOKENS=8192

# Display
DISPLAY=:0

# Puppeteer
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Node
NODE_ENV=production
EOF

# Configurar X11
xhost +local: 2>/dev/null || true

echo -e "${GREEN}✅ Ambiente configurado${NC}"

# ============================================
# 8. CRIAR SERVIÇO SYSTEMD
# ============================================

echo -e "${BLUE}[8/8]${NC} Criando serviço systemd..."

NODE_PATH="$(dirname "$(which node)")"
CHROMIUM_PATH="/usr/bin/chromium-browser"
[ -f "/usr/bin/chromium" ] && CHROMIUM_PATH="/usr/bin/chromium"

sudo tee /etc/systemd/system/claude-agent.service > /dev/null << EOF
[Unit]
Description=Claude Agent - Orange Pi 6 Plus
After=network.target graphical.target
Wants=graphical.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
Environment="HOME=$HOME"
Environment="PATH=$NODE_PATH:/usr/local/bin:/usr/bin:/bin"
Environment="NODE_ENV=production"
Environment="DISPLAY=:0"
Environment="XAUTHORITY=$HOME/.Xauthority"
Environment="ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY"
Environment="CLAUDE_MODEL=$CLAUDE_MODEL"
Environment="TELEGRAM_BOT_TOKEN=$TELEGRAM_TOKEN"
Environment="TELEGRAM_ALLOWED_CHAT_ID=$ALLOWED_USERS"
Environment="PUPPETEER_EXECUTABLE_PATH=$CHROMIUM_PATH"
Environment="PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true"
Environment="MAX_ITERATIONS=25"
Environment="MAX_TOKENS=8192"
ExecStart=$NODE_PATH/node index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Configurar sudoers
sudo tee /etc/sudoers.d/claude-agent > /dev/null << EOF
$USER ALL=(ALL) NOPASSWD: /sbin/shutdown
$USER ALL=(ALL) NOPASSWD: /sbin/reboot
$USER ALL=(ALL) NOPASSWD: /bin/systemctl
$USER ALL=(ALL) NOPASSWD: /usr/bin/apt
$USER ALL=(ALL) NOPASSWD: /usr/bin/apt-get
EOF
sudo chmod 440 /etc/sudoers.d/claude-agent

sudo systemctl daemon-reload
sudo systemctl enable claude-agent

echo -e "${GREEN}✅ Serviço criado${NC}"

# ============================================
# INICIAR AGENTE
# ============================================

echo -e "${BLUE}[FINAL]${NC} Iniciando agente..."

sudo systemctl restart claude-agent
sleep 3

if sudo systemctl is-active --quiet claude-agent; then
    STATUS="${GREEN}✅ RODANDO${NC}"
else
    STATUS="${YELLOW}⚠️ VERIFICAR LOGS${NC}"
    echo ""
    sudo journalctl -u claude-agent -n 30 --no-pager
fi

# ============================================
# FINALIZAÇÃO
# ============================================

IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${MAGENTA}"
cat << 'DONE'
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🎉 INSTALAÇÃO CONCLUÍDA!                                     ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
DONE
echo -e "${NC}"

echo -e "📊 Status: $STATUS"
echo -e "🌐 IP: $IP"
echo -e "🧠 Modelo: $CLAUDE_MODEL"
echo -e "📁 Diretório: $INSTALL_DIR"
echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}O QUE O AGENTE PODE FAZER:${NC}"
echo ""
echo "  🧠 INTELIGÊNCIA"
echo "      Claude Sonnet processa suas solicitações em linguagem natural"
echo "      e decide autonomamente como executar tarefas complexas"
echo ""
echo "  🖥️ COMPUTER USE"
echo "      Ver a tela, mover mouse, clicar, digitar, arrastar"
echo "      O Claude vê screenshots e decide onde clicar"
echo ""
echo "  💻 TERMINAL"
echo "      Executar qualquer comando bash"
echo "      Instalar pacotes, gerenciar arquivos, etc"
echo ""
echo "  📝 EDITOR"
echo "      Criar e editar arquivos de código"
echo "      Modificar configurações"
echo ""
echo "  🌐 BROWSER"
echo "      Navegar na internet, pesquisar"
echo "      Automatizar tarefas web"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}EXEMPLOS DE USO:${NC}"
echo ""
echo '  "Abra o navegador e pesquise sobre Orange Pi"'
echo '  "Crie um script Python que liste arquivos"'
echo '  "Instale o Docker"'
echo '  "Mostre o uso de CPU e memória"'
echo '  "Abra o terminal e execute htop"'
echo '  "Clique no menu e abra configurações"'
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Gerenciamento:${NC}"
echo ""
echo "  sudo systemctl status claude-agent"
echo "  sudo journalctl -u claude-agent -f"
echo "  sudo systemctl restart claude-agent"
echo ""
echo -e "${MAGENTA}🤖 Abra o Telegram e converse com seu agente!${NC}"
echo ""
