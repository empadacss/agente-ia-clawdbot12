#!/bin/bash

# ============================================
# 🤖 CLAUDE AGENT - Orange Pi 6 Plus
# Instalador Profissional
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

   ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗
  ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝
  ██║     ██║     ███████║██║   ██║██║  ██║█████╗  
  ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝  
  ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗
   ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
                                                    
        █████╗  ██████╗ ███████╗███╗   ██╗████████╗
       ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝
       ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   
       ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   
       ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   
       ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   

BANNER
echo -e "${NC}"
echo -e "${CYAN}   Agente Autônomo de Nível Profissional${NC}"
echo -e "${CYAN}   Orange Pi 6 Plus + Claude API + Tool Use + Vision${NC}"
echo ""

# ============================================
# CONFIGURAÇÕES
# ============================================

TELEGRAM_TOKEN="${TELEGRAM_TOKEN:-}"
ALLOWED_USERS="${ALLOWED_USERS:-}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
CLAUDE_MODEL="${CLAUDE_MODEL:-claude-sonnet-4-20250514}"

INSTALL_DIR="$HOME/claude-agent"
GITHUB_REPO="https://github.com/empadacss/agente-ia-clawdbot12.git"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}CONFIGURAÇÕES:${NC}"
echo ""

# Verificar variáveis obrigatórias
if [ -z "$TELEGRAM_TOKEN" ]; then
    echo -e "${RED}❌ TELEGRAM_TOKEN não configurado!${NC}"
    echo ""
    echo "Execute assim:"
    echo -e "${GREEN}TELEGRAM_TOKEN=\"seu_token\" ANTHROPIC_API_KEY=\"sua_chave\" ALLOWED_USERS=\"seu_id\" bash install.sh${NC}"
    echo ""
    exit 1
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}❌ ANTHROPIC_API_KEY não configurado!${NC}"
    echo ""
    echo "Obtenha sua API key em: https://console.anthropic.com/"
    echo ""
    echo "Execute assim:"
    echo -e "${GREEN}TELEGRAM_TOKEN=\"seu_token\" ANTHROPIC_API_KEY=\"sua_chave\" ALLOWED_USERS=\"seu_id\" bash install.sh${NC}"
    echo ""
    exit 1
fi

echo -e "  📱 Telegram Token: ${TELEGRAM_TOKEN:0:20}..."
echo -e "  🔑 Anthropic Key: ${ANTHROPIC_API_KEY:0:15}..."
echo -e "  👤 Allowed Users: ${ALLOWED_USERS:-TODOS}"
echo -e "  🧠 Claude Model: $CLAUDE_MODEL"
echo -e "  📁 Install Dir: $INSTALL_DIR"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ============================================
# 1. ATUALIZAR SISTEMA
# ============================================

echo -e "${BLUE}[1/6]${NC} Atualizando sistema..."
sudo apt update
sudo apt upgrade -y

echo -e "${GREEN}✅ Sistema atualizado${NC}"

# ============================================
# 2. DEPENDÊNCIAS
# ============================================

echo -e "${BLUE}[2/6]${NC} Instalando dependências..."

# Base
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates

# Controle de Mouse e Teclado
echo -e "${BLUE}[2/6]${NC} Ferramentas de controle (xdotool, wmctrl, scrot)..."
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

echo -e "${GREEN}✅ Dependências instaladas${NC}"

# ============================================
# 3. NODE.JS 22
# ============================================

echo -e "${BLUE}[3/6]${NC} Instalando Node.js 22..."

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
# 4. CLONAR E INSTALAR AGENTE
# ============================================

echo -e "${BLUE}[4/6]${NC} Instalando Claude Agent..."

# Clonar repositório
if [ -d "$INSTALL_DIR" ]; then
    cd "$INSTALL_DIR"
    git pull || true
else
    git clone "$GITHUB_REPO" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# Instalar dependências
npm install

# Criar diretório de dados
mkdir -p data

# Criar arquivo .env
cat > .env << EOF
# Telegram
TELEGRAM_BOT_TOKEN=$TELEGRAM_TOKEN
ALLOWED_USERS=$ALLOWED_USERS

# Claude API
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
CLAUDE_MODEL=$CLAUDE_MODEL
MAX_TOKENS=8192
MAX_ITERATIONS=20

# Display
DISPLAY=:0
EOF

echo -e "${GREEN}✅ Agente instalado${NC}"

# ============================================
# 5. SERVIÇO SYSTEMD
# ============================================

echo -e "${BLUE}[5/6]${NC} Criando serviço systemd..."

NODE_PATH="$(dirname "$(which node)")"

sudo tee /etc/systemd/system/claude-agent.service > /dev/null << EOF
[Unit]
Description=Claude Agent - Orange Pi 6 Plus
After=network.target graphical.target
Wants=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
Environment="HOME=$HOME"
Environment="PATH=$NODE_PATH:/usr/local/bin:/usr/bin:/bin"
Environment="NODE_ENV=production"
Environment="DISPLAY=:0"
Environment="XAUTHORITY=$HOME/.Xauthority"
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=$NODE_PATH/node index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Permitir acesso ao X
xhost +local: 2>/dev/null || true

sudo systemctl daemon-reload
sudo systemctl enable claude-agent

echo -e "${GREEN}✅ Serviço criado${NC}"

# ============================================
# 6. INICIAR AGENTE
# ============================================

echo -e "${BLUE}[6/6]${NC} Iniciando Claude Agent..."

sudo systemctl restart claude-agent
sleep 3

if sudo systemctl is-active --quiet claude-agent; then
    STATUS="${GREEN}✅ RODANDO${NC}"
else
    STATUS="${RED}❌ ERRO${NC}"
    sudo journalctl -u claude-agent -n 30 --no-pager
fi

# ============================================
# FINALIZAÇÃO
# ============================================

IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${MAGENTA}"
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
echo -e "🧠 Modelo: $CLAUDE_MODEL"
echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}CAPACIDADES DO AGENTE:${NC}"
echo ""
echo "  🖱️  MOUSE - Mover, clicar, scroll, arrastar"
echo "  ⌨️  TECLADO - Digitar, teclas, combos (Ctrl+C, Alt+Tab)"
echo "  🚀 APPS - Abrir programas, gerenciar janelas"
echo "  🌐 WEB - Navegar, pesquisar, interagir"
echo "  📸 VISÃO - Ver e analisar screenshots"
echo "  🧠 IA - Raciocínio e planejamento avançado"
echo "  🔄 AUTONOMIA - Executar tarefas complexas automaticamente"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}EXEMPLOS DE USO:${NC}"
echo ""
echo "  • \"Abra o navegador e pesquise sobre Python\""
echo "  • \"Tire um screenshot\""
echo "  • \"Abra o terminal e execute htop\""
echo "  • \"Qual o status do sistema?\""
echo "  • \"Minimize todas as janelas\""
echo "  • \"Abra o YouTube e pesquise música relaxante\""
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Gerenciamento:${NC}"
echo ""
echo "  sudo systemctl status claude-agent"
echo "  sudo journalctl -u claude-agent -f"
echo "  sudo systemctl restart claude-agent"
echo ""
echo -e "${MAGENTA}🤖 Abra o Telegram e converse com seu agente!${NC}"
echo ""
