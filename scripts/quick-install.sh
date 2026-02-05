#!/bin/bash

# ============================================
# 🚀 INSTALAÇÃO RÁPIDA - AGENTE IA CLAWDBOT
# Orange Pi 5 Plus 32GB Edition
# ============================================
# 
# Execute com:
# curl -fsSL https://raw.githubusercontent.com/empadacss/agente-ia-clawdbot12/main/scripts/quick-install.sh | bash
#
# Ou baixe e execute:
# wget -O- https://raw.githubusercontent.com/empadacss/agente-ia-clawdbot12/main/scripts/quick-install.sh | bash
# ============================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Banner
clear
echo -e "${CYAN}"
cat << 'EOF'
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🤖  AGENTE DE IA LOCAL - CLAWDBOT                       ║
║       Instalação Rápida para Orange Pi 5 Plus             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# ============================================
# CONFIGURAÇÕES EDITÁVEIS
# ============================================

# 📱 TELEGRAM - Preencha com seus dados
TELEGRAM_BOT_TOKEN=""           # Token do @BotFather
TELEGRAM_CHAT_ID=""             # Seu Chat ID

# 🧠 MODELO DE IA LOCAL
OLLAMA_MODEL="llama3.1:8b"      # Opções: phi3:mini, mistral:7b, llama3.1:8b, qwen2:7b

# 🌐 REPOSITÓRIO
REPO_URL="https://github.com/empadacss/agente-ia-clawdbot12.git"
INSTALL_DIR="$HOME/agente-ia-clawdbot"

# ============================================
# FUNÇÕES
# ============================================

print_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}📦 $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ️  $1${NC}"; }

# ============================================
# COLETAR CONFIGURAÇÕES
# ============================================

collect_config() {
    print_step "Configuração Interativa"
    
    echo -e "${CYAN}Vamos configurar seu agente de IA!${NC}\n"
    
    # Telegram
    echo -e "${YELLOW}📱 CONFIGURAÇÃO DO TELEGRAM${NC}"
    echo -e "Para obter o token, fale com @BotFather no Telegram"
    echo -e "Para obter seu Chat ID, fale com @userinfobot\n"
    
    read -p "Token do Bot Telegram (deixe vazio para pular): " input_token
    if [ -n "$input_token" ]; then
        TELEGRAM_BOT_TOKEN="$input_token"
    fi
    
    read -p "Seu Chat ID do Telegram (deixe vazio para pular): " input_chat_id
    if [ -n "$input_chat_id" ]; then
        TELEGRAM_CHAT_ID="$input_chat_id"
    fi
    
    echo ""
    
    # Modelo de IA
    echo -e "${YELLOW}🧠 MODELO DE IA LOCAL${NC}"
    echo -e "Modelos disponíveis:"
    echo -e "  1) phi3:mini     - Leve e rápido (~4GB RAM)"
    echo -e "  2) mistral:7b    - Equilibrado (~8GB RAM)"
    echo -e "  3) llama3.1:8b   - Recomendado (~10GB RAM)"
    echo -e "  4) qwen2:7b      - Bom para código (~8GB RAM)"
    echo ""
    
    read -p "Escolha o modelo [1-4, padrão: 3]: " model_choice
    case $model_choice in
        1) OLLAMA_MODEL="phi3:mini" ;;
        2) OLLAMA_MODEL="mistral:7b" ;;
        4) OLLAMA_MODEL="qwen2:7b" ;;
        *) OLLAMA_MODEL="llama3.1:8b" ;;
    esac
    
    echo ""
    print_info "Modelo selecionado: $OLLAMA_MODEL"
    echo ""
    
    # Confirmar
    echo -e "${YELLOW}📋 RESUMO DA CONFIGURAÇÃO${NC}"
    echo -e "  Telegram Token: ${TELEGRAM_BOT_TOKEN:-'(não configurado)'}"
    echo -e "  Telegram Chat ID: ${TELEGRAM_CHAT_ID:-'(não configurado)'}"
    echo -e "  Modelo de IA: $OLLAMA_MODEL"
    echo -e "  Diretório: $INSTALL_DIR"
    echo ""
    
    read -p "Continuar com a instalação? (S/n): " confirm
    if [[ $confirm =~ ^[Nn]$ ]]; then
        print_info "Instalação cancelada"
        exit 0
    fi
}

