/**
 * ============================================
 * BASH TOOL
 * ============================================
 * Execução segura de comandos no terminal
 * com blocklist, timeout e output handling
 * ============================================
 */

const { exec, spawn } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

const DEFAULT_TIMEOUT = 30000;
const MAX_OUTPUT = 100000;
const ENV = { ...process.env, DISPLAY: process.env.DISPLAY || ':0' };

// Padrões bloqueados
const BLOCKED = [
  /rm\s+-r[f]?\s+\/\s/,        // rm -rf /
  /rm\s+-r[f]?\s+\/$/,         // rm -rf /
  /mkfs\./,                     // mkfs.ext4 etc
  /dd\s+.*of=\/dev\/[sh]d/,    // dd destrutivo
  />\s*\/dev\/[sh]d/,          // > /dev/sda
  /:\(\)\s*\{\s*:\|:&\s*\};:/  // fork bomb
];

function isSafe(cmd) {
  return !BLOCKED.some(p => p.test(cmd));
}

async function executeBash(command, options = {}) {
  const timeout = options.timeout || DEFAULT_TIMEOUT;

  if (!isSafe(command)) {
    return { success: false, error: 'Comando bloqueado por segurança', command };
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout,
      cwd: options.cwd || process.env.HOME,
      env: ENV,
      maxBuffer: MAX_OUTPUT,
      shell: '/bin/bash'
    });

    // Combinar stdout e stderr para dar contexto completo
    let output = (stdout || '').trim();
    const errOutput = (stderr || '').trim();
    if (errOutput && !output) {
      output = errOutput;
    } else if (errOutput) {
      output += '\n--- stderr ---\n' + errOutput;
    }

    if (output.length > MAX_OUTPUT) {
      output = output.slice(0, MAX_OUTPUT) + '\n... (truncado)';
    }

    return { success: true, output, command };
  } catch (err) {
    if (err.killed) {
      return { success: false, error: `Timeout (${timeout / 1000}s)`, command };
    }

    // Comandos que retornam exit code != 0 ainda podem ter output útil
    const output = ((err.stdout || '') + '\n' + (err.stderr || '')).trim();
    return {
      success: false,
      error: err.message,
      output: output.slice(0, MAX_OUTPUT),
      exitCode: err.code,
      command
    };
  }
}

function executeBashBackground(command) {
  if (!isSafe(command)) {
    return { success: false, error: 'Comando bloqueado' };
  }
  const child = spawn('bash', ['-c', command], {
    cwd: process.env.HOME,
    env: ENV,
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
  return { success: true, message: 'Background', pid: child.pid, command };
}

async function bashHandler(input) {
  const { command, timeout } = input;
  if (!command) return { error: 'command é obrigatório' };
  return await executeBash(command, { timeout });
}

const bashTool = {
  name: 'bash',
  description: `Executa comandos bash no terminal.

Exemplos de uso:
- Instalar pacotes: "sudo apt install -y htop"
- Listar arquivos: "ls -la /home"
- Status do sistema: "free -h && df -h && uptime"
- Gerenciar serviços: "sudo systemctl status nginx"
- Processos: "ps aux | head -20"

Timeout padrão: 30s. Comandos destrutivos são bloqueados.`,

  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Comando bash para executar' },
      timeout: { type: 'number', description: 'Timeout em ms (padrão 30000)' }
    },
    required: ['command']
  },

  handler: bashHandler
};

module.exports = { bashTool, executeBash, executeBashBackground, isSafe };
