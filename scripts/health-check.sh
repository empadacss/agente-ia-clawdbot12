#!/bin/bash

# ============================================
# Script de Health Check
# Verifica saúde do sistema e serviços
# ============================================

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Contadores
PASSED=0
WARNINGS=0
FAILED=0

# Funções de status
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

check_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Header
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🤖 Health Check - Agente de IA        ║${NC}"
echo -e "${BLUE}║         Orange Pi 5 Plus 32GB             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Data/Hora: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""

# ============================================
# Verificar Serviços
# ============================================
echo -e "${BLUE}━━━ Serviços ━━━${NC}"

# ClawdBot
if systemctl is-active --quiet clawdbot 2>/dev/null; then
    check_pass "ClawdBot: rodando"
elif pgrep -f "clawdbot" > /dev/null; then
    check_pass "ClawdBot: rodando (manual)"
else
    check_fail "ClawdBot: parado"
fi

# ClawdBot Dashboard
if systemctl is-active --quiet clawdbot-dashboard 2>/dev/null; then
    check_pass "Dashboard: rodando"
elif pgrep -f "clawdbot dashboard" > /dev/null; then
    check_pass "Dashboard: rodando (manual)"
else
    check_warn "Dashboard: parado"
fi

# Ollama
if systemctl is-active --quiet ollama 2>/dev/null; then
    check_pass "Ollama: rodando"
elif pgrep -f "ollama" > /dev/null; then
    check_pass "Ollama: rodando (manual)"
else
    check_fail "Ollama: parado"
fi

# Verificar se Ollama responde
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    check_pass "Ollama API: respondendo"
else
    check_warn "Ollama API: não responde"
fi

echo ""

# ============================================
# Verificar Recursos do Sistema
# ============================================
echo -e "${BLUE}━━━ Recursos do Sistema ━━━${NC}"

# CPU
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print 100 - $8}' | cut -d'.' -f1 2>/dev/null || echo "0")
if [ "$CPU_USAGE" -lt 70 ]; then
    check_pass "CPU: ${CPU_USAGE}%"
elif [ "$CPU_USAGE" -lt 90 ]; then
    check_warn "CPU: ${CPU_USAGE}% (alto)"
else
    check_fail "CPU: ${CPU_USAGE}% (crítico)"
fi

# RAM
RAM_TOTAL=$(free -m | awk '/^Mem:/ {print $2}')
RAM_USED=$(free -m | awk '/^Mem:/ {print $3}')
RAM_FREE=$(free -m | awk '/^Mem:/ {print $7}')
RAM_PERCENT=$((RAM_USED * 100 / RAM_TOTAL))

if [ "$RAM_PERCENT" -lt 70 ]; then
    check_pass "RAM: ${RAM_USED}MB / ${RAM_TOTAL}MB (${RAM_PERCENT}%)"
elif [ "$RAM_PERCENT" -lt 90 ]; then
    check_warn "RAM: ${RAM_USED}MB / ${RAM_TOTAL}MB (${RAM_PERCENT}%)"
else
    check_fail "RAM: ${RAM_USED}MB / ${RAM_TOTAL}MB (${RAM_PERCENT}%) - CRÍTICO"
fi

check_info "RAM Disponível: ${RAM_FREE}MB"

# Swap
SWAP_TOTAL=$(free -m | awk '/^Swap:/ {print $2}')
SWAP_USED=$(free -m | awk '/^Swap:/ {print $3}')
if [ "$SWAP_TOTAL" -gt 0 ]; then
    SWAP_PERCENT=$((SWAP_USED * 100 / SWAP_TOTAL))
    if [ "$SWAP_PERCENT" -lt 50 ]; then
        check_pass "Swap: ${SWAP_USED}MB / ${SWAP_TOTAL}MB (${SWAP_PERCENT}%)"
    else
        check_warn "Swap: ${SWAP_USED}MB / ${SWAP_TOTAL}MB (${SWAP_PERCENT}%)"
    fi
else
    check_warn "Swap: não configurado"
fi

# Disco
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
DISK_FREE=$(df -h / | awk 'NR==2 {print $4}')
if [ "$DISK_USAGE" -lt 70 ]; then
    check_pass "Disco: ${DISK_USAGE}% usado (${DISK_FREE} livre)"
elif [ "$DISK_USAGE" -lt 90 ]; then
    check_warn "Disco: ${DISK_USAGE}% usado (${DISK_FREE} livre)"
else
    check_fail "Disco: ${DISK_USAGE}% usado - CRÍTICO"
fi

# Temperatura (específico para Orange Pi / ARM)
if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
    TEMP_RAW=$(cat /sys/class/thermal/thermal_zone0/temp)
    TEMP=$((TEMP_RAW / 1000))
    
    if [ "$TEMP" -lt 60 ]; then
        check_pass "Temperatura CPU: ${TEMP}°C"
    elif [ "$TEMP" -lt 75 ]; then
        check_warn "Temperatura CPU: ${TEMP}°C (quente)"
    else
        check_fail "Temperatura CPU: ${TEMP}°C (muito quente!)"
    fi
