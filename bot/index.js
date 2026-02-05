#!/usr/bin/env node

/**
 * ============================================
 * 🤖 OrangePi IA Bot - Telegram + Ollama
 * ============================================
 * Bot simples e funcional que:
 * - Responde perguntas usando IA local (Ollama)
 * - Executa comandos no terminal
 * - Gerencia arquivos
 * - Abre navegador
 * - Monitora o sistema
 * ============================================
 */

const TelegramBot = require('node-telegram-bot-api');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const util = require('util');

const execAsync = util.promisify(exec);

// ============================================
// CONFIGURAÇÃO
// ============================================

const CONFIG = {
  // Telegram
  telegramToken: process.env.TELEGRAM_TOKEN || '8342604056:AAGgB6WDFzD_nciqyI-By2ux8bN2mT5Jahs',
  allowedUsers: (process.env.ALLOWED_USERS || '5075455416').split(','),
  
  // Ollama
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.1:8b',
  
  // Segurança
  blockedCommands: [
    'rm -rf /',
    'rm -rf /*',
    'mkfs',
    'dd if=/dev/zero',
    'chmod -R 777 /',
    ':(){:|:&};:',
    'shutdown',
    'reboot',
    'halt',
    'poweroff'
  ],
  
  // Diretórios permitidos para arquivos
  allowedPaths: ['/home', '/tmp', '/var/log'],
  blockedPaths: ['/etc/shadow', '/etc/passwd', '/root/.ssh']
};

// ============================================
// INICIALIZAR BOT
// ============================================

console.log('🤖 Iniciando OrangePi IA Bot...');
console.log(`📱 Usuários permitidos: ${CONFIG.allowedUsers.join(', ')}`);
console.log(`🧠 Modelo: ${CONFIG.ollamaModel}`);
console.log(`🌐 Ollama: ${CONFIG.ollamaUrl}`);

const bot = new TelegramBot(CONFIG.telegramToken, { polling: true });

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Verificar se usuário é permitido
function isAllowed(userId) {
  if (CONFIG.allowedUsers.includes('*')) return true;
  return CONFIG.allowedUsers.includes(userId.toString());
}

// Verificar se comando é seguro
function isCommandSafe(cmd) {
  const lowerCmd = cmd.toLowerCase();
  for (const blocked of CONFIG.blockedCommands) {
    if (lowerCmd.includes(blocked.toLowerCase())) {
      return false;
    }
  }
  return true;
}

// Enviar mensagem com typing indicator
async function sendTyping(chatId) {
  await bot.sendChatAction(chatId, 'typing');
}

// ============================================
// OLLAMA - IA LOCAL
// ============================================

async function askOllama(prompt, systemPrompt = '') {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: CONFIG.ollamaModel,
      prompt: systemPrompt ? `${systemPrompt}\n\nUsuário: ${prompt}\nAssistente:` : prompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 2048
      }
    });

    const url = new URL(CONFIG.ollamaUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 11434,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.response || 'Sem resposta do modelo');
        } catch (e) {
          reject(new Error('Erro ao processar resposta do Ollama'));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`Ollama offline: ${e.message}`)));
    req.setTimeout(120000, () => reject(new Error('Timeout - resposta demorou muito')));
    req.write(data);
    req.end();
  });
}

// ============================================
// SISTEMA - MONITORAMENTO
// ============================================

async function getSystemStatus() {
  const cpu = await getCpuUsage();
  const mem = getMemoryInfo();
  const disk = await getDiskInfo();
  const temp = await getTemperature();
  const uptime = getUptime();
  const ip = getLocalIP();

  return `📊 *Status do Sistema*

🖥️ *CPU:* ${cpu}%
💾 *RAM:* ${mem.used}MB / ${mem.total}MB (${mem.percent}%)
💿 *Disco:* ${disk.used} / ${disk.total} (${disk.percent})
🌡️ *Temperatura:* ${temp}°C
⏱️ *Uptime:* ${uptime}
🌐 *IP Local:* ${ip}
🤖 *Modelo IA:* ${CONFIG.ollamaModel}
📍 *Hostname:* ${os.hostname()}`;
}

