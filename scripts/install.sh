#!/bin/bash

# ============================================
# Script de Instalação Automatizada
# Agente de IA ClawdBot para Orange Pi 5 Plus
# ============================================

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Sem cor

# Funções auxiliares
print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Verificar se está rodando como root
check_not_root() {
    if [ "$EUID" -eq 0 ]; then
        print_error "Não execute este script como root!"
        print_info "Execute como usuário normal: ./scripts/install.sh"
        exit 1
    fi
}

# Detectar arquitetura
detect_arch() {
    ARCH=$(uname -m)
    if [[ "$ARCH" == "aarch64" ]] || [[ "$ARCH" == "arm64" ]]; then
        print_success "Arquitetura ARM64 detectada (Orange Pi compatível)"
    elif [[ "$ARCH" == "x86_64" ]]; then
        print_warning "Arquitetura x86_64 detectada (não é Orange Pi, mas funcionará)"
    else
        print_error "Arquitetura não suportada: $ARCH"
        exit 1
    fi
}

# Detectar sistema operacional
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
        print_success "Sistema detectado: $OS $VER"
    else
        print_warning "Não foi possível detectar o sistema operacional"
    fi
}

# Atualizar sistema
update_system() {
    print_header "Atualizando Sistema"
    
    sudo apt update
    sudo apt upgrade -y
    sudo apt install -y curl wget git build-essential
    
    print_success "Sistema atualizado"
}

# Instalar NVM e Node.js
install_nodejs() {
    print_header "Instalando Node.js 22"
    
    # Verificar se NVM já está instalado
    if [ -d "$HOME/.nvm" ]; then
        print_info "NVM já está instalado"
    else
        print_info "Instalando NVM..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    fi
    
    # Carregar NVM
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Instalar Node.js 22
    print_info "Instalando Node.js 22..."
    nvm install 22
    nvm use 22
    nvm alias default 22
    
    # Verificar instalação
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    
    print_success "Node.js instalado: $NODE_VERSION"
    print_success "npm instalado: $NPM_VERSION"
}

# Instalar ClawdBot
install_clawdbot() {
    print_header "Instalando ClawdBot"
    
    # Carregar NVM
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    print_info "Instalando ClawdBot globalmente..."
    npm install -g clawdbot@latest
    
    # Verificar instalação
    if command -v clawdbot &> /dev/null; then
        CLAWDBOT_VERSION=$(clawdbot --version 2>/dev/null || echo "instalado")
        print_success "ClawdBot instalado: $CLAWDBOT_VERSION"
    else
        print_error "Falha ao instalar ClawdBot"
        exit 1
    fi
}

# Instalar Ollama
install_ollama() {
    print_header "Instalando Ollama (IA Local)"
    
    if command -v ollama &> /dev/null; then
        print_info "Ollama já está instalado"
    else
        print_info "Baixando e instalando Ollama..."
        curl -fsSL https://ollama.com/install.sh | sh
    fi
    
    # Verificar instalação
    if command -v ollama &> /dev/null; then
        print_success "Ollama instalado com sucesso"
    else
        print_error "Falha ao instalar Ollama"
        exit 1
    fi
}

# Baixar modelo de IA
download_model() {
    print_header "Baixando Modelo de IA"
    
    print_info "Iniciando Ollama em background..."
    ollama serve &> /dev/null &
    OLLAMA_PID=$!
    sleep 5
    
    print_info "Baixando modelo llama3.1:8b (isso pode demorar)..."
    ollama pull llama3.1:8b
    
    print_success "Modelo baixado com sucesso"
    
    # Parar Ollama temporariamente
    kill $OLLAMA_PID 2>/dev/null || true
}

