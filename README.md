# 🤖 OrangePi 6 Plus - CONTROLE TOTAL

[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-blue.svg)](https://core.telegram.org/bots)
[![Ollama](https://img.shields.io/badge/Ollama-Local_LLM-orange.svg)](https://ollama.com/)

**Controle completo** da Orange Pi 6 Plus via Telegram com **foco em Mouse e Teclado**.

---

## ✨ Funcionalidades Principais

| Categoria | Funcionalidades |
|-----------|-----------------|
| 🖱️ **Mouse** | Mover, clicar, duplo clique, scroll, arrastar |
| ⌨️ **Teclado** | Digitar, teclas especiais, atalhos, combos |
| 📸 **Tela** | Screenshots em tempo real, listar janelas, focar |
| 🧠 **IA Local** | Chat com LLM via Ollama |
| 📍 **GPIO** | Controle de pinos físicos |
| 💻 **Sistema** | Monitoramento, comandos shell |

---

## 🚀 Instalação

```bash
TELEGRAM_TOKEN="seu_token" \
ALLOWED_USERS="seu_chat_id" \
OLLAMA_MODEL="llama3.1:8b" \
bash -c "$(curl -fsSL https://raw.githubusercontent.com/empadacss/agente-ia-clawdbot12/main/bot/install.sh)"
```

---

## 🖱️ Comandos de Mouse

| Comando | Descrição |
|---------|-----------|
| `/mouse X Y` | Mover para posição |
| `/mouse` | Ver posição atual |
| `/mrel X Y` | Movimento relativo |
| `/click` | Clique esquerdo |
| `/click r` | Clique direito |
| `/click X Y` | Clicar em posição |
| `/dclick` | Duplo clique |
| `/rclick` | Clique direito |
| `/scroll up` | Rolar para cima |
| `/scroll down` | Rolar para baixo |
| `/arrastar X1 Y1 X2 Y2` | Arrastar |

---

## ⌨️ Comandos de Teclado

| Comando | Descrição |
|---------|-----------|
| `/digitar texto` | Digitar texto |
| `/tecla enter` | Pressionar Enter |
| `/tecla esc` | Pressionar Escape |
| `/tecla tab` | Pressionar Tab |
| `/tecla ctrl+c` | Combo de teclas |
| `/atalho copiar` | Atalho pré-definido |
| `/atalhos` | Listar todos atalhos |

### Teclas Rápidas
| Comando | Tecla |
|---------|-------|
| `/enter` | Enter |
| `/esc` | Escape |
| `/tab` | Tab |
| `/space` | Espaço |
| `/backspace` | Backspace |

### Atalhos Pré-definidos
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
| `telaCheia` | F11 |

---

## 📸 Comandos de Tela

| Comando | Descrição |
|---------|-----------|
| `/tela` | Screenshot da tela |
| `/janelas` | Listar janelas abertas |
| `/focar nome` | Focar em janela |
| `/ativa` | Ver janela ativa |
| `/resolucao` | Ver resolução |

---

## 💻 Comandos de Sistema

| Comando | Descrição |
|---------|-----------|
| `/status` | Status do sistema |
| `/exec comando` | Executar comando |
| `/gpio N out 0/1` | Controlar GPIO |
| `/gpio N in` | Ler GPIO |

---

## 💬 IA Local

Envie qualquer mensagem para conversar com a IA!

A IA conhece todos os comandos e pode sugerir ações.

---

## 🔧 Requisitos

- **Hardware**: Orange Pi 6 Plus 32GB
- **OS**: Armbian / Ubuntu com desktop (X11)
- **Display**: Necessário para controle de mouse/teclado

---

## 🛠️ Gerenciamento

```bash
# Ver status
sudo systemctl status orangepi-bot

# Ver logs
sudo journalctl -u orangepi-bot -f

# Reiniciar
sudo systemctl restart orangepi-bot
```

---

## 📄 Licença

MIT License
