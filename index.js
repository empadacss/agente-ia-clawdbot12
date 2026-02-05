#!/usr/bin/env node

/**
 * ============================================
 * Agente de IA Local - ClawdBot
 * Orange Pi 5 Plus 32GB Edition
 * ============================================
 * 
 * Ponto de entrada principal do projeto.
 * Execute com: node index.js [comando]
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Banner
const banner = `
${colors.cyan}╔════════════════════════════════════════════════════════╗
║                                                          ║
║   🤖 ${colors.bright}AGENTE DE IA LOCAL - CLAWDBOT${colors.reset}${colors.cyan}                    ║
║      Orange Pi 5 Plus 32GB Edition                       ║
║                                                          ║
╚════════════════════════════════════════════════════════╝${colors.reset}
`;

// Comandos disponíveis
const commands = {
  start: {
    description: 'Inicia o ClawdBot (gateway + dashboard)',
    handler: startClawdBot
  },
  dashboard: {
    description: 'Inicia apenas o dashboard',
    handler: startDashboard
  },
  gateway: {
    description: 'Inicia apenas o gateway',
    handler: startGateway
  },
  status: {
    description: 'Mostra status dos serviços',
    handler: showStatus
  },
  health: {
    description: 'Executa health check',
    handler: runHealthCheck
  },
  test: {
    description: 'Testa todas as skills',
    handler: testSkills
  },
  install: {
    description: 'Executa instalação completa',
    handler: runInstall
  },
  logs: {
    description: 'Mostra logs do ClawdBot',
    handler: showLogs
  },
  help: {
    description: 'Mostra esta ajuda',
    handler: showHelp
  }
};

// Funções auxiliares
function log(message, type = 'info') {
  const icons = {
    info: `${colors.blue}ℹ️ `,
    success: `${colors.green}✅`,
    warning: `${colors.yellow}⚠️ `,
    error: `${colors.red}❌`
  };
  console.log(`${icons[type]} ${message}${colors.reset}`);
}

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// Comandos
async function startClawdBot() {
  log('Iniciando Agente de IA...', 'info');
  
  // Verificar se ClawdBot está instalado
  try {
    await execPromise('which clawdbot');
  } catch {
    log('ClawdBot não encontrado. Execute: npm install -g clawdbot', 'error');
    process.exit(1);
  }
  
  // Iniciar gateway
  log('Iniciando gateway na porta 18789...', 'info');
  const gateway = spawn('clawdbot', ['gateway', '--port', '18789'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' }
  });
  
  gateway.on('error', (err) => {
    log(`Erro ao iniciar gateway: ${err.message}`, 'error');
  });
  
  // Aguardar Ctrl+C
  process.on('SIGINT', () => {
    log('Encerrando...', 'warning');
    gateway.kill();
    process.exit(0);
  });
}

async function startDashboard() {
  log('Iniciando dashboard...', 'info');
  
  const dashboard = spawn('clawdbot', ['dashboard'], {
    stdio: 'inherit'
  });
  
  dashboard.on('error', (err) => {
    log(`Erro ao iniciar dashboard: ${err.message}`, 'error');
  });
}

async function startGateway() {
  log('Iniciando gateway...', 'info');
  
  const gateway = spawn('clawdbot', ['gateway', '--port', '18789'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' }
  });
  
  gateway.on('error', (err) => {
    log(`Erro ao iniciar gateway: ${err.message}`, 'error');
  });
}

async function showStatus() {
  console.log(banner);
  log('Verificando status dos serviços...', 'info');
  console.log('');
  
  // Verificar ClawdBot
  try {
    const { stdout: clawdbotStatus } = await execPromise('systemctl is-active clawdbot 2>/dev/null || echo "não instalado"');
    const status = clawdbotStatus.trim();
    if (status === 'active') {
      log('ClawdBot: rodando', 'success');
    } else {
      log(`ClawdBot: ${status}`, 'warning');
    }
  } catch {
    log('ClawdBot: serviço não configurado', 'warning');
  }
  
  // Verificar Ollama
  try {
    const { stdout: ollamaStatus } = await execPromise('systemctl is-active ollama 2>/dev/null || echo "não instalado"');
    const status = ollamaStatus.trim();
    if (status === 'active') {
      log('Ollama: rodando', 'success');
    } else {
      log(`Ollama: ${status}`, 'warning');
    }
  } catch {
    log('Ollama: serviço não configurado', 'warning');
  }
  
  // Verificar porta
  try {
    await execPromise('ss -tlnp 2>/dev/null | grep :18789');
    log('Porta 18789: aberta', 'success');
  } catch {
    log('Porta 18789: fechada', 'warning');
  }
  
  console.log('');
}

async function runHealthCheck() {
  const scriptPath = path.join(__dirname, 'scripts', 'health-check.sh');
  
  if (!fs.existsSync(scriptPath)) {
    log('Script de health check não encontrado', 'error');
    return;
  }
  
  const healthCheck = spawn('bash', [scriptPath], {
    stdio: 'inherit'
  });
  
  healthCheck.on('error', (err) => {
    log(`Erro ao executar health check: ${err.message}`, 'error');
  });
}

async function testSkills() {
  log('Testando skills...', 'info');
  
  const testPath = path.join(__dirname, 'skills', 'test-all.js');
  
  if (!fs.existsSync(testPath)) {
    log('Script de teste não encontrado', 'error');
    return;
  }
  
  const test = spawn('node', [testPath], {
    stdio: 'inherit'
  });
  
  test.on('error', (err) => {
    log(`Erro ao executar testes: ${err.message}`, 'error');
  });
}

async function runInstall() {
  const scriptPath = path.join(__dirname, 'scripts', 'install.sh');
  
  if (!fs.existsSync(scriptPath)) {
    log('Script de instalação não encontrado', 'error');
    return;
  }
  
  log('Iniciando instalação...', 'info');
  
  const install = spawn('bash', [scriptPath], {
    stdio: 'inherit'
  });
  
  install.on('error', (err) => {
    log(`Erro ao executar instalação: ${err.message}`, 'error');
  });
}

async function showLogs() {
  log('Mostrando logs do ClawdBot (Ctrl+C para sair)...', 'info');
  console.log('');
  
  const logs = spawn('journalctl', ['-u', 'clawdbot', '-f'], {
    stdio: 'inherit'
  });
  
  logs.on('error', () => {
    log('Não foi possível acessar logs do systemd', 'warning');
    log('Tentando logs alternativos...', 'info');
    
    const altLogs = spawn('tail', ['-f', './logs/clawdbot.log'], {
      stdio: 'inherit'
    });
    
    altLogs.on('error', () => {
      log('Nenhum arquivo de log encontrado', 'error');
    });
  });
}

function showHelp() {
  console.log(banner);
  console.log(`${colors.bright}Uso:${colors.reset} node index.js [comando]\n`);
  console.log(`${colors.bright}Comandos disponíveis:${colors.reset}\n`);
  
  for (const [name, cmd] of Object.entries(commands)) {
    console.log(`  ${colors.green}${name.padEnd(12)}${colors.reset} ${cmd.description}`);
  }
  
  console.log(`
${colors.bright}Exemplos:${colors.reset}
  node index.js start     # Inicia o agente
  node index.js status    # Verifica status
  node index.js health    # Health check completo
  
${colors.bright}Ou use npm scripts:${colors.reset}
  npm start               # Inicia o dashboard
  npm run health          # Health check
  npm run test:skills     # Testa skills
  
${colors.cyan}Para mais informações, veja README.md${colors.reset}
`);
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  if (commands[command]) {
    await commands[command].handler();
  } else {
    log(`Comando desconhecido: ${command}`, 'error');
    showHelp();
    process.exit(1);
  }
}

// Executar
main().catch(err => {
  log(`Erro: ${err.message}`, 'error');
  process.exit(1);
});
