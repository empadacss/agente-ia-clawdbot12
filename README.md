# 🤖 OrangePi 6 Plus - CONTROLE TOTAL

[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-blue.svg)](https://core.telegram.org/bots)
[![Ollama](https://img.shields.io/badge/Ollama-Local_LLM-orange.svg)](https://ollama.com/)
[![ARM64](https://img.shields.io/badge/ARM64-RK3588-red.svg)](https://www.orangepi.org/)

Bot de Telegram que roda **100% localmente** na Orange Pi 6 Plus 32GB, com **controle total** do sistema via IA local.

---

## ✨ Funcionalidades Completas

| Categoria | Funcionalidades |
|-----------|-----------------|
| 🧠 **IA Local** | Chat com LLM via Ollama, contexto de conversa, sugestões de comandos |
| 📊 **Monitoramento** | CPU, RAM, disco, temperatura, processos, load average |
| 💻 **Terminal** | Execução segura de comandos, bloqueio de comandos perigosos |
| 📍 **GPIO** | Controle de pinos físicos (entrada/saída) |
| 🌐 **Rede** | Configuração WiFi, scan de redes, IP público, interfaces |
| ⚙️ **Serviços** | Gerenciamento completo de serviços systemd |
| 🐳 **Docker** | Listar, iniciar, parar, logs de containers |
| ⏰ **Automação** | Agendamento de tarefas com cron |
| 📦 **Backup** | Backup e restore de diretórios |
| 🔌 **Energia** | Shutdown, reboot com confirmação |
| 🌐 **Navegador** | Abrir URLs, screenshots via Puppeteer |
| ⚠️ **Alertas** | Monitoramento automático com notificações |

---

## 🚀 Instalação Rápida

### Comando único (recomendado):

```bash
TELEGRAM_TOKEN="seu_token_aqui" \
ALLOWED_USERS="seu_chat_id" \
OLLAMA_MODEL="llama3.1:8b" \
bash -c "$(curl -fsSL https://raw.githubusercontent.com/empadacss/agente-ia-clawdbot12/main/bot/install.sh)"
```

### Ou manualmente:

```bash
git clone https://github.com/empadacss/agente-ia-clawdbot12.git
cd agente-ia-clawdbot12/bot
TELEGRAM_TOKEN="seu_token" ALLOWED_USERS="seu_id" ./install.sh
```

---

## 📱 Comandos Disponíveis

### 📊 Sistema
| Comando | Descrição |
|---------|-----------|
| `/status` | Status completo do sistema |
| `/cpu` | Uso da CPU e load |
| `/ram` | Uso de memória |
| `/temp` | Temperatura da CPU |
| `/disco` | Uso do disco |
| `/processos` | Top processos por RAM |
| `/uptime` | Tempo ligado |

### 💻 Terminal
| Comando | Descrição |
|---------|-----------|
| `/exec <cmd>` | Executar comando shell |
| `/ping <host>` | Testar conectividade |

### 📁 Arquivos
| Comando | Descrição |
|---------|-----------|
| `/ls <pasta>` | Listar diretório |
| `/cat <arquivo>` | Ver conteúdo |
| `/tail <arquivo>` | Últimas linhas |
| `/find <padrão>` | Buscar arquivos |
| `/pwd` | Diretório atual |

### 📍 GPIO
| Comando | Descrição |
|---------|-----------|
| `/gpio` | Status dos pinos exportados |
| `/gpio <pin> out <0\|1>` | Definir saída |
| `/gpio <pin> in` | Ler entrada |

### 🌐 Rede
| Comando | Descrição |
|---------|-----------|
| `/rede` | Informações completas |
| `/wifi` | Redes WiFi disponíveis |
| `/wificonnect <ssid> <senha>` | Conectar ao WiFi |
| `/ip` | IP público |

### ⚙️ Serviços
| Comando | Descrição |
|---------|-----------|
| `/servicos` | Listar serviços ativos |
| `/servico <nome> status` | Ver status |
| `/servico <nome> start` | Iniciar |
| `/servico <nome> stop` | Parar |
| `/servico <nome> restart` | Reiniciar |

### 🐳 Docker
| Comando | Descrição |
|---------|-----------|
| `/docker` | Listar containers |
| `/dockerimg` | Listar imagens |
| `/dockerctl <nome> start` | Iniciar container |
| `/dockerctl <nome> stop` | Parar container |
| `/dockerctl <nome> logs` | Ver logs |
| `/dockerrun <imagem>` | Criar container |

### ⏰ Automação
| Comando | Descrição |
|---------|-----------|
| `/cron` | Listar cron jobs |
| `/addcron "<schedule>" "<cmd>"` | Adicionar job |

### 📦 Backup
| Comando | Descrição |
|---------|-----------|
| `/backups` | Listar backups |
| `/backup <pasta>` | Criar backup |

### 🔌 Energia
| Comando | Descrição |
|---------|-----------|
| `/shutdown` | Desligar (com confirmação) |
| `/reboot` | Reiniciar (com confirmação) |
| `/confirmar` | Confirmar ação |
| `/cancelar` | Cancelar ação |

### 🌐 Navegador
| Comando | Descrição |
|---------|-----------|
| `/abrir <url>` | Abrir página |
| `/screenshot` | Capturar tela |
| `/fechar` | Fechar navegador |

### 💬 IA
| Comando | Descrição |
|---------|-----------|
| `/modelo` | Ver modelo atual |
| `/limpar` | Limpar histórico |
| *qualquer texto* | Conversar com a IA |

---

## ⚠️ Sistema de Alertas

O bot monitora automaticamente a cada 5 minutos:

- 🌡️ **Temperatura** > 70°C
- 🖥️ **CPU** > 90%
- 💾 **RAM** > 90%
- 💿 **Disco** > 90%

Alertas são enviados automaticamente para os usuários permitidos.

---

## 🔒 Segurança

### Comandos Bloqueados
- `rm -rf /`
- `mkfs`
- `dd if=/dev/zero of=/dev`
- Fork bombs

### Comandos com Confirmação
- `shutdown`, `reboot`
- `rm -rf`

### Controle de Acesso
Apenas IDs listados em `ALLOWED_USERS` podem usar o bot.

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
Environment="TELEGRAM_TOKEN=novo_token"
Environment="ALLOWED_USERS=123,456"
Environment="OLLAMA_MODEL=llama3.2:8b"
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

# Ver logs em tempo real
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

- **Hardware**: Orange Pi 6 Plus 32GB (ou similar ARM64 com RK3588)
- **RAM**: 8GB+ (32GB recomendado para modelos maiores)
- **OS**: Armbian / Ubuntu 22.04+
- **Rede**: Conexão com internet para Telegram

---

## 📄 Licença

MIT License - Use como quiser!

---

## 🙏 Créditos

- [Ollama](https://ollama.com/) - LLM local
- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) - Telegram API
- [Puppeteer](https://pptr.dev/) - Automação de navegador
