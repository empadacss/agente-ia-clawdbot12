#!/bin/bash

# ============================================
# Script de Configuração de Serviços Systemd
# ClawdBot + Ollama para Orange Pi 5 Plus
# ============================================

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Variáveis
USER_NAME=$(whoami)
USER_HOME=$HOME
NVM_DIR="$HOME/.nvm"

# Encontrar caminho do Node.js
find_node_path() {
    if [ -d "$NVM_DIR/versions/node" ]; then
        NODE_PATH=$(find "$NVM_DIR/versions/node" -maxdepth 1 -type d -name "v22*" | head -1)/bin
        if [ -d "$NODE_PATH" ]; then
            echo "$NODE_PATH"
            return
        fi
    fi
    
    # Fallback para node no PATH
    which node | xargs dirname
}

NODE_BIN_PATH=$(find_node_path)

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Configurando Serviços Systemd${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

print_info "Usuário: $USER_NAME"
print_info "Home: $USER_HOME"
print_info "Node path: $NODE_BIN_PATH"
echo ""

# Criar serviço do ClawdBot
create_clawdbot_service() {
    print_info "Criando serviço do ClawdBot..."
    
    cat << EOF | sudo tee /etc/systemd/system/clawdbot.service > /dev/null
[Unit]
Description=ClawdBot AI Agent
Documentation=https://github.com/clawdbot/clawdbot
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=$USER_NAME
Group=$USER_NAME
WorkingDirectory=$USER_HOME
Environment="HOME=$USER_HOME"
Environment="PATH=$NODE_BIN_PATH:/usr/local/bin:/usr/bin:/bin"
Environment="NODE_OPTIONS=--max-old-space-size=4096"
Environment="NVM_DIR=$NVM_DIR"
ExecStart=$NODE_BIN_PATH/clawdbot gateway --port 18789
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=clawdbot

# Limites de recursos
LimitNOFILE=65535
MemoryMax=8G
CPUQuota=80%

# Segurança
NoNewPrivileges=false
ProtectSystem=false
ProtectHome=false

[Install]
WantedBy=multi-user.target
EOF

    print_success "Serviço clawdbot.service criado"
}

# Criar serviço do Dashboard
create_dashboard_service() {
    print_info "Criando serviço do Dashboard..."
    
    cat << EOF | sudo tee /etc/systemd/system/clawdbot-dashboard.service > /dev/null
[Unit]
Description=ClawdBot Dashboard
Documentation=https://github.com/clawdbot/clawdbot
After=network.target clawdbot.service
Wants=clawdbot.service

[Service]
Type=simple
User=$USER_NAME
Group=$USER_NAME
WorkingDirectory=$USER_HOME
Environment="HOME=$USER_HOME"
Environment="PATH=$NODE_BIN_PATH:/usr/local/bin:/usr/bin:/bin"
Environment="NODE_OPTIONS=--max-old-space-size=2048"
Environment="NVM_DIR=$NVM_DIR"
ExecStart=$NODE_BIN_PATH/clawdbot dashboard
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=clawdbot-dashboard

[Install]
WantedBy=multi-user.target
EOF

    print_success "Serviço clawdbot-dashboard.service criado"
}

# Verificar serviço do Ollama
check_ollama_service() {
    if [ -f /etc/systemd/system/ollama.service ]; then
        print_success "Serviço ollama.service já existe"
    else
        print_warning "Serviço do Ollama não encontrado"
        print_info "O Ollama geralmente cria seu próprio serviço durante a instalação"
        print_info "Execute: curl -fsSL https://ollama.com/install.sh | sh"
    fi
}

# Copiar arquivos de serviço do projeto (se existirem)
copy_project_services() {
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
    SERVICES_DIR="$PROJECT_DIR/services"
    
    if [ -d "$SERVICES_DIR" ]; then
        print_info "Arquivos de serviço do projeto encontrados"
        # Os arquivos são apenas referência, usamos os criados dinamicamente
    fi
}

# Recarregar systemd
reload_systemd() {
    print_info "Recarregando systemd..."
    sudo systemctl daemon-reload
    print_success "Systemd recarregado"
}

# Habilitar serviços
enable_services() {
    echo ""
    read -p "Deseja habilitar os serviços para iniciar no boot? (S/n) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        print_info "Habilitando serviços..."
        
        sudo systemctl enable clawdbot.service
        print_success "clawdbot.service habilitado"
        
        sudo systemctl enable clawdbot-dashboard.service
        print_success "clawdbot-dashboard.service habilitado"
        
        if systemctl list-unit-files | grep -q "ollama.service"; then
            sudo systemctl enable ollama.service
            print_success "ollama.service habilitado"
        fi
    else
        print_info "Serviços não foram habilitados para o boot"
    fi
}

# Iniciar serviços
start_services() {
    echo ""
    read -p "Deseja iniciar os serviços agora? (S/n) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        print_info "Iniciando serviços..."
        
        # Iniciar Ollama primeiro
        if systemctl list-unit-files | grep -q "ollama.service"; then
            sudo systemctl start ollama.service
            print_success "ollama.service iniciado"
            sleep 3
        fi
        
        # Iniciar ClawdBot
        sudo systemctl start clawdbot.service
        print_success "clawdbot.service iniciado"
        
        # Iniciar Dashboard
        sudo systemctl start clawdbot-dashboard.service
        print_success "clawdbot-dashboard.service iniciado"
        
        echo ""
        print_info "Aguarde alguns segundos para os serviços iniciarem completamente..."
        sleep 5
        
        # Mostrar status
        echo ""
        echo -e "${BLUE}Status dos Serviços:${NC}"
        echo ""
        
        systemctl status clawdbot.service --no-pager -l || true
    else
        print_info "Serviços não foram iniciados"
    fi
}

# Mostrar comandos úteis
show_useful_commands() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}Comandos Úteis${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
    echo -e "${GREEN}Verificar status:${NC}"
    echo "  sudo systemctl status clawdbot"
    echo "  sudo systemctl status clawdbot-dashboard"
    echo "  sudo systemctl status ollama"
    echo ""
    echo -e "${GREEN}Ver logs em tempo real:${NC}"
    echo "  journalctl -u clawdbot -f"
    echo "  journalctl -u clawdbot-dashboard -f"
    echo ""
    echo -e "${GREEN}Reiniciar serviços:${NC}"
    echo "  sudo systemctl restart clawdbot"
    echo ""
    echo -e "${GREEN}Parar serviços:${NC}"
    echo "  sudo systemctl stop clawdbot"
    echo "  sudo systemctl stop clawdbot-dashboard"
    echo ""
    echo -e "${GREEN}Desabilitar serviços:${NC}"
    echo "  sudo systemctl disable clawdbot"
    echo ""
}

# Execução principal
main() {
    create_clawdbot_service
    create_dashboard_service
    check_ollama_service
    copy_project_services
    reload_systemd
    enable_services
    start_services
    show_useful_commands
    
    echo ""
    print_success "Configuração de serviços concluída!"
}

main
