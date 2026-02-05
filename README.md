# 🤖 CLAWDBOT AGENT - Orange Pi 6 Plus

[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-blue.svg)](https://core.telegram.org/bots)
[![Ollama](https://img.shields.io/badge/Ollama-Local_LLM-orange.svg)](https://ollama.com/)
[![Clawdbot](https://img.shields.io/badge/Clawdbot-Agent-purple.svg)](https://clawd.bot/)

**Agente de IA completo e 100% funcional** para controle total da Orange Pi 6 Plus via Telegram.

---

## ✨ Funcionalidades

| Categoria | O que faz |
|-----------|-----------|
| 🖱️ **Mouse** | Mover, clicar, duplo clique, scroll, arrastar |
| ⌨️ **Teclado** | Digitar, teclas especiais, combos (Ctrl+C), atalhos |
| 🚀 **Aplicativos** | Abrir apps, gerenciar janelas, minimizar, maximizar |
| 🌐 **Web/Pesquisa** | Google, YouTube, Wikipedia, Maps, Imagens |
| 📸 **Tela** | Screenshots, resolução, controle de janelas |
| 🧠 **IA Local** | Chat inteligente via Ollama |
| 📊 **Sistema** | CPU, RAM, temperatura, disco, processos |
| 📍 **GPIO** | Controle de pinos físicos |

---

## 🚀 Instalação Rápida

```bash
TELEGRAM_TOKEN="seu_token" \
ALLOWED_USERS="seu_chat_id" \
OLLAMA_MODEL="llama3.1:8b" \
bash -c "$(curl -fsSL https://raw.githubusercontent.com/empadacss/agente-ia-clawdbot12/main/scripts/install.sh)"
```

---

## 📱 Comandos

### 🖱️ Mouse
| Comando | Descrição |
|---------|-----------|
| `/mouse X Y` | Mover para posição |
| `/mrel X Y` | Movimento relativo |
| `/click` | Clique esquerdo |
| `/click r` | Clique direito |
| `/dclick` | Duplo clique |
| `/scroll up/down` | Rolar |
| `/arrastar X1 Y1 X2 Y2` | Arrastar |

### ⌨️ Teclado
| Comando | Descrição |
|---------|-----------|
| `/digitar texto` | Digitar texto |
| `/tecla enter` | Pressionar tecla |
| `/tecla ctrl+c` | Combo de teclas |
| `/atalho copiar` | Atalho pré-definido |
| `/atalhos` | Listar atalhos |
| `/enter` `/esc` `/tab` | Teclas rápidas |

### 🚀 Aplicativos
| Comando | Descrição |
|---------|-----------|
| `/abrir navegador` | Abrir aplicativo |
| `/apps` | Listar apps disponíveis |
| `/janelas` | Listar janelas abertas |
| `/focar Chrome` | Focar em janela |
| `/minimizar` | Minimizar janela |
| `/maximizar` | Maximizar janela |
| `/fecharjanela` | Fechar janela ativa |

### 🌐 Pesquisa
| Comando | Descrição |
|---------|-----------|
| `/pesquisar termo` | Pesquisar no Google |
| `/youtube termo` | Pesquisar no YouTube |
| `/wikipedia termo` | Pesquisar na Wikipedia |
| `/maps local` | Pesquisar no Google Maps |
| `/imagens termo` | Pesquisar imagens |

### 📸 Tela
| Comando | Descrição |
|---------|-----------|
| `/tela` | Screenshot |
| `/resolucao` | Ver resolução |
| `/desktop` | Mostrar desktop |

### 📊 Sistema
| Comando | Descrição |
|---------|-----------|
| `/status` | Status completo |
| `/cpu` `/ram` `/temp` `/disco` | Métricas |
| `/processos` | Top processos |
| `/exec comando` | Executar comando |

### 💬 IA
Envie qualquer mensagem para conversar com a IA!

---

## ⌨️ Atalhos Disponíveis

| Nome | Combo |
|------|-------|
| `copiar` | Ctrl+C |
| `colar` | Ctrl+V |
| `cortar` | Ctrl+X |
| `desfazer` | Ctrl+Z |
| `salvar` | Ctrl+S |
| `selecionartudo` | Ctrl+A |
| `fechar` | Alt+F4 |
| `alternar` | Alt+Tab |
| `desktop` | Super+D |
| `terminal` | Ctrl+Alt+T |
| `buscar` | Ctrl+F |
| `novaguia` | Ctrl+T |
| `atualizar` | F5 |
| `telacheia` | F11 |

---

## 🛠️ Gerenciamento

```bash
# Ver status
sudo systemctl status clawdbot-agent

# Ver logs
sudo journalctl -u clawdbot-agent -f

# Reiniciar
sudo systemctl restart clawdbot-agent

# Parar
sudo systemctl stop clawdbot-agent
```

---

## 📋 Requisitos

- **Hardware**: Orange Pi 6 Plus 32GB
- **OS**: Armbian / Ubuntu com desktop (X11)
- **Display**: Necessário para controle de mouse/teclado

---

## 📄 Licença

MIT License
