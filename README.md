# 🤖 Claude Agent - Orange Pi 6 Plus

**Agente Autônomo de Nível Profissional**

Um agente de IA completo e autônomo powered by **Claude API** com **Tool Use** e **Vision**, capaz de controlar totalmente sua Orange Pi 6 Plus via Telegram.

---

## 🌟 Características

### 🧠 Inteligência Real
- **Claude API** - O cérebro mais avançado disponível
- **Tool Use** - Claude decide e executa ações automaticamente
- **Vision** - Analisa screenshots para verificar resultados
- **Raciocínio Multi-step** - Planeja e executa tarefas complexas
- **Memória Persistente** - Lembra de interações anteriores

### 🖱️ Controle de Mouse
- Mover cursor para qualquer posição (x, y)
- Clique esquerdo, direito e duplo
- Scroll para cima e para baixo
- Arrastar elementos (drag and drop)
- Obter posição atual do cursor

### ⌨️ Controle de Teclado
- Digitar texto
- Pressionar teclas especiais (Enter, Esc, Tab, F1-F12, etc)
- Combos de teclas (Ctrl+C, Ctrl+V, Alt+Tab, Super+D)
- Atalhos personalizados

### 🚀 Aplicativos
- Abrir qualquer programa pelo nome
- Listar janelas abertas
- Focar em janelas específicas
- Minimizar, maximizar, fechar janelas
- Executar comandos no terminal

### 🌐 Web e Pesquisa
- Navegar para URLs
- Pesquisa Google
- Pesquisa YouTube
- Interagir com páginas web

### 📸 Visão Computacional
- Capturar screenshots
- Analisar o que está na tela
- Verificar resultados de ações
- Processar imagens enviadas pelo usuário

### 📊 Sistema
- Status completo (CPU, RAM, Disco, Temperatura)
- Executar comandos
- Gerenciar arquivos
- Monitoramento em tempo real

---

## ⚡ Instalação Rápida

```bash
# Substitua pelos seus valores
TELEGRAM_TOKEN="seu_token_telegram" \
ANTHROPIC_API_KEY="sua_chave_claude" \
ALLOWED_USERS="seu_chat_id" \
bash -c "$(curl -fsSL https://raw.githubusercontent.com/empadacss/agente-ia-clawdbot12/main/scripts/install.sh)"
```

### Obter suas credenciais:

