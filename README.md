# 🤖 OrangePi IA Bot - Agente de IA Local

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-blue.svg)](https://core.telegram.org/bots)
[![Ollama](https://img.shields.io/badge/Ollama-Local_LLM-orange.svg)](https://ollama.com/)

Um bot de Telegram que roda **100% localmente** na Orange Pi 5 Plus, usando Ollama para IA e permitindo controle total do sistema.

---

## ✨ Funcionalidades

| Categoria | O que faz |
|-----------|-----------|
| 🧠 **IA Local** | Responde perguntas usando LLM local (Ollama) |
| 📊 **Monitoramento** | CPU, RAM, disco, temperatura, processos |
| 💻 **Terminal** | Executa comandos shell remotamente |
| 📁 **Arquivos** | Lista, lê, cria e remove arquivos |
| 🌐 **Navegador** | Abre páginas e tira screenshots |
| 🔒 **Segurança** | Comandos perigosos bloqueados |

---

## 🚀 Instalação Rápida

### Um comando só:

```bash
curl -fsSL https://raw.githubusercontent.com/empadacss/agente-ia-clawdbot12/main/bot/install.sh | bash
```

### Ou manualmente:

```bash
git clone https://github.com/empadacss/agente-ia-clawdbot12.git
cd agente-ia-clawdbot12/bot
chmod +x install.sh
./install.sh
```

---

## 📱 Comandos do Bot

Após instalado, abra o Telegram e fale com **@orangepi32bot**:

### Sistema
| Comando | Descrição |
|---------|-----------|
| `/status` | Status completo do sistema |
| `/cpu` | Uso da CPU |
| `/ram` | Uso de memória |
| `/temp` | Temperatura |
| `/disco` | Uso do disco |
| `/processos` | Top processos |

### Terminal
| Comando | Descrição |
|---------|-----------|
| `/exec <cmd>` | Executar comando |
| `/ping <host>` | Testar conectividade |

### Arquivos
| Comando | Descrição |
|---------|-----------|
| `/ls <pasta>` | Listar diretório |
| `/cat <arquivo>` | Ver conteúdo |
| `/pwd` | Diretório atual |

### Navegador
| Comando | Descrição |
|---------|-----------|
| `/abrir <url>` | Abrir página |
| `/screenshot` | Capturar tela |
| `/fechar` | Fechar navegador |

### IA
Envie qualquer mensagem para conversar com a IA!

---

## 🔧 Configuração

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `TELEGRAM_TOKEN` | Token do bot | - |
| `ALLOWED_USERS` | IDs permitidos (vírgula) | - |
| `OLLAMA_MODEL` | Modelo de IA | llama3.1:8b |
| `OLLAMA_URL` | URL do Ollama | http://localhost:11434 |

### Editar configuração:

```bash
sudo systemctl edit orangepi-bot
```

Adicione:
```ini
[Service]
Environment="TELEGRAM_TOKEN=seu_token"
Environment="ALLOWED_USERS=123456789"
Environment="OLLAMA_MODEL=llama3.1:8b"
```

Depois:
```bash
sudo systemctl restart orangepi-bot
```

---

## 🛠️ Gerenciamento

```bash
# Ver status
sudo systemctl status orangepi-bot

# Ver logs
sudo journalctl -u orangepi-bot -f

# Reiniciar
sudo systemctl restart orangepi-bot

# Parar
sudo systemctl stop orangepi-bot

# Iniciar
sudo systemctl start orangepi-bot
```

---

## 📋 Requisitos

- Orange Pi 5 Plus (ou similar ARM64)
- 8GB+ RAM (32GB recomendado)
- Armbian/Ubuntu 22.04+
- Conexão com internet

---

## 🔒 Segurança

Comandos bloqueados automaticamente:
- `rm -rf /`
- `mkfs`
- `shutdown`, `reboot`, `halt`
- Fork bombs

Acesso restrito apenas aos IDs no `ALLOWED_USERS`.

---

## 📄 Licença

MIT License - Use como quiser!

---

## 🙏 Créditos

- [Ollama](https://ollama.com/) - LLM local
- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) - Telegram API
- [Puppeteer](https://pptr.dev/) - Navegador headless
