# 🛡️ Guia de Segurança

Este guia apresenta as melhores práticas de segurança para operar o Agente de IA ClawdBot.

## ⚠️ Aviso Importante

> **O ClawdBot tem acesso ao seu sistema operacional.** Se mal configurado, pode executar comandos que causem danos. Siga este guia cuidadosamente.

---

## 📋 Índice

1. [Riscos e Mitigações](#-riscos-e-mitigações)
2. [Configuração Segura](#-configuração-segura)
3. [Acesso Remoto](#-acesso-remoto)
4. [Integrações Seguras](#-integrações-seguras)
5. [Monitoramento](#-monitoramento)
6. [Checklist de Segurança](#-checklist-de-segurança)

---

## 🎯 Riscos e Mitigações

### Riscos Potenciais

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Execução de comandos maliciosos | 🔴 Crítico | Blacklist de comandos |
| Acesso não autorizado | 🔴 Crítico | Autenticação + IPs permitidos |
| Exposição de dados sensíveis | 🟠 Alto | Restringir paths de arquivos |
| Denial of Service | 🟡 Médio | Rate limiting |
| Modificação de configs do sistema | 🟠 Alto | Permissões limitadas |

### Modelo de Ameaças

1. **Atacante externo** - Acesso via rede
2. **Usuário malicioso** - Via integrações (Telegram/WhatsApp)
3. **Prompt injection** - Manipulação do LLM

---

## 🔒 Configuração Segura

### 1. Blacklist de Comandos

Edite `config/skills.json`:

```json
{
  "skills": {
    "shell-executor": {
      "config": {
        "blockedCommands": [
          "rm -rf /",
          "rm -rf /*",
          "rm -rf ~",
          "mkfs",
          "dd if=/dev/zero",
          "dd if=/dev/random",
          ":(){ :|:& };:",
          "chmod -R 777 /",
          "chmod -R 000 /",
          "chown -R",
          "mv /* /dev/null",
          "wget -O- | sh",
          "curl | sh",
          "shutdown",
          "reboot",
          "halt",
          "poweroff",
          "init 0",
          "init 6",
          "> /etc/passwd",
          "> /etc/shadow",
          "passwd",
          "useradd",
          "userdel",
          "visudo",
          "crontab -r"
        ],
        "allowSudo": false
      }
    }
  }
}
```

### 2. Restringir Acesso a Arquivos

```json
{
  "skills": {
    "file-manager": {
      "config": {
        "allowedPaths": [
          "/home/seu_usuario/projetos",
          "/tmp",
          "/var/log/clawdbot"
        ],
        "blockedPaths": [
          "/etc",
          "/root",
          "/boot",
          "/sys",
          "/proc",
          "/.ssh",
          "/.gnupg"
        ],
        "blockedExtensions": [
          ".key",
          ".pem",
          ".p12",
          ".pfx",
          ".crt",
          ".ssh"
        ]
      }
    }
  }
}
```

### 3. Autenticação

```json
{
  "security": {
    "authentication": {
      "enabled": true,
      "type": "password",
      "password": "USE_UMA_SENHA_FORTE_AQUI"
    }
  }
}
```

Use senha forte:
```bash
# Gerar senha aleatória
openssl rand -base64 32
```

### 4. Restrição de IPs

```json
{
  "security": {
    "allowedIPs": [
      "127.0.0.1",
      "::1",
      "192.168.1.0/24"
    ]
  }
}
```

### 5. Rate Limiting

```json
{
  "security": {
    "rateLimiting": {
      "enabled": true,
      "maxRequests": 60,
      "windowMs": 60000
    }
  }
}
```

---

## 🌐 Acesso Remoto

### ❌ NÃO FAÇA

```bash
# NUNCA exponha diretamente na internet
clawdbot gateway --host 0.0.0.0  # PERIGO se sem firewall
```

### ✅ FAÇA

#### Opção 1: SSH Tunnel (Recomendado)

No seu computador:
```bash
ssh -L 18789:localhost:18789 usuario@ip_orangepi
```

Depois acesse `http://localhost:18789`

#### Opção 2: VPN (WireGuard)

```bash
# Na Orange Pi
sudo apt install wireguard

# Configurar VPN
# Depois acesse via IP da VPN
```

#### Opção 3: Tailscale

```bash
# Instalação simples
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Acesse via IP do Tailscale
```

### Firewall

```bash
# Permitir apenas SSH e rede local
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow from 192.168.1.0/24 to any port 18789
sudo ufw enable
```

---

## 📱 Integrações Seguras

### Telegram

```json
{
  "integrations": {
    "telegram": {
      "config": {
        "allowedChatIds": ["SEU_CHAT_ID"],
        "adminChatIds": ["SEU_CHAT_ID"],
        "rateLimit": {
          "messagesPerMinute": 10
        }
      }
    }
  }
}
```

**Como obter seu Chat ID**:
1. Fale com [@userinfobot](https://t.me/userinfobot)
2. Ele mostrará seu ID
3. Adicione APENAS seu ID na lista

### WhatsApp

```json
{
  "integrations": {
    "whatsapp": {
      "config": {
        "allowedNumbers": ["+5511999999999"],
        "adminNumbers": ["+5511999999999"]
      }
    }
  }
}
```

### Webhooks

```json
{
  "integrations": {
    "webhook": {
      "config": {
        "inbound": {
          "secret": "SEGREDO_LONGO_E_ALEATORIO",
          "allowedIPs": ["127.0.0.1"]
        }
      }
    }
  }
}
```

---

## 👁️ Monitoramento

### Logs de Segurança

```bash
# Monitorar logs em tempo real
journalctl -u clawdbot -f | grep -E "(ERROR|WARN|auth|denied)"

# Salvar logs de segurança
journalctl -u clawdbot --since "1 hour ago" > security.log
```

### Alertas de Segurança

```json
{
  "notifications": {
    "events": {
      "authFailure": {
        "enabled": true,
        "message": "🚨 Tentativa de acesso não autorizado!",
        "priority": "critical"
      },
      "blockedCommand": {
        "enabled": true,
        "message": "⚠️ Comando bloqueado: {{command}}",
        "priority": "warning"
      }
    }
  }
}
```

### Auditoria de Comandos

Habilite logging detalhado:

```json
{
  "logging": {
    "level": "debug",
    "file": {
      "enabled": true,
      "path": "./logs/audit.log"
    }
  }
}
```

---

## ✅ Checklist de Segurança

### Antes de Colocar em Produção

- [ ] Senha forte configurada no dashboard
- [ ] IPs permitidos configurados
- [ ] Blacklist de comandos revisada
- [ ] Paths de arquivos restritos
- [ ] Rate limiting habilitado
- [ ] Firewall configurado
- [ ] SSH com chave (desabilitar senha)
- [ ] Atualizações automáticas configuradas
- [ ] Backup configurado
- [ ] Logs habilitados e monitorados

### Manutenção Regular

- [ ] Verificar logs semanalmente
- [ ] Atualizar sistema mensalmente
- [ ] Revisar permissões trimestralmente
- [ ] Rotacionar tokens/senhas semestralmente
- [ ] Testar backups periodicamente

### Em Caso de Incidente

1. **Isolar**: `sudo systemctl stop clawdbot`
2. **Preservar logs**: `cp -r /var/log/clawdbot ./incident-$(date +%Y%m%d)`
3. **Analisar**: Revisar logs e comandos executados
4. **Remediar**: Corrigir configurações
5. **Rotacionar**: Mudar todas as senhas e tokens
6. **Documentar**: Registrar o incidente

---

## 🔐 Configuração Mínima Segura

Para começar com segurança, use esta configuração:

```json
{
  "security": {
    "authentication": {
      "enabled": true,
      "password": "SUA_SENHA_FORTE"
    },
    "allowedIPs": ["127.0.0.1"],
    "rateLimiting": {
      "enabled": true,
      "maxRequests": 30,
      "windowMs": 60000
    }
  },
  "skills": {
    "shell-executor": {
      "enabled": true,
      "config": {
        "allowSudo": false,
        "timeout": 30000
      }
    },
    "package-manager": {
      "enabled": false
    }
  }
}
```

---

## 📚 Recursos Adicionais

- [OWASP - Segurança de Aplicações](https://owasp.org/)
- [Hardening Linux](https://www.cyberciti.biz/tips/linux-security.html)
- [SSH Security Best Practices](https://www.ssh.com/academy/ssh/security)

---

> **Lembre-se**: Segurança é um processo contínuo, não um destino. Mantenha-se atualizado e vigilante!