1. **Telegram Bot Token**: Fale com [@BotFather](https://t.me/BotFather) e crie um bot
2. **Anthropic API Key**: Acesse [console.anthropic.com](https://console.anthropic.com/)
3. **Chat ID**: Fale com [@userinfobot](https://t.me/userinfobot)

---

## 📖 Como Usar

Apenas envie mensagens naturais descrevendo o que você quer:

### Exemplos

| Comando | O que o agente faz |
|---------|-------------------|
| "Abra o navegador e pesquise sobre IA" | Abre Chrome, navega para Google, pesquisa |
| "Tire um screenshot" | Captura e envia a tela atual |
| "Abra o terminal e execute htop" | Abre terminal, digita htop, executa |
| "Qual o status do sistema?" | Mostra CPU, RAM, Disco, Temperatura |
| "Minimize todas as janelas" | Pressiona Super+D para mostrar desktop |
| "Abra YouTube e pesquise música" | Navega para YouTube e pesquisa |
| "Mova o mouse para 500, 300 e clique" | Move e clica na posição |
| "Digite 'Hello World' e pressione Enter" | Digita o texto e pressiona Enter |

### Comandos Rápidos

| Comando | Descrição |
|---------|-----------|
| `/start` ou `/help` | Mostra ajuda |
| `/tela` | Screenshot rápido |
| `/status` | Status do sistema |
| `/exec <cmd>` | Executar comando |
| `/limpar` | Limpar histórico |

---

## 🏗️ Arquitetura

```
claude-agent/
├── index.js              # Ponto de entrada principal
├── agent/
│   ├── core.js           # Núcleo do agente com loop agentic
│   ├── tools.js          # Implementação de todas as ferramentas
│   └── memory.js         # Sistema de memória persistente
├── data/
│   └── memory.json       # Memória persistente
├── scripts/
│   └── install.sh        # Script de instalação
├── .env                  # Configurações (gerado na instalação)
└── package.json
```

### Fluxo de Funcionamento

1. **Usuário envia mensagem** no Telegram
2. **Claude recebe** a mensagem com contexto e ferramentas disponíveis
3. **Claude decide** quais ferramentas usar e em que ordem
4. **Agente executa** cada ferramenta e envia resultado de volta
5. **Claude analisa** os resultados (incluindo screenshots)
6. **Loop continua** até a tarefa estar completa
7. **Resposta final** é enviada ao usuário

---

## 🔧 Ferramentas Disponíveis

### Mouse
| Ferramenta | Descrição |
|------------|-----------|
| `mouse_move` | Move cursor para (x, y) |
| `mouse_click` | Clica (left/right/middle) |
| `mouse_click_at` | Move e clica em (x, y) |
| `mouse_scroll` | Scroll up/down |
| `mouse_drag` | Arrasta de A para B |
| `mouse_position` | Retorna posição atual |

### Teclado
| Ferramenta | Descrição |
|------------|-----------|
| `type_text` | Digita texto |
| `press_key` | Pressiona tecla |
| `press_combo` | Combo (ctrl+c) |

### Aplicativos
| Ferramenta | Descrição |
|------------|-----------|
| `open_application` | Abre programa |
| `open_url` | Abre URL |
| `run_command` | Executa comando |
| `list_windows` | Lista janelas |
| `focus_window` | Foca janela |
| `close_window` | Fecha janela |
| `minimize_window` | Minimiza |
| `maximize_window` | Maximiza |

### Tela
| Ferramenta | Descrição |
|------------|-----------|
| `take_screenshot` | Captura tela (usado para verificar) |
| `get_screen_resolution` | Resolução |
| `get_active_window` | Janela ativa |

### Sistema
| Ferramenta | Descrição |
|------------|-----------|
| `get_system_status` | Status completo |
| `list_files` | Lista diretório |
| `read_file` | Lê arquivo |
| `write_file` | Escreve arquivo |

### Utilidades
| Ferramenta | Descrição |
|------------|-----------|
| `wait` | Aguarda N segundos |

---

## ⚙️ Configuração

### Variáveis de Ambiente (.env)

```env
# Telegram
TELEGRAM_BOT_TOKEN=seu_token
ALLOWED_USERS=seu_chat_id

# Claude
ANTHROPIC_API_KEY=sua_chave
CLAUDE_MODEL=claude-sonnet-4-20250514
MAX_TOKENS=8192
MAX_ITERATIONS=20
```

### Modelos Claude Disponíveis

| Modelo | Descrição |
|--------|-----------|
| `claude-sonnet-4-20250514` | Balanceado (recomendado) |
| `claude-opus-4-20250514` | Mais capaz, mais lento |
| `claude-3-5-haiku-20241022` | Mais rápido, econômico |

---

## 📊 Gerenciamento

### Ver Status
```bash
sudo systemctl status claude-agent
```

### Ver Logs
```bash
sudo journalctl -u claude-agent -f
```

### Reiniciar
```bash
sudo systemctl restart claude-agent
```

### Parar
```bash
sudo systemctl stop claude-agent
```

---

## 🔐 Segurança

- **ALLOWED_USERS**: Restrinja o acesso apenas ao seu chat ID
- **API Keys**: Nunca compartilhe suas chaves
- **Sudoers**: Comandos sensíveis requerem confirmação

---

## 🚀 Performance

O agente foi otimizado para Orange Pi 6 Plus (32GB):
- Loop agentic eficiente
- Memória persistente em JSON
- Screenshots comprimidos
- Timeout em comandos longos

---

## 📝 Licença

MIT License

---

## 🤝 Contribuições

Pull requests são bem-vindos!

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

**Desenvolvido com ❤️ para Orange Pi 6 Plus**