# ============================================
# INSTALAÇÃO
# ============================================

install_dependencies() {
    print_step "Instalando Dependências do Sistema"
    
    sudo apt update
    sudo apt install -y curl wget git build-essential htop
    print_success "Dependências instaladas"
}

install_nodejs() {
    print_step "Instalando Node.js 22"
    
    if command -v node &> /dev/null; then
        NODE_VER=$(node --version | cut -d'.' -f1 | tr -d 'v')
        if [ "$NODE_VER" -ge 22 ]; then
            print_info "Node.js $(node --version) já instalado"
            return
        fi
    fi
    
    # Instalar NVM
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    nvm install 22
    nvm use 22
    nvm alias default 22
    
    print_success "Node.js $(node --version) instalado"
}

install_clawdbot() {
    print_step "Instalando ClawdBot"
    
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    npm install -g clawdbot@latest
    print_success "ClawdBot instalado"
}

install_ollama() {
    print_step "Instalando Ollama (IA Local)"
    
    if command -v ollama &> /dev/null; then
        print_info "Ollama já instalado"
    else
        curl -fsSL https://ollama.com/install.sh | sh
    fi
    
    # Iniciar serviço
    sudo systemctl enable ollama
    sudo systemctl start ollama
    
    sleep 3
    
    print_success "Ollama instalado e rodando"
}

download_model() {
    print_step "Baixando Modelo de IA: $OLLAMA_MODEL"
    
    print_warning "Isso pode demorar dependendo da sua conexão..."
    
    ollama pull "$OLLAMA_MODEL"
    
    print_success "Modelo $OLLAMA_MODEL baixado"
}

clone_repository() {
    print_step "Clonando Repositório"
    
    if [ -d "$INSTALL_DIR" ]; then
        print_warning "Diretório já existe, atualizando..."
        cd "$INSTALL_DIR"
        git pull
    else
        git clone "$REPO_URL" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
    
    print_success "Repositório clonado em $INSTALL_DIR"
}

configure_environment() {
    print_step "Configurando Ambiente"
    
    cd "$INSTALL_DIR"
    
    # Criar .env
    cat > .env << EOF
# ============================================
# Configuração do Agente de IA - ClawdBot
# Gerado automaticamente em $(date)
# ============================================

# MODELO DE IA
LLM_PROVIDER=ollama
LLM_MODEL=$OLLAMA_MODEL
OLLAMA_BASE_URL=http://localhost:11434

# TELEGRAM
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
TELEGRAM_ALLOWED_CHAT_ID=$TELEGRAM_CHAT_ID

# CONFIGURAÇÕES
CLAWDBOT_PORT=18789
NODE_MAX_MEMORY=4096
LOG_LEVEL=info

# SEGURANÇA
ALLOWED_IPS=127.0.0.1,192.168.0.0/16
READ_ONLY_MODE=false

# MONITORAMENTO
CPU_TEMP_ALERT_THRESHOLD=70
RAM_USAGE_ALERT_THRESHOLD=85
DISK_USAGE_ALERT_THRESHOLD=90
EOF

    # Atualizar config do ClawdBot
    if [ -f config/clawdbot.config.json ]; then
        # Usar sed para atualizar o modelo
        sed -i "s/\"model\": \".*\"/\"model\": \"$OLLAMA_MODEL\"/" config/clawdbot.config.json
    fi
    
    # Atualizar integração do Telegram se configurado
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -f config/integrations.json ]; then
        sed -i 's/"enabled": false/"enabled": true/' config/integrations.json
        sed -i "s/\"botToken\": \"\"/\"botToken\": \"$TELEGRAM_BOT_TOKEN\"/" config/integrations.json
        sed -i "s/\"allowedChatIds\": \[\]/\"allowedChatIds\": [\"$TELEGRAM_CHAT_ID\"]/" config/integrations.json
    fi
    
    print_success "Ambiente configurado"
}

setup_swap() {
    print_step "Configurando Swap"
    
    SWAP_SIZE=$(free -m | awk '/^Swap:/ {print $2}')
    
    if [ "$SWAP_SIZE" -lt 4000 ]; then
        print_info "Criando swap de 8GB..."
        sudo fallocate -l 8G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=8192
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        
        if ! grep -q "/swapfile" /etc/fstab; then
            echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
        fi
        print_success "Swap de 8GB configurado"
    else
        print_info "Swap já configurado (${SWAP_SIZE}MB)"
    fi
}

