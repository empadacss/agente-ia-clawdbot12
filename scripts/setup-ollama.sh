#!/bin/bash

# ============================================
# Script de Configuração do Ollama
# Otimizado para Orange Pi 5 Plus 32GB
# ============================================

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Verificar se Ollama está instalado
check_ollama() {
    if ! command -v ollama &> /dev/null; then
        print_error "Ollama não está instalado!"
        print_info "Execute: curl -fsSL https://ollama.com/install.sh | sh"
        exit 1
    fi
    print_success "Ollama encontrado"
}

# Iniciar Ollama se não estiver rodando
start_ollama() {
    if pgrep -x "ollama" > /dev/null; then
        print_info "Ollama já está rodando"
    else
        print_info "Iniciando Ollama..."
        ollama serve &> /dev/null &
        sleep 5
        print_success "Ollama iniciado"
    fi
}

# Menu de seleção de modelo
select_model() {
    print_header "Seleção de Modelo de IA"
    
    echo "Modelos disponíveis para Orange Pi 5 Plus 32GB:"
    echo ""
    echo -e "${GREEN}[1]${NC} llama3.1:8b    - Recomendado (melhor equilíbrio)"
    echo -e "${GREEN}[2]${NC} mistral:7b     - Rápido e eficiente"
    echo -e "${GREEN}[3]${NC} qwen2:7b       - Bom para código"
    echo -e "${GREEN}[4]${NC} phi3:mini      - Ultra leve (3.8B)"
    echo -e "${GREEN}[5]${NC} codellama:7b   - Especializado em código"
    echo -e "${GREEN}[6]${NC} llama3.1:70b   - Mais capaz (requer muita RAM)"
    echo -e "${GREEN}[7]${NC} Personalizado  - Digite o nome do modelo"
    echo ""
    
    read -p "Escolha uma opção [1-7]: " choice
    
    case $choice in
        1) MODEL="llama3.1:8b" ;;
        2) MODEL="mistral:7b" ;;
        3) MODEL="qwen2:7b" ;;
        4) MODEL="phi3:mini" ;;
        5) MODEL="codellama:7b" ;;
        6) MODEL="llama3.1:70b" ;;
        7)
            read -p "Digite o nome do modelo: " MODEL
            ;;
        *)
            MODEL="llama3.1:8b"
            print_info "Usando modelo padrão: $MODEL"
            ;;
    esac
    
    echo ""
    print_info "Modelo selecionado: $MODEL"
}

# Baixar modelo
download_model() {
    print_header "Baixando Modelo: $MODEL"
    
    print_warning "Isso pode demorar dependendo da sua conexão..."
    echo ""
    
    ollama pull "$MODEL"
    
    print_success "Modelo $MODEL baixado com sucesso!"
}

# Testar modelo
test_model() {
    print_header "Testando Modelo"
    
    print_info "Enviando prompt de teste..."
    echo ""
    
    RESPONSE=$(ollama run "$MODEL" "Responda apenas: Olá, estou funcionando!" 2>/dev/null | head -1)
    
    if [ -n "$RESPONSE" ]; then
        echo -e "${GREEN}Resposta do modelo:${NC} $RESPONSE"
        print_success "Modelo funcionando corretamente!"
    else
        print_error "Falha ao testar modelo"
    fi
}

# Configurar Ollama para aceitar conexões externas (opcional)
configure_external_access() {
    print_header "Configuração de Acesso Externo"
    
    echo "Deseja permitir acesso externo ao Ollama?"
    echo "(Necessário se for usar de outro computador na rede)"
    echo ""
    
    read -p "Permitir acesso externo? (s/N) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        # Criar arquivo de override do systemd
        sudo mkdir -p /etc/systemd/system/ollama.service.d/
        
        cat << 'EOF' | sudo tee /etc/systemd/system/ollama.service.d/environment.conf
[Service]
Environment="OLLAMA_HOST=0.0.0.0"
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl restart ollama
        
        print_success "Acesso externo configurado"
        print_warning "Ollama agora aceita conexões em todas as interfaces"
        print_info "Acesse via: http://IP_DA_ORANGEPI:11434"
    else
        print_info "Mantendo apenas acesso local"
    fi
}

# Listar modelos instalados
list_models() {
    print_header "Modelos Instalados"
    
    ollama list
}

# Mostrar informações do sistema
show_system_info() {
    print_header "Informações do Sistema"
    
    echo -e "${BLUE}RAM Total:${NC}"
    free -h | grep "Mem:"
    echo ""
    
    echo -e "${BLUE}Espaço em Disco:${NC}"
    df -h / | tail -1
    echo ""
    
    echo -e "${BLUE}CPU:${NC}"
    lscpu | grep "Model name" || cat /proc/cpuinfo | grep "model name" | head -1
    echo ""
    
    # Verificar NPU se disponível
    if [ -f /sys/class/rknpu/npu/available ]; then
        echo -e "${BLUE}NPU (Rockchip):${NC}"
        cat /sys/class/rknpu/npu/available
    fi
}

# Otimizar para Orange Pi
optimize_for_orangepi() {
    print_header "Otimizações para Orange Pi"
    
    # Configurar variáveis de ambiente para melhor performance
    OLLAMA_ENV='
# Ollama Optimizations for Orange Pi
export OLLAMA_NUM_PARALLEL=2
export OLLAMA_MAX_LOADED_MODELS=1
export OLLAMA_KEEP_ALIVE=5m
'
    
    if ! grep -q "OLLAMA_NUM_PARALLEL" ~/.bashrc; then
        echo "$OLLAMA_ENV" >> ~/.bashrc
        print_success "Otimizações adicionadas ao .bashrc"
    else
        print_info "Otimizações já configuradas"
    fi
    
    print_info "Recomendações de uso:"
    echo "  - Use modelos de 7-8B para melhor performance"
    echo "  - Evite múltiplos modelos carregados simultaneamente"
    echo "  - Monitore a temperatura da CPU durante uso intenso"
}

# Menu principal
show_menu() {
    print_header "🤖 Configurador do Ollama"
    
    echo "Opções disponíveis:"
    echo ""
    echo -e "${GREEN}[1]${NC} Instalação completa (recomendado)"
    echo -e "${GREEN}[2]${NC} Apenas baixar novo modelo"
    echo -e "${GREEN}[3]${NC} Listar modelos instalados"
    echo -e "${GREEN}[4]${NC} Testar modelo"
    echo -e "${GREEN}[5]${NC} Configurar acesso externo"
    echo -e "${GREEN}[6]${NC} Mostrar info do sistema"
    echo -e "${GREEN}[7]${NC} Otimizar para Orange Pi"
    echo -e "${GREEN}[0]${NC} Sair"
    echo ""
    
    read -p "Escolha uma opção: " option
    
    case $option in
        1)
            check_ollama
            start_ollama
            show_system_info
            select_model
            download_model
            test_model
            optimize_for_orangepi
            ;;
        2)
            check_ollama
            start_ollama
            select_model
            download_model
            ;;
        3)
            check_ollama
            list_models
            ;;
        4)
            check_ollama
            start_ollama
            list_models
            read -p "Digite o nome do modelo para testar: " MODEL
            test_model
            ;;
        5)
            configure_external_access
            ;;
        6)
            show_system_info
            ;;
        7)
            optimize_for_orangepi
            ;;
        0)
            print_info "Saindo..."
            exit 0
            ;;
        *)
            print_error "Opção inválida"
            show_menu
            ;;
    esac
}

# Execução
show_menu