async function getCpuUsage() {
  try {
    const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print int($2)}'");
    return stdout.trim() || '0';
  } catch {
    return 'N/A';
  }
}

function getMemoryInfo() {
  const total = Math.round(os.totalmem() / 1024 / 1024);
  const free = Math.round(os.freemem() / 1024 / 1024);
  const used = total - free;
  const percent = Math.round((used / total) * 100);
  return { total, used, free, percent };
}

async function getDiskInfo() {
  try {
    const { stdout } = await execAsync("df -h / | awk 'NR==2{print $3,$2,$5}'");
    const [used, total, percent] = stdout.trim().split(' ');
    return { used, total, percent };
  } catch {
    return { used: 'N/A', total: 'N/A', percent: 'N/A' };
  }
}

async function getTemperature() {
  try {
    const tempPath = '/sys/class/thermal/thermal_zone0/temp';
    if (fs.existsSync(tempPath)) {
      const temp = fs.readFileSync(tempPath, 'utf8');
      return (parseInt(temp) / 1000).toFixed(1);
    }
  } catch {}
  return 'N/A';
}

function getUptime() {
  const sec = os.uptime();
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const [, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return 'N/A';
}

async function getProcesses() {
  try {
    const { stdout } = await execAsync("ps aux --sort=-%mem | head -8");
    return stdout;
  } catch {
    return 'Erro ao listar processos';
  }
}

// ============================================
// TERMINAL - EXECUTAR COMANDOS
// ============================================

async function executeCommand(cmd, timeout = 30000) {
  if (!isCommandSafe(cmd)) {
    return '❌ Comando bloqueado por segurança!';
  }

  try {
    const { stdout, stderr } = await execAsync(cmd, { 
      timeout,
      maxBuffer: 1024 * 1024 // 1MB
    });
    return stdout || stderr || '✅ Comando executado (sem saída)';
  } catch (error) {
    if (error.killed) {
      return '⏱️ Timeout - comando demorou muito';
    }
    return `❌ Erro: ${error.message}`;
  }
}

// ============================================
// ARQUIVOS - GERENCIAMENTO
// ============================================

async function listDirectory(dirPath) {
  try {
    const absolutePath = path.resolve(dirPath);
    const entries = fs.readdirSync(absolutePath, { withFileTypes: true });
    
    let result = `📁 *${absolutePath}*\n\n`;
    
    const dirs = entries.filter(e => e.isDirectory()).map(e => `📂 ${e.name}/`);
    const files = entries.filter(e => e.isFile()).map(e => `📄 ${e.name}`);
    
    if (dirs.length) result += dirs.slice(0, 20).join('\n') + '\n';
    if (files.length) result += files.slice(0, 30).join('\n');
    
    if (entries.length > 50) {
      result += `\n\n... e mais ${entries.length - 50} itens`;
    }
    
    return result;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function readFile(filePath) {
  try {
    const absolutePath = path.resolve(filePath);
    const stats = fs.statSync(absolutePath);
    
    if (stats.size > 50000) {
      return '❌ Arquivo muito grande (max 50KB)';
    }
    
    const content = fs.readFileSync(absolutePath, 'utf8');
    return `📄 *${path.basename(filePath)}*\n\n\`\`\`\n${content.slice(0, 3500)}\n\`\`\``;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function createFile(filePath, content) {
  try {
    const absolutePath = path.resolve(filePath);
    fs.writeFileSync(absolutePath, content, 'utf8');
    return `✅ Arquivo criado: ${absolutePath}`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function deleteFile(filePath) {
  try {
    const absolutePath = path.resolve(filePath);
    fs.unlinkSync(absolutePath);
    return `✅ Arquivo removido: ${absolutePath}`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

// ============================================
// NAVEGADOR - PUPPETEER
// ============================================

let browser = null;
let page = null;

async function openBrowser(url) {
  try {
    const puppeteer = require('puppeteer');
    
    if (!browser) {
      browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    
    page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    const title = await page.title();
    return `🌐 Navegador aberto!\n📄 Título: ${title}\n🔗 URL: ${url}`;
  } catch (error) {
    return `❌ Erro ao abrir navegador: ${error.message}`;
  }
}

async function screenshotPage() {
  try {
    if (!page) {
      return '❌ Nenhuma página aberta. Use /abrir <url> primeiro.';
    }
    
    const screenshotPath = `/tmp/screenshot-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    
    return { type: 'photo', path: screenshotPath };
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function closeBrowser() {
  try {
    if (browser) {
      await browser.close();
      browser = null;
      page = null;
      return '✅ Navegador fechado';
    }
    return 'ℹ️ Navegador não estava aberto';
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

// ============================================
// PROMPT DO SISTEMA
// ============================================

const SYSTEM_PROMPT = `Você é um assistente de IA chamado OrangePi IA, rodando localmente em uma Orange Pi 5 Plus com 32GB de RAM.

Você pode ajudar com:
- Responder perguntas e explicar conceitos
- Escrever e explicar código
- Dar informações sobre o sistema
- Sugerir comandos para executar

Responda sempre em português brasileiro, de forma clara e concisa.
Use emojis moderadamente para tornar as respostas mais amigáveis.`;

// ============================================
// HANDLERS DE MENSAGENS
// ============================================

// Comando /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isAllowed(userId)) {
    return bot.sendMessage(chatId, '❌ Você não está autorizado a usar este bot.');
  }
  
  const welcome = `🤖 *OrangePi IA Bot*

Olá! Sou seu assistente de IA rodando localmente.

*Comandos disponíveis:*

📊 *Sistema*
/status - Status do sistema
/cpu - Uso da CPU
/ram - Uso de memória
/temp - Temperatura
/disco - Uso do disco
/processos - Top processos

💻 *Terminal*
/exec <comando> - Executar comando
/ping <host> - Testar conectividade

📁 *Arquivos*
/ls <pasta> - Listar diretório
/cat <arquivo> - Ver conteúdo
/pwd - Diretório atual

🌐 *Navegador*
/abrir <url> - Abrir página
/screenshot - Capturar tela
/fechar - Fechar navegador

💬 *IA*
Envie qualquer mensagem para conversar comigo!

🔧 *Outros*
/help - Esta ajuda
/modelo - Modelo de IA atual`;

  await bot.sendMessage(chatId, welcome, { parse_mode: 'Markdown' });
});

// Comando /help
bot.onText(/\/help/, async (msg) => {
  bot.emit('text', { ...msg, text: '/start' });
});

// Comando /status
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  await sendTyping(chatId);
  const status = await getSystemStatus();
  await bot.sendMessage(chatId, status, { parse_mode: 'Markdown' });
});

// Comando /cpu
bot.onText(/\/cpu/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  const cpu = await getCpuUsage();
  await bot.sendMessage(chatId, `🖥️ *Uso da CPU:* ${cpu}%`, { parse_mode: 'Markdown' });
});

// Comando /ram
bot.onText(/\/ram/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  const mem = getMemoryInfo();
  await bot.sendMessage(chatId, `💾 *Memória:* ${mem.used}MB / ${mem.total}MB (${mem.percent}%)`, { parse_mode: 'Markdown' });
});

// Comando /temp
bot.onText(/\/temp/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  const temp = await getTemperature();
  await bot.sendMessage(chatId, `🌡️ *Temperatura:* ${temp}°C`, { parse_mode: 'Markdown' });
});

// Comando /disco
bot.onText(/\/disco/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  const disk = await getDiskInfo();
  await bot.sendMessage(chatId, `💿 *Disco:* ${disk.used} / ${disk.total} (${disk.percent})`, { parse_mode: 'Markdown' });
});

// Comando /processos
bot.onText(/\/processos/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  await sendTyping(chatId);
  const procs = await getProcesses();
  await bot.sendMessage(chatId, `📋 *Top Processos:*\n\`\`\`\n${procs}\`\`\``, { parse_mode: 'Markdown' });
});

// Comando /exec
bot.onText(/\/exec (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  const cmd = match[1];
  await sendTyping(chatId);
  
  const result = await executeCommand(cmd);
  const response = `⚡ *Executando:* \`${cmd}\`\n\n\`\`\`\n${result.slice(0, 3500)}\n\`\`\``;
  
  await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
});

// Comando /ping
bot.onText(/\/ping (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  const host = match[1];
  await sendTyping(chatId);
  
  const result = await executeCommand(`ping -c 4 ${host}`);
  await bot.sendMessage(chatId, `🏓 *Ping ${host}:*\n\`\`\`\n${result}\`\`\``, { parse_mode: 'Markdown' });
});

// Comando /ls
bot.onText(/\/ls(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  const dir = match[1]?.trim() || '.';
  await sendTyping(chatId);
  
  const result = await listDirectory(dir);
  await bot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
});

// Comando /cat
bot.onText(/\/cat (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  const file = match[1];
  await sendTyping(chatId);
  
  const result = await readFile(file);
  await bot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
});

// Comando /pwd
bot.onText(/\/pwd/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  await bot.sendMessage(chatId, `📍 *Diretório atual:* \`${process.cwd()}\``, { parse_mode: 'Markdown' });
});

// Comando /abrir
bot.onText(/\/abrir (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  let url = match[1];
  if (!url.startsWith('http')) url = 'https://' + url;
  
  await sendTyping(chatId);
  const result = await openBrowser(url);
  await bot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
});

// Comando /screenshot
bot.onText(/\/screenshot/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  await sendTyping(chatId);
  const result = await screenshotPage();
  
  if (typeof result === 'object' && result.type === 'photo') {
    await bot.sendPhoto(chatId, result.path);
    fs.unlinkSync(result.path);
  } else {
    await bot.sendMessage(chatId, result);
  }
});

// Comando /fechar
bot.onText(/\/fechar/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  const result = await closeBrowser();
  await bot.sendMessage(chatId, result);
});

// Comando /modelo
bot.onText(/\/modelo/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  await bot.sendMessage(chatId, `🧠 *Modelo atual:* ${CONFIG.ollamaModel}\n🌐 *Servidor:* ${CONFIG.ollamaUrl}`, { parse_mode: 'Markdown' });
});

// Mensagens gerais - Perguntar ao Ollama
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  
  // Ignorar comandos
  if (text.startsWith('/')) return;
  if (!isAllowed(msg.from.id)) return;
  if (!text.trim()) return;
  
  console.log(`📩 [${msg.from.id}] ${text}`);
  
  await sendTyping(chatId);
  
  try {
    const response = await askOllama(text, SYSTEM_PROMPT);
    await bot.sendMessage(chatId, response);
    console.log(`📤 Resposta enviada`);
  } catch (error) {
    console.error('❌ Erro Ollama:', error.message);
    await bot.sendMessage(chatId, `❌ Erro: ${error.message}\n\nVerifique se o Ollama está rodando.`);
  }
});

// ============================================
// INICIALIZAÇÃO
// ============================================

console.log('');
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║  🤖 OrangePi IA Bot - Iniciado!                        ║');
console.log('╚════════════════════════════════════════════════════════╝');
console.log('');
console.log('✅ Bot rodando! Aguardando mensagens...');
console.log('📱 Fale com o bot no Telegram!');
console.log('');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Encerrando...');
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 Encerrando...');
  await closeBrowser();
  process.exit(0);
});
