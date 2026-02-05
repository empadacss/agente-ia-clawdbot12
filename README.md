# 🤖 CLAUDE AGENT - Orange Pi 6 Plus

**Agente de IA de Nível Empresarial** para controle total da Orange Pi 6 Plus via Telegram.

Powered by **Claude API (Anthropic)** com **Computer Use**.

---

## 🚀 Instalação Rápida

```bash
ANTHROPIC_API_KEY="sua_api_key" \
TELEGRAM_TOKEN="seu_token" \
ALLOWED_USERS="seu_chat_id" \
bash -c "$(curl -fsSL https://raw.githubusercontent.com/empadacss/agente-ia-clawdbot12/main/scripts/install.sh)"
```

---

## ✨ O Que Este Agente Faz

### 🧠 Inteligência Avançada
- **Claude Sonnet** como cérebro
- Entende linguagem natural
- Executa tarefas complexas autonomamente
- Planeja e executa múltiplos passos

### 🖥️ Computer Use
- **Ver a tela** através de screenshots
- **Controlar mouse**: mover, clicar, arrastar
- **Controlar teclado**: digitar, atalhos
- Claude decide onde clicar baseado no que vê

### 💻 Terminal Completo
- Executar qualquer comando bash
- Instalar pacotes
- Gerenciar serviços
- Monitorar sistema

### 📝 Editor de Arquivos
- Criar arquivos
- Editar código
- Substituir texto
- Modificar configurações

### 🌐 Navegador Web
- Pesquisar no Google/YouTube
- Navegar em sites
- Automatizar tarefas web
- Capturar screenshots de páginas

---

## 📱 Comandos do Telegram

| Comando | Descrição |
|---------|-----------|
| `/start` | Iniciar e ver ajuda |
| `/screenshot` | Capturar tela |
| `/status` | Status do agente e sistema |
| `/clear` | Limpar histórico |
| `/stop` | Parar tarefa atual |

---

## 💬 Exemplos de Uso

```
"Abra o navegador e pesquise sobre Linux"
"Crie um arquivo Python que calcule fatorial"
"Mostre o uso de CPU e memória"
"Instale o Docker"
"Abra o terminal e execute htop"
"Clique no menu e abra configurações"
"Tire um screenshot e me diga o que está na tela"
"Crie uma pasta chamada projetos e um arquivo README dentro"
```

---

## ⚙️ Configuração

### 1. Obter API Key da Anthropic

1. Acesse [console.anthropic.com](https://console.anthropic.com/)
2. Crie uma conta ou faça login
3. Vá em "API Keys"
4. Crie uma nova key
5. Copie a key (começa com `sk-ant-`)

### 2. Criar Bot no Telegram

1. Abra o Telegram e busque `@BotFather`
2. Envie `/newbot`
3. Escolha um nome e username
4. Copie o token

### 3. Obter seu Chat ID

1. Abra o Telegram e busque `@userinfobot`
2. Envie `/start`
3. Copie seu ID numérico

---

## 🔧 Gerenciamento

```bash
# Ver status
sudo systemctl status claude-agent

# Ver logs
sudo journalctl -u claude-agent -f

# Reiniciar
sudo systemctl restart claude-agent

# Parar
sudo systemctl stop claude-agent

# Iniciar
sudo systemctl start claude-agent
```

---

## 📁 Estrutura do Projeto

```
claude-agent/
├── index.js              # Ponto de entrada principal
├── package.json          # Dependências
├── .env                  # Configurações (criado na instalação)
├── src/
│   ├── core/
│   │   └── agent.js      # Motor do agente Claude
│   └── tools/
│       ├── computer.js   # Computer Use (mouse/teclado/tela)
│       ├── bash.js       # Execução de comandos
│       ├── editor.js     # Edição de arquivos
│       └── browser.js    # Navegação web
└── scripts/
    └── install.sh        # Script de instalação
```

---

## 🛠️ Ferramentas do Claude

O agente tem acesso às seguintes ferramentas:

### computer
Controle completo do computador:
- `screenshot` - Capturar tela
- `mouse_move` - Mover cursor
- `left_click` - Clicar
- `double_click` - Duplo clique
- `type` - Digitar texto
- `key` - Pressionar teclas
- `scroll` - Rolar página

### bash
Executar comandos no terminal

### str_replace_editor
- `view` - Ver arquivo
- `create` - Criar arquivo
- `str_replace` - Substituir texto
- `insert` - Inserir linha

### browser
- `navigate` - Navegar para URL
- `search` - Pesquisar no Google
- `youtube` - Pesquisar no YouTube
- `screenshot` - Screenshot da página
- `click` - Clicar em elemento
- `type` - Digitar em campo

---

## 📋 Requisitos

### Hardware
- Orange Pi 6 Plus (32GB RAM recomendado)
- Processador RK3588
- Ambiente gráfico (X11)

### Software
- Ubuntu/Debian para Orange Pi
- Node.js 20+
- Chromium Browser

### Rede
- Conexão com internet
- Acesso à API da Anthropic

---

## 🔐 Segurança

- Apenas usuários autorizados podem usar o bot
- Comandos destrutivos são bloqueados
- API key armazenada localmente
- Comunicação via Telegram criptografada

---

## 💰 Custos

Este agente usa a API paga da Anthropic:
- Claude Sonnet: ~$3/$15 por milhão de tokens (input/output)
- Uso típico: ~$0.01-0.10 por conversa
- Screenshots contam como tokens de imagem

Monitore seu uso em [console.anthropic.com](https://console.anthropic.com/)

---

## 🆘 Solução de Problemas

### Agente não responde
```bash
sudo journalctl -u claude-agent -n 50 --no-pager
```

### Erro de API Key
Verifique se a key está correta no `.env`

### Erro de Display
```bash
export DISPLAY=:0
xhost +local:
```

### Screenshots não funcionam
```bash
sudo apt install scrot xdotool
```

---

## 📄 Licença

MIT License

---

## 🤝 Contribuição

Pull requests são bem-vindos!

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

**Desenvolvido para Orange Pi 6 Plus** 🍊

*Powered by Claude (Anthropic)*
