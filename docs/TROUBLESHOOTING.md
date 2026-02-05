# 🔧 Solução de Problemas

Guia para resolver problemas comuns com o Agente de IA ClawdBot.

## 📋 Índice

1. [Problemas de Instalação](#-problemas-de-instalação)
2. [Problemas de Execução](#-problemas-de-execução)
3. [Problemas com Ollama](#-problemas-com-ollama)
4. [Problemas de Rede](#-problemas-de-rede)
5. [Problemas de Performance](#-problemas-de-performance)
6. [Logs e Diagnóstico](#-logs-e-diagnóstico)

---

## 📦 Problemas de Instalação

### Node.js não encontrado

**Sintoma**: `command not found: node`

**Solução**:
```bash
# Carregar NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Verificar
node --version

# Se ainda não funcionar, reinstalar
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 22
```

### ClawdBot não instala

**Sintoma**: Erros durante `npm install -g clawdbot`

**Soluções**:
```bash
# Limpar cache do npm
npm cache clean --force

# Tentar com permissões
sudo npm install -g clawdbot --unsafe-perm

# Ou usar npx
npx clawdbot@latest
```

### Erro de permissão

**Sintoma**: `EACCES: permission denied`

**Solução**:
```bash
# Corrigir permissões do npm
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

---

## ⚡ Problemas de Execução

### JavaScript heap out of memory

**Sintoma**: `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory`

**Solução**:
```bash
# Aumentar limite de memória
export NODE_OPTIONS="--max-old-space-size=4096"

# Para Orange Pi 32GB, pode usar mais
export NODE_OPTIONS="--max-old-space-size=8192"

# Adicionar ao .bashrc para persistir
echo 'export NODE_OPTIONS="--max-old-space-size=4096"' >> ~/.bashrc
```

### ClawdBot não inicia

**Sintoma**: Serviço falha ao iniciar

**Diagnóstico**:
```bash
# Ver logs
journalctl -u clawdbot -n 50

# Verificar status
sudo systemctl status clawdbot

# Tentar manualmente
clawdbot gateway --port 18789
```

**Soluções comuns**:
```bash
# Porta em uso
sudo lsof -i :18789
sudo kill -9 PID_DO_PROCESSO

# Permissões do serviço
sudo chown -R $USER:$USER ~/.clawdbot

# Recriar serviço
sudo systemctl daemon-reload
sudo systemctl restart clawdbot
```

### Dashboard não abre

**Sintoma**: Não consegue acessar http://localhost:18789

**Soluções**:
```bash
# Verificar se está rodando
pgrep -f clawdbot

# Verificar porta
ss -tlnp | grep 18789

# Firewall
sudo ufw allow 18789

# Tentar com IP explícito
clawdbot dashboard --host 0.0.0.0
```

---

## 🦙 Problemas com Ollama

### Ollama não inicia

**Sintoma**: `Connection refused` ao tentar usar Ollama

**Solução**:
```bash
# Verificar status
sudo systemctl status ollama

# Iniciar manualmente
ollama serve

# Ver logs
journalctl -u ollama -f

# Reinstalar
curl -fsSL https://ollama.com/install.sh | sh
```

### Modelo não carrega

**Sintoma**: `model not found` ou demora infinita

**Solução**:
```bash
# Listar modelos
ollama list

# Baixar modelo novamente
ollama pull llama3.1:8b

# Usar modelo menor se RAM for problema
ollama pull phi3:mini
```

### Ollama muito lento

**Sintoma**: Respostas demoram muito

**Soluções**:
```bash
# Usar modelo menor
ollama pull phi3:mini

# Limitar contexto
# Em config/clawdbot.config.json:
# "maxTokens": 2048

# Verificar uso de RAM
free -h

# Verificar temperatura (throttling)
cat /sys/class/thermal/thermal_zone0/temp
```

### Erro "connection reset"

**Sintoma**: Ollama desconecta durante geração

**Solução**:
```bash
# Aumentar timeout
# Em config/clawdbot.config.json:
{
  "llm": {
    "timeout": 300000
  }
}

# Verificar swap
free -h
sudo swapon --show

# Criar mais swap se necessário
sudo fallocate -l 16G /swapfile2
sudo chmod 600 /swapfile2
sudo mkswap /swapfile2
sudo swapon /swapfile2
```

---

## 🌐 Problemas de Rede

### Telegram não conecta

**Sintoma**: Bot não responde no Telegram

**Soluções**:
```bash
# Verificar token
echo $TELEGRAM_BOT_TOKEN

# Testar conexão com API do Telegram
curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe

# Verificar firewall
sudo ufw status

# Verificar DNS
ping api.telegram.org
```

### WhatsApp desconecta

**Sintoma**: Sessão do WhatsApp expira

**Solução**:
```bash
# Remover sessão antiga
rm -rf ./sessions/whatsapp

# Reconectar
clawdbot integrations add whatsapp
```

### Não consegue acessar remotamente

**Sintoma**: Não acessa dashboard de outro computador

**Soluções**:
```bash
# Verificar se está escutando em todas interfaces
ss -tlnp | grep 18789
# Deve mostrar 0.0.0.0:18789

# Configurar para escutar externamente
# Em config/clawdbot.config.json:
{
  "gateway": {
    "host": "0.0.0.0"
  }
}

# Firewall
sudo ufw allow 18789

# Usar SSH tunnel (mais seguro)
# No seu computador:
ssh -L 18789:localhost:18789 usuario@ip_orangepi
# Depois acesse localhost:18789
```

---

## 🚀 Problemas de Performance

### Sistema lento

**Diagnóstico**:
```bash
# Verificar recursos
htop

# Verificar temperatura
cat /sys/class/thermal/thermal_zone0/temp

# Verificar I/O
iotop
```

**Soluções**:
```bash
# Reduzir uso de memória do Node
export NODE_OPTIONS="--max-old-space-size=2048"

# Usar modelo menor
ollama pull phi3:mini

# Limitar ClawdBot
# Editar /etc/systemd/system/clawdbot.service:
# MemoryMax=4G
# CPUQuota=50%
```

### Alta temperatura

**Sintoma**: CPU acima de 70°C

**Soluções**:
```bash
# Verificar temperatura
watch -n 1 'cat /sys/class/thermal/thermal_zone0/temp'

# Melhorar ventilação
# - Adicionar cooler/fan
# - Melhorar dissipador

# Limitar frequência da CPU
echo "1200000" | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_max_freq

# Reduzir carga
sudo systemctl stop clawdbot
```

### Disco cheio

**Sintoma**: Erros de "no space left"

**Soluções**:
```bash
# Verificar uso
df -h

# Limpar logs antigos
sudo journalctl --vacuum-time=7d

# Limpar cache do npm
npm cache clean --force

# Limpar modelos não usados do Ollama
ollama rm modelo_antigo

# Limpar apt
sudo apt clean
sudo apt autoremove
```

---

## 📊 Logs e Diagnóstico

### Ver logs do ClawdBot

```bash
# Logs do systemd
journalctl -u clawdbot -f

# Últimas 100 linhas
journalctl -u clawdbot -n 100

# Logs de hoje
journalctl -u clawdbot --since today
```

### Ver logs do Ollama

```bash
journalctl -u ollama -f
```

### Health check completo

```bash
./scripts/health-check.sh
```

### Coletar informações para debug

```bash
# Criar relatório de debug
{
  echo "=== Sistema ==="
  uname -a
  
  echo "=== Node.js ==="
  node --version
  npm --version
  
  echo "=== ClawdBot ==="
  clawdbot --version 2>/dev/null || echo "não instalado"
  
  echo "=== Ollama ==="
  ollama --version 2>/dev/null || echo "não instalado"
  ollama list 2>/dev/null
  
  echo "=== Serviços ==="
  systemctl status clawdbot --no-pager
  systemctl status ollama --no-pager
  
  echo "=== Recursos ==="
  free -h
  df -h
  
  echo "=== Temperatura ==="
  cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null
  
} > debug-report.txt

echo "Relatório salvo em debug-report.txt"
```

---

## 🆘 Ainda com Problemas?

1. **Verifique os logs** - A maioria dos problemas está nos logs
2. **Reinicie os serviços** - `sudo systemctl restart clawdbot ollama`
3. **Atualize o sistema** - `sudo apt update && sudo apt upgrade`
4. **Reinstale** - Use o script de instalação novamente

### Comandos de Emergência

```bash
# Parar tudo
sudo systemctl stop clawdbot clawdbot-dashboard ollama

# Limpar e reiniciar
rm -rf ~/.clawdbot/cache
sudo systemctl start ollama
sleep 5
sudo systemctl start clawdbot

# Reset completo (⚠️ perde configurações)
npm uninstall -g clawdbot
rm -rf ~/.clawdbot
npm install -g clawdbot@latest
clawdbot onboard --install-daemon
```
