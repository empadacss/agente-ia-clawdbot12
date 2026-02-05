# CLAUDE AGENT - Orange Pi 6 Plus

Agente de IA autonomo para controle total da Orange Pi 6 Plus via Telegram, powered by **Claude API** com **Computer Use**.

## Instalacao

```bash
ANTHROPIC_API_KEY="sk-ant-..." \
TELEGRAM_TOKEN="123:ABC..." \
ALLOWED_USERS="seu_chat_id" \
bash -c "$(curl -fsSL https://raw.githubusercontent.com/empadacss/agente-ia-clawdbot12/main/scripts/install.sh)"
```

## Capacidades

| Ferramenta | O que faz |
|-----------|-----------|
| **computer** | Ve a tela via screenshot, controla mouse e teclado |
| **bash** | Executa qualquer comando no terminal |
| **editor** | Cria e edita arquivos |
| **browser** | Navega na internet, pesquisa, extrai conteudo |

O Claude decide autonomamente quais ferramentas usar para completar sua solicitacao.
Ele pode encadear ate 25 acoes por mensagem.

## Comandos Telegram

| Comando | Descricao |
|---------|-----------|
| `/start` | Ajuda |
| `/screenshot` | Captura tela |
| `/status` | Status do agente e sistema |
| `/clear` | Limpa historico |
| `/stop` | Cancela tarefa |

Fora dos comandos, qualquer mensagem em linguagem natural sera processada pelo agente.

## Exemplos

```
"Abra o navegador e pesquise sobre Orange Pi"
"Crie um script Python que calcule fatorial"
"Instale o Docker"
"Tire um screenshot e me diga o que esta na tela"
"Abra o terminal e rode htop"
```

Voce tambem pode enviar **fotos** para o agente analisar.

## Configuracao

### API Key da Anthropic
1. Acesse [console.anthropic.com](https://console.anthropic.com/)
2. Crie uma API Key (comeca com `sk-ant-`)

### Bot do Telegram
1. Fale com `@BotFather` no Telegram
2. Crie um bot com `/newbot`
3. Copie o token

### Chat ID
1. Fale com `@userinfobot` no Telegram
2. Copie seu ID numerico

## Estrutura

```
claude-agent/
  index.js            # Entrada principal + Telegram
  package.json
  .env                # Configuracoes (criado na instalacao)
  src/
    core/
      agent.js        # Motor do agente (agentic loop)
    tools/
      computer.js     # Mouse, teclado, screenshots
      bash.js         # Terminal
      editor.js       # Edicao de arquivos
      browser.js      # Navegacao web
  scripts/
    install.sh        # Instalador
```

## Gerenciamento

```bash
sudo systemctl status claude-agent     # Status
sudo journalctl -u claude-agent -f     # Logs
sudo systemctl restart claude-agent    # Reiniciar
sudo systemctl stop claude-agent       # Parar
```

## Custos

Claude Sonnet: ~$3/$15 por milhao de tokens (input/output).
Uso tipico: $0.01-0.10 por conversa.

## Licenca

MIT
