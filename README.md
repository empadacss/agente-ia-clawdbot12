# 🤖 Agente de IA Local - ClawdBot para Orange Pi 5 Plus

[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![Orange Pi](https://img.shields.io/badge/Orange%20Pi-5%20Plus-orange.svg)](http://www.orangepi.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Um agente de IA autônomo que roda **100% localmente** na sua Orange Pi 5 Plus 32GB, capaz de controlar, monitorar e automatizar praticamente qualquer tarefa no sistema.

---

## 🎯 O que este projeto faz?

- ✅ **Controle total do sistema** via comandos naturais em português
- ✅ **Monitoramento 24/7** de CPU, RAM, temperatura, disco e rede
- ✅ **Execução de comandos** shell de forma segura
- ✅ **Integração** com Telegram, WhatsApp, Discord
- ✅ **IA 100% local** usando Ollama (sem depender de APIs externas)
- ✅ **Skills customizáveis** para expandir funcionalidades
- ✅ **Interface web** para monitoramento visual

---

## 📋 Pré-requisitos

### Hardware
- **Orange Pi 5 Plus** com 32GB de RAM (recomendado)
- Cartão SD ou eMMC com pelo menos 64GB
- Fonte de alimentação adequada (5V/4A)
- Conexão de rede (Ethernet ou Wi-Fi)

### Software
- Sistema operacional: **Armbian** ou **Ubuntu 22.04+** para ARM64
- Conexão com internet (apenas para instalação inicial)

---

## 🚀 Instalação Rápida (Um Comando)

```bash
# Clone o repositório
git clone https://github.com/empadacss/agente-ia-clawdbot12.git
cd agente-ia-clawdbot12

# Execute o instalador automático
chmod +x scripts/install.sh
./scripts/install.sh
```

O script irá:
1. Instalar Node.js 22 via NVM
2. Instalar o ClawdBot globalmente
3. Configurar o Ollama com modelo de IA local
4. Criar serviços systemd para execução 24/7
5. Configurar as skills básicas

---

## 📁 Estrutura do Projeto

```
├── README.md                 # Este arquivo
├── package.json              # Dependências do projeto
├── .env.example              # Modelo de variáveis de ambiente
├── .gitignore                # Arquivos ignorados pelo Git
│
├── scripts/                  # Scripts de automação
│   ├── install.sh            # Instalação completa
│   ├── setup-ollama.sh       # Configuração do Ollama
│   ├── setup-service.sh      # Configuração dos serviços
│   └── health-check.sh       # Verificação de saúde
│
├── config/                   # Arquivos de configuração
│   ├── clawdbot.config.json  # Configuração principal
│   ├── skills.json           # Skills habilitadas
│   └── integrations.json     # Integrações configuradas
│
├── services/                 # Arquivos systemd
│   ├── clawdbot.service      # Serviço do ClawdBot
│   └── ollama.service        # Serviço do Ollama
│
├── skills/                   # Skills customizadas
│   ├── system-monitor.js     # Monitoramento do sistema
│   ├── file-manager.js       # Gerenciamento de arquivos
│   ├── network-tools.js      # Ferramentas de rede
│   └── gpio-control.js       # Controle de GPIO
│
├── prompts/                  # Prompts do sistema
│   └── system-prompt.md      # Personalidade do agente
│
└── docs/                     # Documentação
    ├── INSTALL.md            # Guia detalhado de instalação
    ├── CONFIGURATION.md      # Guia de configuração
    ├── TROUBLESHOOTING.md    # Solução de problemas
    └── SECURITY.md           # Práticas de segurança
```

---

## ⚙️ Configuração

### 1. Copiar variáveis de ambiente

```bash
cp .env.example .env
nano .env
```

### 2. Configurar modelo de IA

Edite `config/clawdbot.config.json`:

```json
{
  "llm": {
    "provider": "ollama",
    "model": "llama3.1:8b",
    "baseUrl": "http://localhost:11434"
  }
}
```

### 3. Configurar integrações (opcional)

Para Telegram, edite `config/integrations.json` e adicione seu token do BotFather.

---

## 🎮 Uso

### Iniciar manualmente

```bash
# Terminal 1: Iniciar Ollama
ollama serve

# Terminal 2: Iniciar ClawdBot
clawdbot dashboard
```

### Iniciar como serviço (24/7)

```bash
sudo systemctl start clawdbot
sudo systemctl start ollama

# Verificar status
sudo systemctl status clawdbot
```

### Acessar o Dashboard

Abra no navegador: `http://IP_DA_ORANGEPI:18789`

---

## 💬 Exemplos de Comandos

Uma vez configurado com Telegram/WhatsApp, você pode enviar comandos como:

| Comando | O que faz |
|---------|-----------|
| "Qual o uso de CPU?" | Mostra porcentagem de uso da CPU |
| "Quanta memória está livre?" | Exibe RAM disponível |
| "Qual a temperatura do processador?" | Lê sensores térmicos |
| "Liste os arquivos em /home" | Executa `ls /home` |
| "Reinicie o serviço nginx" | Executa `systemctl restart nginx` |
| "Faça backup da pasta projetos" | Cria arquivo tar.gz |
| "Qual meu IP público?" | Consulta IP externo |
| "Atualize o sistema" | Executa `apt update && apt upgrade` |

---

## 🛡️ Segurança

⚠️ **IMPORTANTE**: O ClawdBot tem acesso total ao sistema. Siga estas práticas:

1. **Nunca exponha** a porta 18789 diretamente na internet
2. Use **SSH tunnel** ou **VPN** para acesso remoto
3. Configure **senhas fortes** no Telegram/WhatsApp
4. Revise as **skills habilitadas** regularmente
5. Mantenha **backups** do sistema

Veja mais em [docs/SECURITY.md](docs/SECURITY.md)

---

## 🔧 Solução de Problemas

### Erro: "JavaScript heap out of memory"

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Ollama lento

```bash
# Use um modelo menor
ollama pull phi3:mini
```

### ClawdBot não inicia

```bash
# Verifique logs
journalctl -u clawdbot -f
```

Mais soluções em [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

## 📊 Monitoramento

O projeto inclui um script de health check:

```bash
./scripts/health-check.sh
```

Saída exemplo:
```
✅ ClawdBot: rodando
✅ Ollama: rodando  
✅ CPU: 23%
✅ RAM: 8.2GB / 32GB
✅ Temp: 45°C
✅ Disco: 34% usado
```

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Faça fork do projeto
2. Crie uma branch (`git checkout -b feature/nova-skill`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova skill'`)
4. Push para a branch (`git push origin feature/nova-skill`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 🙏 Agradecimentos

- [ClawdBot/MoltBot](https://github.com/clawdbot/clawdbot) - O framework base
- [Ollama](https://ollama.com/) - IA local simplificada
- [Orange Pi](http://www.orangepi.org/) - Hardware incrível

---

**Feito com ❤️ para a comunidade maker brasileira**
