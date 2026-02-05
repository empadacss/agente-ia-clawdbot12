# 🧠 CLAUDE AGENT - Orange Pi 6 Plus

**Agente de IA de Próximo Nível** usando Claude API com Tool Use (Function Calling)

> Controle total da Orange Pi 6 Plus 32GB via Telegram usando a inteligência do Claude

---

## ✨ O que faz deste agente especial?

Este não é um bot comum. É um **agente de IA real** que:

- **🧠 Usa Claude API** - O modelo mais inteligente para entender comandos naturais
- **🔧 Tool Use nativo** - Claude chama ferramentas diretamente, sem parsing
- **👁️ Visão Computacional** - Analisa screenshots e entende o que está na tela
- **🤖 Modo Autônomo** - Executa sequências complexas de ações sozinho
- **💾 Memória** - Lembra do contexto da conversa

---

## 🎯 Capacidades

### 🖱️ Mouse
- Mover cursor para qualquer posição
- Clicar (esquerdo, direito, duplo, triplo)
- Scroll (cima, baixo)
- Arrastar elementos
- Obter posição atual

### ⌨️ Teclado
- Digitar qualquer texto
- Pressionar teclas (Enter, Esc, Tab, F1-F12...)
- Combos (Ctrl+C, Alt+Tab, Ctrl+Shift+Esc...)
- Atalhos pré-definidos (copiar, colar, salvar...)

### 🚀 Aplicativos
- Abrir qualquer programa
- Abrir URLs e arquivos
- Listar janelas abertas
- Focar, minimizar, maximizar, fechar janelas

### 🌐 Web e Pesquisa
- Pesquisar no Google
- Pesquisar no YouTube
- Pesquisar na Wikipedia
- Pesquisar no Maps
- Navegar em sites

### 📸 Tela
- Capturar screenshots
- Analisar visualmente (com Claude Vision)
- Obter resolução
- Informações da janela ativa

### 📊 Sistema
- Status (CPU, RAM, disco, temperatura)
- Executar comandos no terminal
- Listar processos
- Controlar serviços systemd

### 📍 GPIO
- Controlar pinos de saída
- Ler pinos de entrada
- Automação física

---

## 🚀 Instalação Rápida

### Pré-requisitos

1. **API Key do Claude** - Obtenha em [console.anthropic.com](https://console.anthropic.com/)
2. **Token do Telegram** - Crie um bot com [@BotFather](https://t.me/BotFather)
3. **Seu Chat ID** - Envie `/start` para [@userinfobot](https://t.me/userinfobot)

### Comando de Instalação

Cole este comando no terminal da Orange Pi:

```bash
export ANTHROPIC_API_KEY="SUA_API_KEY_AQUI"
export TELEGRAM_TOKEN="SEU_TOKEN_TELEGRAM"
export ALLOWED_USERS="SEU_CHAT_ID"

curl -fsSL https://raw.githubusercontent.com/empadacss/agente-ia-clawdbot12/main/scripts/install.sh | bash
```

### Exemplo Completo

```bash
export ANTHROPIC_API_KEY="sk-ant-api03-abc123..."
export TELEGRAM_TOKEN="8342604056:AAGgB6WDFzD..."
export ALLOWED_USERS="5075455416"

curl -fsSL https://raw.githubusercontent.com/empadacss/agente-ia-clawdbot12/main/scripts/install.sh | bash
```

---

## 💬 Como Usar

Simplesmente **converse naturalmente** com o bot no Telegram!

### Exemplos de comandos:

```
"Mova o mouse para o centro da tela"
"Clique no canto superior direito"
"Abra o navegador"
"Pesquise no Google: previsão do tempo"
"Tire um print da tela pra eu ver"
"Qual o status do sistema?"
"Pesquise no YouTube músicas relaxantes"
"Digite: Olá mundo!"
"Pressione Ctrl+C"
"Minimize essa janela"
"Liste todas as janelas abertas"
"Execute o comando: ls -la"
```

### Comandos Rápidos

| Comando | Descrição |
|---------|-----------|
| `/start` | Ajuda completa |
| `/tela` | Screenshot |
| `/status` | Status do sistema |
| `/janelas` | Listar janelas |
| `/limpar` | Limpar memória |
| `/auto <objetivo>` | Modo autônomo |

### Modo Autônomo

O agente pode executar sequências complexas sozinho:

```
/auto Abra o terminal, execute htop e tire um print
/auto Pesquise no Google "Orange Pi" e me mostre a tela
/auto Abra o navegador, vá para youtube.com e pesquise música
```

---

## 📁 Estrutura do Projeto

```
claude-agent/
├── index.js                 # Ponto de entrada principal
├── package.json
├── .env                     # Configurações (gerado na instalação)
├── src/
│   ├── agent/
│   │   └── claude-agent.js  # Classe principal do agente Claude
│   ├── tools/
│   │   └── index.js         # Todas as ferramentas (Tool Use)
│   └── telegram/
│       └── bot.js           # Interface Telegram
├── scripts/
│   └── install.sh           # Script de instalação
└── README.md
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `ANTHROPIC_API_KEY` | API Key do Claude | ✅ |
| `TELEGRAM_BOT_TOKEN` | Token do bot Telegram | ✅ |
| `TELEGRAM_ALLOWED_CHAT_ID` | IDs permitidos (separados por vírgula) | Opcional |
| `CLAUDE_MODEL` | Modelo a usar (padrão: claude-sonnet-4-20250514) | Opcional |

### Modelos Disponíveis

- `claude-sonnet-4-20250514` (recomendado - rápido e inteligente)
- `claude-opus-4-20250514` (mais inteligente, mais lento)
- `claude-3-5-sonnet-20241022` (anterior, mais barato)

---

## 🔧 Gerenciamento

### Ver status
```bash
sudo systemctl status claude-agent
```

### Ver logs
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

### Executar manualmente (debug)
```bash
cd ~/claude-agent
node index.js
```

---

## 🔒 Segurança

- Apenas usuários na lista `ALLOWED_USERS` podem usar o bot
- Comandos perigosos são bloqueados (rm -rf /, mkfs, etc)
- API key nunca é exposta nas respostas

---

## 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

## 📄 Licença

MIT License - Veja [LICENSE](LICENSE) para detalhes.

---

## 🙏 Créditos

- [Anthropic Claude API](https://anthropic.com)
- [Node Telegram Bot API](https://github.com/yagop/node-telegram-bot-api)
- [xdotool](https://github.com/jordansissel/xdotool)

---

**Feito com 🧠 usando Claude AI**