# Configurar variáveis de ambiente
setup_env() {
    print_header "Configurando Variáveis de Ambiente"
    
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
    
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        if [ -f "$PROJECT_DIR/env.example" ]; then
            cp "$PROJECT_DIR/env.example" "$PROJECT_DIR/.env"
            print_success "Arquivo .env criado a partir do exemplo"
        else
            print_warning "Arquivo env.example não encontrado"
        fi
    else
        print_info "Arquivo .env já existe"
    fi
}

# Configurar serviços systemd
setup_services() {
    print_header "Configurando Serviços Systemd"
    
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    # Executar script de configuração de serviços
    if [ -f "$SCRIPT_DIR/setup-service.sh" ]; then
        chmod +x "$SCRIPT_DIR/setup-service.sh"
        bash "$SCRIPT_DIR/setup-service.sh"
    else
        print_warning "Script setup-service.sh não encontrado"
    fi
}

# Configurar swap
setup_swap() {
    print_header "Configurando Swap"
    
    # Verificar se já existe swap
    SWAP_TOTAL=$(free -m | awk '/^Swap:/ {print $2}')
    
    if [ "$SWAP_TOTAL" -lt 4000 ]; then
        print_info "Criando arquivo de swap de 8GB..."
        
        sudo fallocate -l 8G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=8192
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        
        # Adicionar ao fstab se não existir
        if ! grep -q "/swapfile" /etc/fstab; then
            echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
        fi
        
        print_success "Swap de 8GB configurado"
    else
        print_info "Swap já configurado: ${SWAP_TOTAL}MB"
    fi
}

# Adicionar configurações ao bashrc
setup_bashrc() {
    print_header "Configurando Ambiente Shell"
    
    # Adicionar variáveis ao bashrc
    BASHRC_ADDITIONS='
# ClawdBot - Agente de IA
export NODE_OPTIONS="--max-old-space-size=4096"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
'
    
    if ! grep -q "ClawdBot - Agente de IA" ~/.bashrc; then
        echo "$BASHRC_ADDITIONS" >> ~/.bashrc
        print_success "Configurações adicionadas ao .bashrc"
    else
        print_info "Configurações já existem no .bashrc"
    fi
}

# Mostrar resumo final
show_summary() {
    print_header "🎉 Instalação Concluída!"
    
    echo -e "${GREEN}O Agente de IA ClawdBot foi instalado com sucesso!${NC}\n"
    
    echo -e "${BLUE}Próximos passos:${NC}"
    echo -e "1. Recarregue o terminal: ${YELLOW}source ~/.bashrc${NC}"
    echo -e "2. Execute o onboarding: ${YELLOW}clawdbot onboard --install-daemon${NC}"
    echo -e "3. Inicie o dashboard: ${YELLOW}clawdbot dashboard${NC}"
    echo -e "4. Ou inicie como serviço: ${YELLOW}sudo systemctl start clawdbot${NC}"
    echo ""
    echo -e "${BLUE}Para verificar a saúde do sistema:${NC}"
    echo -e "${YELLOW}./scripts/health-check.sh${NC}"
    echo ""
    echo -e "${BLUE}Documentação:${NC}"
    echo -e "- Instalação: docs/INSTALL.md"
    echo -e "- Configuração: docs/CONFIGURATION.md"
    echo -e "- Problemas: docs/TROUBLESHOOTING.md"
    echo ""
    print_success "Divirta-se com seu agente de IA! 🤖"
}

# ============================================
# EXECUÇÃO PRINCIPAL
# ============================================

main() {
    print_header "🤖 Instalador do Agente de IA ClawdBot"
    print_info "Orange Pi 5 Plus 32GB Edition"
    echo ""
    
    check_not_root
    detect_arch
    detect_os
    
    echo ""
    read -p "Deseja continuar com a instalação? (s/N) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        print_info "Instalação cancelada"
        exit 0
    fi
    
    update_system
    install_nodejs
    install_clawdbot
    install_ollama
    download_model
    setup_env
    setup_swap
    setup_bashrc
    setup_services
    
    show_summary
}

# Executar
main "$@"
