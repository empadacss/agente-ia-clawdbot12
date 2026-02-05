# 📦 Guia Completo de Instalação

Este guia detalha o processo de instalação do Agente de IA ClawdBot na Orange Pi 5 Plus 32GB.

## 📋 Índice

1. [Requisitos](#-requisitos)
2. [Preparação do Sistema](#-preparação-do-sistema)
3. [Instalação Automática](#-instalação-automática)
4. [Instalação Manual](#-instalação-manual)
5. [Verificação](#-verificação)
6. [Próximos Passos](#-próximos-passos)

---

## 📌 Requisitos

### Hardware
| Componente | Mínimo | Recomendado |
|------------|--------|-------------|
| RAM | 8GB | 32GB |
| Armazenamento | 32GB | 64GB+ |
| CPU | ARM64 | RK3588 (Orange Pi 5+) |
| Rede | Wi-Fi | Ethernet |

### Software
- Sistema operacional Linux ARM64 (Armbian, Ubuntu, Debian)
- Conexão com internet (apenas para instalação)

---

## 🔧 Preparação do Sistema

### 1. Instalar Sistema Operacional

Recomendamos **Armbian** para Orange Pi 5 Plus:

1. Baixe a imagem de: https://www.armbian.com/orange-pi-5-plus/
2. Grave no cartão SD usando Balena Etcher ou dd
3. Insira na Orange Pi e ligue

### 2. Primeiro Boot

```bash
# Faça login (usuário padrão: root, senha: 1234)
# Siga o assistente para criar novo usuário

# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
sudo apt install -y curl wget git build-essential htop
```

### 3. Configurar Rede (se necessário)

```bash
# Para Wi-Fi
nmtui

# Para IP estático
sudo nano /etc/netplan/01-netcfg.yaml
```

---

## ⚡ Instalação Automática

A forma mais fácil de instalar:

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/agente-ia-clawdbot-local.git
cd agente-ia-clawdbot-local

# 2. Dê permissão de execução
chmod +x scripts/*.sh

# 3. Execute o instalador
./scripts/install.sh
```

O script irá:
- ✅ Instalar Node.js 22 via NVM
- ✅ Instalar ClawdBot globalmente
- ✅ Instalar e configurar Ollama
- ✅ Baixar modelo de IA (llama3.1:8b)
- ✅ Configurar serviços systemd
- ✅ Criar swap de 8GB

---

## 🛠️ Instalação Manual

Se preferir instalar manualmente:

### 1. Instalar NVM e Node.js

```bash
# Instalar NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Recarregar shell
source ~/.bashrc

# Instalar Node.js 22
nvm install 22
nvm use 22
nvm alias default 22

# Verificar
node --version  # Deve ser v22.x.x
npm --version   # Deve ser 10.x.x
```

### 2. Instalar ClawdBot

```bash
# Instalar globalmente
npm install -g clawdbot@latest

# Verificar
clawdbot --version
```

### 3. Instalar Ollama

```bash
# Instalar Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Iniciar serviço
sudo systemctl enable ollama
sudo systemctl start ollama

# Baixar modelo
ollama pull llama3.1:8b
```

### 4. Configurar ClawdBot

```bash
# Executar onboarding
clawdbot onboard --install-daemon
```

Durante o onboarding:
1. Escolha "ollama" como provedor de LLM
2. Digite "llama3.1:8b" como modelo
3. Configure integrações (opcional)

### 5. Configurar Serviços Systemd

```bash
# Copiar arquivo de serviço
sudo cp services/clawdbot.service /etc/systemd/system/

# Editar com seu usuário
sudo nano /etc/systemd/system/clawdbot.service
# Substitua "orangepi" pelo seu nome de usuário

# Recarregar e habilitar
sudo systemctl daemon-reload
sudo systemctl enable clawdbot
sudo systemctl start clawdbot
```

### 6. Configurar Swap (Recomendado)

```bash
# Criar arquivo de swap
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Tornar permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## ✅ Verificação

### Verificar Instalação

```bash
# Verificar Node.js
node --version

# Verificar ClawdBot
clawdbot --version

# Verificar Ollama
ollama --version

# Verificar serviços
sudo systemctl status clawdbot
sudo systemctl status ollama

# Executar health check
./scripts/health-check.sh
```

### Testar Skills

```bash
npm run test:skills
```

### Acessar Dashboard

```bash
# Se estiver na Orange Pi
clawdbot dashboard

# Acesse no navegador
# http://localhost:18789
```

---

## 🚀 Próximos Passos

1. **Configurar integrações** - Veja [CONFIGURATION.md](CONFIGURATION.md)
2. **Personalizar skills** - Edite arquivos em `skills/`
3. **Configurar alertas** - Edite `config/integrations.json`
4. **Acessar remotamente** - Use SSH tunnel ou VPN

---

## ❓ Problemas Comuns

### Node.js não encontrado após instalação

```bash
source ~/.nvm/nvm.sh
nvm use 22
```

### Erro "JavaScript heap out of memory"

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Ollama não inicia

```bash
# Verificar logs
journalctl -u ollama -f

# Reiniciar
sudo systemctl restart ollama
```

### Porta em uso

```bash
# Verificar o que está usando a porta
sudo lsof -i :18789

# Matar processo se necessário
sudo kill -9 PID
```

---

## 📚 Mais Informações

- [CONFIGURATION.md](CONFIGURATION.md) - Guia de configuração
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Solução de problemas
- [SECURITY.md](SECURITY.md) - Práticas de segurança
- [README.md](../README.md) - Visão geral do projeto
