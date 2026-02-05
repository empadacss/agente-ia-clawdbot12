/**
 * ============================================
 * 💻 BASH TOOL
 * ============================================
 * Execução segura de comandos no terminal
 * ============================================
 */

const { exec, spawn } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

// Comandos bloqueados por segurança
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\/(?!\w)/,    // rm -rf /
  /mkfs/,                    // formatação
  /dd\s+if=.*of=\/dev/,     // dd destrutivo
  />\s*\/dev\/sd[a-z]/,     // sobrescrever disco
  /:$$\)\s*{.*:.*&.*};/,     // fork bomb
];

// Timeout padrão (30 segundos)
const DEFAULT_TIMEOUT = 30000;
const MAX_OUTPUT = 100000; // 100KB max output

/**
 * Verificar se comando é seguro
 */
function isCommandSafe(command) {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return false;
    }
  }
  return true;
}

/**
 * Executar comando bash
 */
async function executeBash(command, options = {}) {
  const {
    timeout = DEFAULT_TIMEOUT,
    cwd = process.env.HOME,
    env = process.env
  } = options;
  
  // Verificar segurança
  if (!isCommandSafe(command)) {
    return {
      success: false,
      error: 'Comando bloqueado por segurança',
      command
    };
  }
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout,
      cwd,
      env,
      maxBuffer: MAX_OUTPUT,
      shell: '/bin/bash'
    });
    
    let output = stdout || '';
    if (stderr && !stdout) {
      output = stderr;
    }
    
    // Truncar output se muito grande
    if (output.length > MAX_OUTPUT) {
      output = output.slice(0, MAX_OUTPUT) + '\n... (output truncado)';
    }
    
    return {
      success: true,
      output: output.trim(),
      command
    };
  } catch (error) {
    // Verificar se foi timeout
    if (error.killed) {
      return {
        success: false,
        error: `Timeout após ${timeout / 1000}s`,
        command
      };
    }
    
    // Retornar erro com output se disponível
    return {
      success: false,
      error: error.message,
      output: error.stdout || error.stderr || '',
      exitCode: error.code,
      command
    };
  }
}

/**
 * Executar comando em background
 */
function executeBashBackground(command, options = {}) {
  const { cwd = process.env.HOME, env = process.env } = options;
  
  if (!isCommandSafe(command)) {
    return {
      success: false,
      error: 'Comando bloqueado por segurança'
    };
  }
  
  const child = spawn('bash', ['-c', command], {
    cwd,
    env,
    detached: true,
    stdio: 'ignore'
  });
  
  child.unref();
  
  return {
    success: true,
    message: 'Comando iniciado em background',
    pid: child.pid,
    command
  };
}

/**
 * Handler da ferramenta bash
 */
async function bashHandler(input) {
  const { command, restart, timeout } = input;
  
  if (restart) {
    // Reiniciar shell (limpar estado)
    return { success: true, message: 'Shell reiniciado' };
  }
  
  if (!command) {
    return { error: 'Comando é obrigatório' };
  }
  
  return await executeBash(command, { timeout });
}

/**
 * Definição da ferramenta para o Claude
 */
const bashTool = {
  name: 'bash',
  description: `Executa comandos no terminal bash.

Use para:
- Instalar pacotes (apt, npm, pip)
- Gerenciar arquivos (ls, cp, mv, mkdir)
- Verificar processos (ps, top, htop)
- Gerenciar serviços (systemctl)
- Executar scripts
- Verificar sistema (df, free, uptime)

Comandos perigosos são bloqueados automaticamente.
Timeout padrão: 30 segundos.`,
  
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'O comando bash a ser executado'
      },
      timeout: {
        type: 'number',
        description: 'Timeout em milissegundos (padrão: 30000)'
      },
      restart: {
        type: 'boolean',
        description: 'Se true, reinicia o shell'
      }
    },
    required: ['command']
  },
  
  handler: bashHandler
};

module.exports = {
  bashTool,
  executeBash,
  executeBashBackground,
  isCommandSafe
};
