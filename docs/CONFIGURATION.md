# ⚙️ Guia de Configuração

Este guia explica como configurar o Agente de IA ClawdBot na sua Orange Pi.

## 📋 Índice

1. [Arquivos de Configuração](#-arquivos-de-configuração)
2. [Configuração do LLM](#-configuração-do-llm)
3. [Configuração de Skills](#-configuração-de-skills)
4. [Integrações](#-integrações)
5. [Segurança](#-segurança)
6. [Monitoramento](#-monitoramento)

---

## 📁 Arquivos de Configuração

| Arquivo | Descrição |
|---------|-----------|
| `env.example` | Variáveis de ambiente (copie para `.env`) |
| `config/clawdbot.config.json` | Configuração principal do ClawdBot |
| `config/skills.json` | Skills habilitadas e suas configurações |
| `config/integrations.json` | Integrações de mensageria |

---

## 🧠 Configuração do LLM

### Usando Ollama (Recomendado - 100% Local)

Edite `config/clawdbot.config.json`:

```json
{
  "llm": {
    "provider": "ollama",
    "model": "llama3.1:8b",
    "baseUrl": "http://localhost:11434",
    "temperature": 0.7,
    "maxTokens": 4096
  }
}
```

#### Modelos Recomendados para Orange Pi 5 Plus 32GB

| Modelo | RAM Necessária | Velocidade | Qualidade |
|--------|---------------|------------|-----------|
| `phi3:mini` | ~4GB | ⚡⚡⚡ | ⭐⭐ |
| `mistral:7b` | ~8GB | ⚡⚡ | ⭐⭐⭐ |
| `llama3.1:8b` | ~10GB | ⚡⚡ | ⭐⭐⭐⭐ |
| `qwen2:7b` | ~8GB | ⚡⚡ | ⭐⭐⭐ |
| `codellama:7b` | ~8GB | ⚡⚡ | ⭐⭐⭐ (código) |

#### Baixar Modelos Adicionais

```bash
# Modelo leve para respostas rápidas
ollama pull phi3:mini

# Modelo equilibrado
ollama pull llama3.1:8b

# Modelo para código
ollama pull codellama:7b
```

### Usando Claude (Anthropic)

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-sonnet-20240229",
    "apiKey": "${ANTHROPIC_API_KEY}"
  }
}
```

No arquivo `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### Usando GPT (OpenAI)

```json
{
  "llm": {
    "provider": "openai",
    "model": "gpt-4-turbo",
    "apiKey": "${OPENAI_API_KEY}"
  }
}
```

---

## 🔧 Configuração de Skills

Edite `config/skills.json` para habilitar/desabilitar skills:

```json
{
  "skills": {
    "system-monitor": {
      "enabled": true,
      "config": {
        "refreshInterval": 30,
        "alertsEnabled": true
      }
    },
    "shell-executor": {
      "enabled": true,
      "config": {
        "allowSudo": false,
        "blockedCommands": ["rm -rf /", "mkfs"]
      }
    }
  }
}
```

### Skills Disponíveis

| Skill | Descrição | Risco |
|-------|-----------|-------|
| `system-monitor` | Monitoramento do sistema | 🟢 Baixo |
| `file-manager` | Gerenciamento de arquivos | 🟡 Médio |
| `network-tools` | Ferramentas de rede | 🟢 Baixo |
| `shell-executor` | Execução de comandos | 🔴 Alto |
| `gpio-control` | Controle de GPIO | 🟡 Médio |
| `service-manager` | Gerenciamento de serviços | 🔴 Alto |

---

## 📱 Integrações

### Telegram

1. Crie um bot com [@BotFather](https://t.me/BotFather)
2. Obtenha o token do bot
3. Obtenha seu Chat ID (use [@userinfobot](https://t.me/userinfobot))

Edite `config/integrations.json`:

```json
{
  "integrations": {
    "telegram": {
      "enabled": true,
      "config": {
        "botToken": "123456:ABC-DEF...",
        "allowedChatIds": ["seu_chat_id"],
        "adminChatIds": ["seu_chat_id"]
      }
    }
  }
}
```

Ou via variáveis de ambiente em `.env`:
```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_ALLOWED_CHAT_ID=123456789
```

### WhatsApp

```bash
# Executar configuração
clawdbot integrations add whatsapp
```

Escaneie o QR code que aparecerá no terminal.

### Discord

1. Crie uma aplicação em https://discord.com/developers
2. Crie um bot e obtenha o token
3. Convide o bot para seu servidor

```json
{
  "integrations": {
    "discord": {
      "enabled": true,
      "config": {
        "botToken": "MTIz...",
        "guildId": "seu_server_id",
        "allowedChannels": ["channel_id"]
      }
    }
  }
}
```

### Webhooks

Para receber comandos via HTTP:

```json
{
  "integrations": {
    "webhook": {
      "enabled": true,
      "config": {
        "inbound": {
          "enabled": true,
          "path": "/api/webhook",
          "secret": "seu_secret_aqui"
        }
      }
    }
  }
}
```

Exemplo de uso:
```bash
curl -X POST http://localhost:18789/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: seu_secret_aqui" \
  -d '{"command": "status"}'
```

---

## 🛡️ Segurança

### Configurar Autenticação do Dashboard

```json
{
  "security": {
    "authentication": {
      "enabled": true,
      "type": "password",
      "password": "sua_senha_segura"
    }
  }
}
```

### Restringir IPs

```json
{
  "security": {
    "allowedIPs": [
      "127.0.0.1",
      "192.168.1.0/24"
    ]
  }
}
```

### Bloquear Comandos Perigosos

```json
{
  "security": {
    "commandBlacklist": [
      "rm -rf /",
      "mkfs",
      "dd if=/dev/zero",
      "chmod -R 777 /"
    ]
  }
}
```

---

## 📊 Monitoramento

### Configurar Alertas

```json
{
  "monitoring": {
    "enabled": true,
    "interval": 60,
    "alerts": {
      "cpuThreshold": 80,
      "memoryThreshold": 85,
      "diskThreshold": 90,
      "temperatureThreshold": 70
    }
  }
}
```

### Configurar Notificações

```json
{
  "notifications": {
    "enabled": true,
    "channels": ["telegram"],
    "events": {
      "highTemperature": {
        "enabled": true,
        "priority": "critical",
        "cooldown": 120
      }
    }
  }
}
```

---

## 🔄 Aplicar Configurações

Após modificar arquivos de configuração:

```bash
# Reiniciar ClawdBot
sudo systemctl restart clawdbot

# Ou se estiver rodando manualmente
# Ctrl+C e reinicie
clawdbot dashboard
```

---

## 📝 Variáveis de Ambiente

Crie o arquivo `.env` a partir do exemplo:

```bash
cp env.example .env
nano .env
```

Variáveis importantes:

```bash
# LLM
LLM_PROVIDER=ollama
LLM_MODEL=llama3.1:8b

# Segurança
DASHBOARD_PASSWORD=sua_senha

# Telegram
TELEGRAM_BOT_TOKEN=seu_token
TELEGRAM_ALLOWED_CHAT_ID=seu_id

# Limites
NODE_MAX_MEMORY=4096
```

---

## 📚 Próximos Passos

- [SECURITY.md](SECURITY.md) - Configurações avançadas de segurança
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Solução de problemas