else
    check_info "Temperatura: sensor não disponível"
fi

echo ""

# ============================================
# Verificar Rede
# ============================================
echo -e "${BLUE}━━━ Rede ━━━${NC}"

# IP Local
IP_LOCAL=$(hostname -I | awk '{print $1}')
if [ -n "$IP_LOCAL" ]; then
    check_pass "IP Local: $IP_LOCAL"
else
    check_fail "IP Local: não encontrado"
fi

# Conectividade
if ping -c 1 8.8.8.8 &> /dev/null; then
    check_pass "Internet: conectado"
else
    check_warn "Internet: sem conexão"
fi

# Porta do ClawdBot
if netstat -tlnp 2>/dev/null | grep -q ":18789" || ss -tlnp 2>/dev/null | grep -q ":18789"; then
    check_pass "Porta 18789: aberta (ClawdBot)"
else
    check_warn "Porta 18789: fechada"
fi

# Porta do Ollama
if netstat -tlnp 2>/dev/null | grep -q ":11434" || ss -tlnp 2>/dev/null | grep -q ":11434"; then
    check_pass "Porta 11434: aberta (Ollama)"
else
    check_warn "Porta 11434: fechada"
fi

echo ""

# ============================================
# Verificar Dependências
# ============================================
echo -e "${BLUE}━━━ Dependências ━━━${NC}"

# Node.js
if command -v node &> /dev/null; then
    NODE_VER=$(node --version)
    NODE_MAJOR=$(echo $NODE_VER | cut -d'.' -f1 | tr -d 'v')
    if [ "$NODE_MAJOR" -ge 22 ]; then
        check_pass "Node.js: $NODE_VER"
    else
        check_warn "Node.js: $NODE_VER (recomendado v22+)"
    fi
else
    check_fail "Node.js: não instalado"
fi

# npm
if command -v npm &> /dev/null; then
    NPM_VER=$(npm --version)
    check_pass "npm: $NPM_VER"
else
    check_fail "npm: não instalado"
fi

# ClawdBot CLI
if command -v clawdbot &> /dev/null; then
    check_pass "ClawdBot CLI: instalado"
else
    check_fail "ClawdBot CLI: não instalado"
fi

# Ollama CLI
if command -v ollama &> /dev/null; then
    check_pass "Ollama CLI: instalado"
else
    check_fail "Ollama CLI: não instalado"
fi

# Git
if command -v git &> /dev/null; then
    check_pass "Git: instalado"
else
    check_warn "Git: não instalado"
fi

echo ""

# ============================================
# Verificar Modelos Ollama
# ============================================
echo -e "${BLUE}━━━ Modelos de IA ━━━${NC}"

if command -v ollama &> /dev/null && curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    MODELS=$(ollama list 2>/dev/null | tail -n +2)
    if [ -n "$MODELS" ]; then
        echo "$MODELS" | while read line; do
            MODEL_NAME=$(echo "$line" | awk '{print $1}')
            MODEL_SIZE=$(echo "$line" | awk '{print $3}')
            check_info "Modelo: $MODEL_NAME ($MODEL_SIZE)"
        done
    else
        check_warn "Nenhum modelo instalado"
    fi
else
    check_info "Ollama não disponível para listar modelos"
fi

echo ""

# ============================================
# Uptime e Load
# ============================================
echo -e "${BLUE}━━━ Sistema ━━━${NC}"

UPTIME=$(uptime -p)
check_info "Uptime: $UPTIME"

LOAD=$(uptime | awk -F'load average:' '{print $2}' | xargs)
check_info "Load Average: $LOAD"

# Processos
PROCS=$(ps aux | wc -l)
check_info "Processos: $PROCS"

echo ""

# ============================================
# Resumo Final
# ============================================
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              📊 RESUMO                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Passou: $PASSED${NC}"
echo -e "${YELLOW}⚠️  Avisos: $WARNINGS${NC}"
echo -e "${RED}❌ Falhas: $FAILED${NC}"
echo ""

# Status geral
if [ "$FAILED" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}🎉 Sistema funcionando perfeitamente!${NC}"
elif [ "$FAILED" -eq 0 ]; then
    echo -e "${YELLOW}⚡ Sistema operacional com avisos menores${NC}"
else
    echo -e "${RED}🔧 Atenção: há problemas que precisam ser resolvidos${NC}"
fi

echo ""

# URL de acesso
if [ -n "$IP_LOCAL" ]; then
    echo -e "${CYAN}📱 Acesse o dashboard em: http://${IP_LOCAL}:18789${NC}"
fi

echo ""