setup_services() {
    print_step "Configurando Serviços Systemd"
    
    cd "$INSTALL_DIR"
    chmod +x scripts/*.sh
    
    # Executar script de serviços de forma não-interativa
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Encontrar caminho do Node
    NODE_PATH=$(which node | xargs dirname)
    USER_NAME=$(whoami)
    
    # Criar serviço do ClawdBot
    sudo tee /etc/systemd/system/clawdbot.service > /dev/null << EOF
[Unit]
Description=ClawdBot AI Agent
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$INSTALL_DIR
Environment="HOME=$HOME"
Environment="PATH=$NODE_PATH:/usr/local/bin:/usr/bin:/bin"
Environment="NODE_OPTIONS=--max-old-space-size=4096"
ExecStart=$NODE_PATH/clawdbot gateway --port 18789
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable clawdbot
    
    print_success "Serviços configurados"
}

setup_bashrc() {
    print_step "Configurando Shell"
    
    BASHRC_CONTENT='
# ClawdBot - Agente de IA
export NODE_OPTIONS="--max-old-space-size=4096"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
'
    
    if ! grep -q "ClawdBot - Agente de IA" ~/.bashrc; then
        echo "$BASHRC_CONTENT" >> ~/.bashrc
    fi
    
    print_success "Shell configurado"
}

run_onboarding() {
    print_step "Executando Onboarding do ClawdBot"
    
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    cd "$INSTALL_DIR"
    
    print_info "Iniciando configuração do ClawdBot..."
    print_warning "Siga as instruções na tela"
    echo ""
    
    clawdbot onboard --install-daemon || true
}

start_services() {
    print_step "Iniciando Serviços"
    
    sudo systemctl start ollama
    sleep 3
    sudo systemctl start clawdbot
    
    print_success "Serviços iniciados"
}

show_final_message() {
    IP_LOCAL=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo -e "${GREEN}"
    cat << 'EOF'
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎉  INSTALAÇÃO CONCLUÍDA COM SUCESSO!                   ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    echo -e "${BOLD}📊 Resumo:${NC}"
    echo -e "  • Modelo de IA: ${GREEN}$OLLAMA_MODEL${NC}"
    echo -e "  • Diretório: ${GREEN}$INSTALL_DIR${NC}"
    echo -e "  • Porta: ${GREEN}18789${NC}"
    
    if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
        echo -e "  • Telegram: ${GREEN}Configurado${NC}"
    else
        echo -e "  • Telegram: ${YELLOW}Não configurado${NC}"
    fi
    
    echo ""
    echo -e "${BOLD}🚀 Comandos Úteis:${NC}"
    echo -e "  ${CYAN}sudo systemctl status clawdbot${NC}  - Ver status"
    echo -e "  ${CYAN}sudo systemctl restart clawdbot${NC} - Reiniciar"
    echo -e "  ${CYAN}journalctl -u clawdbot -f${NC}       - Ver logs"
    echo -e "  ${CYAN}cd $INSTALL_DIR && ./scripts/health-check.sh${NC} - Health check"
    
    echo ""
    echo -e "${BOLD}🌐 Acesso:${NC}"
    echo -e "  Dashboard: ${CYAN}http://$IP_LOCAL:18789${NC}"
    
    if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
        echo ""
        echo -e "${BOLD}📱 Telegram:${NC}"
        echo -e "  Abra o Telegram e fale com seu bot!"
    fi
    
    echo ""
    echo -e "${GREEN}Divirta-se com seu agente de IA! 🤖${NC}"
    echo ""
}

# ============================================
# EXECUÇÃO PRINCIPAL
# ============================================

main() {
    collect_config
    install_dependencies
    install_nodejs
    install_ollama
    download_model
    install_clawdbot
    clone_repository
    configure_environment
    setup_swap
    setup_bashrc
    setup_services
    run_onboarding
    start_services
    show_final_message
}

# Verificar se não é root
if [ "$EUID" -eq 0 ]; then
    print_error "Não execute como root! Use seu usuário normal."
    exit 1
fi

main
