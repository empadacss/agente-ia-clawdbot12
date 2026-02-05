#!/usr/bin/env node

/**
 * ============================================
 * 🤖 OrangePi 6 Plus - CONTROLE TOTAL
 * ============================================
 * FOCO PRINCIPAL: Mouse e Teclado Remoto
 * 
 * Funcionalidades:
 * - 🖱️ Controle de Mouse (mover, clicar, scroll, arrastar)
 * - ⌨️ Controle de Teclado (digitar, teclas, atalhos)
 * - 📸 Screenshots em tempo real
 * - 🧠 IA Local (Ollama)
 * - 📍 GPIO Control
 * - 🐳 Docker
 * - ⚙️ Sistema completo
 * ============================================
 */

const TelegramBot = require('node-telegram-bot-api');
const { exec, spawn, execSync } = require('child_process');
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
  telegramToken: process.env.TELEGRAM_TOKEN || '',
  allowedUsers: (process.env.ALLOWED_USERS || '').split(',').filter(Boolean),
  
  // Ollama
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.1:8b',
  
  // Mouse/Teclado
  inputTool: 'xdotool', // xdotool ou ydotool
  defaultDelay: 50, // ms entre ações
  
  // Alertas
  alertsEnabled: true,
  tempThreshold: 70,
  cpuThreshold: 90,
  ramThreshold: 90,
  diskThreshold: 90,
  
  // Segurança
  blockedCommands: [
    'rm -rf /', 'rm -rf /*', 'mkfs', 'dd if=/dev/zero of=/dev',
    'chmod -R 777 /', ':(){:|:&};:', '> /dev/sda', 'mv /* /dev/null'
  ],
  confirmCommands: ['shutdown', 'reboot', 'halt', 'poweroff', 'rm -rf'],
  
  // Paths
  gpioBasePath: '/sys/class/gpio',
  backupPath: '/home/backup',
  screenshotPath: '/tmp'
};

// Estado global
const STATE = {
  pendingConfirmation: new Map(),
  gpioExported: new Set(),
  browser: null,
  page: null,
  conversationHistory: new Map(),
  mousePosition: { x: 0, y: 0 },
  lastScreenshot: null
};

// ============================================
// INICIALIZAR BOT
// ============================================

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  🤖 OrangePi 6 Plus - CONTROLE TOTAL                       ║');
console.log('║  🖱️  Mouse + ⌨️  Teclado + 🧠 IA + 📍 GPIO                  ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`📱 Usuários: ${CONFIG.allowedUsers.join(', ') || 'NENHUM'}`);
console.log(`🧠 Modelo: ${CONFIG.ollamaModel}`);
console.log('');

const bot = new TelegramBot(CONFIG.telegramToken, { polling: true });

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function isAllowed(userId) {
  if (CONFIG.allowedUsers.includes('*')) return true;
  return CONFIG.allowedUsers.includes(userId.toString());
}

function isCommandSafe(cmd) {
  const lowerCmd = cmd.toLowerCase();
  return !CONFIG.blockedCommands.some(b => lowerCmd.includes(b.toLowerCase()));
}

function needsConfirmation(cmd) {
  const lowerCmd = cmd.toLowerCase();
  return CONFIG.confirmCommands.some(c => lowerCmd.includes(c));
}

async function sendTyping(chatId) {
  try { await bot.sendChatAction(chatId, 'typing'); } catch {}
}

async function sendPhoto(chatId) {
  try { await bot.sendChatAction(chatId, 'upload_photo'); } catch {}
}

// ============================================
// 🖱️ MOUSE - CONTROLE COMPLETO
// ============================================

async function mouseMove(x, y, relative = false) {
  try {
    const cmd = relative 
      ? `xdotool mousemove_relative -- ${x} ${y}`
      : `xdotool mousemove ${x} ${y}`;
    await execAsync(cmd);
    STATE.mousePosition = relative 
      ? { x: STATE.mousePosition.x + x, y: STATE.mousePosition.y + y }
      : { x, y };
    return `🖱️ Mouse movido para (${STATE.mousePosition.x}, ${STATE.mousePosition.y})`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function mouseClick(button = 'left', count = 1) {
  try {
    const buttonMap = { left: 1, middle: 2, right: 3, l: 1, m: 2, r: 3 };
    const btn = buttonMap[button.toLowerCase()] || 1;
    
    let cmd = `xdotool click`;
    if (count > 1) cmd += ` --repeat ${count} --delay ${CONFIG.defaultDelay}`;
    cmd += ` ${btn}`;
    
    await execAsync(cmd);
    const clickType = count > 1 ? `${count}x ` : '';
    const btnName = btn === 1 ? 'esquerdo' : btn === 2 ? 'meio' : 'direito';
    return `🖱️ Click ${clickType}${btnName}`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function mouseDoubleClick() {
  return await mouseClick('left', 2);
}

async function mouseRightClick() {
  return await mouseClick('right', 1);
}

async function mouseScroll(direction, amount = 3) {
  try {
    const btn = direction.toLowerCase() === 'up' ? 4 : 5;
    await execAsync(`xdotool click --repeat ${amount} --delay 50 ${btn}`);
    return `🖱️ Scroll ${direction} (${amount}x)`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function mouseDrag(startX, startY, endX, endY, button = 'left') {
  try {
    const btn = button === 'right' ? 3 : 1;
    await execAsync(`xdotool mousemove ${startX} ${startY} mousedown ${btn} mousemove ${endX} ${endY} mouseup ${btn}`);
    return `🖱️ Arrastado de (${startX},${startY}) para (${endX},${endY})`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function mousePosition() {
  try {
    const { stdout } = await execAsync("xdotool getmouselocation --shell");
    const match = stdout.match(/X=(\d+)\nY=(\d+)/);
    if (match) {
      STATE.mousePosition = { x: parseInt(match[1]), y: parseInt(match[2]) };
      return `🖱️ Posição atual: (${STATE.mousePosition.x}, ${STATE.mousePosition.y})`;
    }
    return '❌ Não foi possível obter posição';
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function mouseClickAt(x, y, button = 'left') {
  try {
    const btn = button === 'right' ? 3 : button === 'middle' ? 2 : 1;
    await execAsync(`xdotool mousemove ${x} ${y} click ${btn}`);
    STATE.mousePosition = { x, y };
    return `🖱️ Click em (${x}, ${y})`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

// ============================================
// ⌨️ TECLADO - CONTROLE COMPLETO
// ============================================

async function typeText(text, delay = 12) {
  try {
    // Escapar caracteres especiais para xdotool
    const escaped = text.replace(/'/g, "'\\''");
    await execAsync(`xdotool type --delay ${delay} '${escaped}'`);
    return `⌨️ Digitado: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function pressKey(key) {
  try {
    // Mapear nomes amigáveis para xdotool
    const keyMap = {
      'enter': 'Return', 'return': 'Return',
      'esc': 'Escape', 'escape': 'Escape',
      'tab': 'Tab',
      'space': 'space', 'espaco': 'space',
      'backspace': 'BackSpace', 'back': 'BackSpace',
      'delete': 'Delete', 'del': 'Delete',
      'up': 'Up', 'cima': 'Up',
      'down': 'Down', 'baixo': 'Down',
      'left': 'Left', 'esquerda': 'Left',
      'right': 'Right', 'direita': 'Right',
      'home': 'Home', 'inicio': 'Home',
      'end': 'End', 'fim': 'End',
      'pageup': 'Page_Up', 'pgup': 'Page_Up',
      'pagedown': 'Page_Down', 'pgdown': 'Page_Down',
      'insert': 'Insert', 'ins': 'Insert',
      'f1': 'F1', 'f2': 'F2', 'f3': 'F3', 'f4': 'F4',
      'f5': 'F5', 'f6': 'F6', 'f7': 'F7', 'f8': 'F8',
      'f9': 'F9', 'f10': 'F10', 'f11': 'F11', 'f12': 'F12',
      'printscreen': 'Print', 'print': 'Print',
      'pause': 'Pause',
      'capslock': 'Caps_Lock', 'caps': 'Caps_Lock',
      'numlock': 'Num_Lock',
      'scrolllock': 'Scroll_Lock'
    };
    
    const mappedKey = keyMap[key.toLowerCase()] || key;
    await execAsync(`xdotool key ${mappedKey}`);
    return `⌨️ Tecla: ${key}`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function pressKeyCombo(combo) {
  try {
    // Converter atalhos comuns
    // Formato: ctrl+c, alt+tab, super+d, ctrl+shift+esc
    const parts = combo.toLowerCase().split('+');
    const modifiers = [];
    let key = parts[parts.length - 1];
    
    const modMap = {
      'ctrl': 'ctrl', 'control': 'ctrl',
      'alt': 'alt',
      'shift': 'shift',
      'super': 'super', 'win': 'super', 'meta': 'super'
    };
    
    const keyMap = {
      'c': 'c', 'v': 'v', 'x': 'x', 'z': 'z', 'a': 'a', 's': 's',
      'tab': 'Tab', 'd': 'd', 'f': 'f', 'w': 'w', 'q': 'q',
      'esc': 'Escape', 'escape': 'Escape',
      'enter': 'Return', 'return': 'Return',
      'f4': 'F4', 'f5': 'F5', 'f11': 'F11', 'f12': 'F12',
      'delete': 'Delete', 'del': 'Delete',
      'print': 'Print', 'printscreen': 'Print',
      'left': 'Left', 'right': 'Right', 'up': 'Up', 'down': 'Down',
      'home': 'Home', 'end': 'End',
      'pageup': 'Page_Up', 'pagedown': 'Page_Down'
    };
    
    for (let i = 0; i < parts.length - 1; i++) {
      const mod = modMap[parts[i]];
      if (mod) modifiers.push(mod);
    }
    
    key = keyMap[key] || key;
    const xdotoolCombo = [...modifiers, key].join('+');
    
    await execAsync(`xdotool key ${xdotoolCombo}`);
    return `⌨️ Atalho: ${combo}`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function holdKey(key, action = 'down') {
  try {
    const cmd = action === 'up' ? 'keyup' : 'keydown';
    await execAsync(`xdotool ${cmd} ${key}`);
    return `⌨️ Tecla ${key}: ${action}`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

// Atalhos comuns pré-definidos
const SHORTCUTS = {
  'copiar': 'ctrl+c', 'copy': 'ctrl+c',
  'colar': 'ctrl+v', 'paste': 'ctrl+v',
  'cortar': 'ctrl+x', 'cut': 'ctrl+x',
  'desfazer': 'ctrl+z', 'undo': 'ctrl+z',
  'refazer': 'ctrl+y', 'redo': 'ctrl+y',
  'salvar': 'ctrl+s', 'save': 'ctrl+s',
  'selecionartudo': 'ctrl+a', 'selectall': 'ctrl+a',
  'fechar': 'alt+F4', 'close': 'alt+F4',
  'alternar': 'alt+Tab', 'switch': 'alt+Tab',
  'desktop': 'super+d',
  'terminal': 'ctrl+alt+t',
  'executar': 'alt+F2', 'run': 'alt+F2',
  'buscar': 'ctrl+f', 'find': 'ctrl+f',
  'novaguia': 'ctrl+t', 'newtab': 'ctrl+t',
  'fechaguia': 'ctrl+w', 'closetab': 'ctrl+w',
  'atualizar': 'F5', 'refresh': 'F5',
  'telaCheia': 'F11', 'fullscreen': 'F11',
  'print': 'Print', 'screenshot': 'Print',
  'gerenciador': 'ctrl+shift+Escape', 'taskmanager': 'ctrl+shift+Escape'
};

async function executeShortcut(name) {
  const combo = SHORTCUTS[name.toLowerCase().replace(/\s+/g, '')];
  if (combo) {
    return await pressKeyCombo(combo);
  }
  return `❌ Atalho não encontrado: ${name}\n\nAtalhos disponíveis: ${Object.keys(SHORTCUTS).join(', ')}`;
}

// ============================================
// 📸 SCREENSHOT DO DESKTOP
// ============================================

async function takeScreenshot(region = null) {
  try {
    const filename = `screenshot-${Date.now()}.png`;
    const filepath = path.join(CONFIG.screenshotPath, filename);
    
    let cmd;
    if (region) {
      // Região específica: x,y,largura,altura
      const [x, y, w, h] = region.split(',').map(Number);
      cmd = `scrot -a ${x},${y},${w},${h} ${filepath}`;
    } else {
      // Tela inteira
      cmd = `scrot ${filepath}`;
    }
    
    await execAsync(cmd);
    STATE.lastScreenshot = filepath;
    return { type: 'photo', path: filepath };
  } catch (error) {
    // Tentar com import do ImageMagick se scrot falhar
    try {
      const filename = `screenshot-${Date.now()}.png`;
      const filepath = path.join(CONFIG.screenshotPath, filename);
      await execAsync(`DISPLAY=:0 import -window root ${filepath}`);
      STATE.lastScreenshot = filepath;
      return { type: 'photo', path: filepath };
    } catch {
      return `❌ Erro ao capturar tela: ${error.message}\nInstale: sudo apt install scrot`;
    }
  }
}

async function getWindowList() {
  try {
    const { stdout } = await execAsync("wmctrl -l");
    return `🪟 *Janelas Abertas:*\n\`\`\`\n${stdout}\`\`\``;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function focusWindow(identifier) {
  try {
    // Tentar por ID ou por nome
    const isId = /^0x[0-9a-f]+$/i.test(identifier);
    const cmd = isId 
      ? `xdotool windowactivate ${identifier}`
      : `xdotool search --name "${identifier}" windowactivate`;
    await execAsync(cmd);
    return `🪟 Janela focada: ${identifier}`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function getActiveWindow() {
  try {
    const { stdout } = await execAsync("xdotool getactivewindow getwindowname");
    return `🪟 Janela ativa: ${stdout.trim()}`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function getScreenResolution() {
  try {
    const { stdout } = await execAsync("xdpyinfo | grep dimensions");
    const match = stdout.match(/(\d+x\d+)/);
    return `🖥️ Resolução: ${match ? match[1] : 'N/A'}`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

// ============================================
// OLLAMA - IA LOCAL
// ============================================

async function askOllama(prompt, chatId, systemPrompt = '') {
  return new Promise((resolve, reject) => {
    let history = STATE.conversationHistory.get(chatId) || [];
    
    const fullPrompt = systemPrompt 
      ? `${systemPrompt}\n\nHistórico:\n${history.slice(-5).join('\n')}\n\nUsuário: ${prompt}\nAssistente:`
      : prompt;

    const data = JSON.stringify({
      model: CONFIG.ollamaModel,
      prompt: fullPrompt,
      stream: false,
      options: { temperature: 0.7, num_predict: 4096 }
    });

    const url = new URL(CONFIG.ollamaUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 11434,
      path: '/api/generate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const response = json.response || 'Sem resposta';
          history.push(`Usuário: ${prompt.slice(0, 100)}`);
          history.push(`IA: ${response.slice(0, 100)}`);
          if (history.length > 20) history = history.slice(-20);
          STATE.conversationHistory.set(chatId, history);
          resolve(response);
        } catch (e) {
          reject(new Error('Erro ao processar resposta'));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`Ollama offline: ${e.message}`)));
    req.setTimeout(180000, () => reject(new Error('Timeout')));
    req.write(data);
    req.end();
  });
}

// ============================================
// SISTEMA - MONITORAMENTO
// ============================================

async function getSystemStatus() {
  const [cpu, temp, uptime] = await Promise.all([
    getCpuUsage(), getTemperature(), getUptime()
  ]);
  const mem = getMemoryInfo();
  const disk = await getDiskInfo();
  const ip = getLocalIP();

  return `📊 *Status - Orange Pi 6 Plus*

🖥️ CPU: ${cpu}% | 🌡️ Temp: ${temp}°C
💾 RAM: ${mem.used}MB/${mem.total}MB (${mem.percent}%)
💿 Disco: ${disk.used}/${disk.total} (${disk.percent})
⏱️ Uptime: ${uptime} | 🌐 IP: ${ip}
🧠 Modelo: ${CONFIG.ollamaModel}`;
}

async function getCpuUsage() {
  try {
    const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print int($2+$4)}'");
    return stdout.trim() || '0';
  } catch { return 'N/A'; }
}

function getMemoryInfo() {
  const total = Math.round(os.totalmem() / 1024 / 1024);
  const free = Math.round(os.freemem() / 1024 / 1024);
  const used = total - free;
  return { total, used, free, percent: Math.round((used / total) * 100) };
}

async function getDiskInfo() {
  try {
    const { stdout } = await execAsync("df -h / | awk 'NR==2{print $3,$2,$4,$5}'");
    const [used, total, available, percent] = stdout.trim().split(' ');
    return { used, total, available, percent };
  } catch { return { used: 'N/A', total: 'N/A', available: 'N/A', percent: 'N/A' }; }
}

async function getTemperature() {
  try {
    const paths = ['/sys/class/thermal/thermal_zone0/temp', '/sys/class/thermal/thermal_zone1/temp'];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        return (parseInt(fs.readFileSync(p, 'utf8')) / 1000).toFixed(1);
      }
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
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address;
    }
  }
  return 'N/A';
}

// ============================================
// TERMINAL
// ============================================

async function executeCommand(cmd, timeout = 60000) {
  if (!isCommandSafe(cmd)) return '❌ Comando bloqueado!';

  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout, maxBuffer: 5 * 1024 * 1024 });
    return (stdout || stderr || '✅ Executado').slice(0, 4000);
  } catch (error) {
    if (error.killed) return '⏱️ Timeout';
    return `❌ Erro: ${error.message}`;
  }
}

// ============================================
// GPIO
// ============================================

async function writeGpio(pin, value) {
  try {
    const basePath = CONFIG.gpioBasePath;
    if (!fs.existsSync(`${basePath}/gpio${pin}`)) {
      fs.writeFileSync(`${basePath}/export`, pin.toString());
      await new Promise(r => setTimeout(r, 100));
    }
    fs.writeFileSync(`${basePath}/gpio${pin}/direction`, 'out');
    fs.writeFileSync(`${basePath}/gpio${pin}/value`, value.toString());
    STATE.gpioExported.add(pin);
    return `📍 GPIO ${pin} = ${value}`;
  } catch (error) { return `❌ Erro: ${error.message}`; }
}

async function readGpio(pin) {
  try {
    const basePath = CONFIG.gpioBasePath;
    if (!fs.existsSync(`${basePath}/gpio${pin}`)) {
      fs.writeFileSync(`${basePath}/export`, pin.toString());
      await new Promise(r => setTimeout(r, 100));
    }
    fs.writeFileSync(`${basePath}/gpio${pin}/direction`, 'in');
    const value = fs.readFileSync(`${basePath}/gpio${pin}/value`, 'utf8').trim();
    STATE.gpioExported.add(pin);
    return `📍 GPIO ${pin} = ${value}`;
  } catch (error) { return `❌ Erro: ${error.message}`; }
}

// ============================================
// PROMPT DO SISTEMA
// ============================================

const SYSTEM_PROMPT = `Você é o assistente da Orange Pi 6 Plus com controle total via Telegram.

COMANDOS PRINCIPAIS DE MOUSE E TECLADO:
- /mouse move X Y - Mover mouse
- /click ou /click r (direito) - Clicar
- /dclick - Duplo clique
- /scroll up/down - Rolar
- /digitar texto - Digitar texto
- /tecla enter/esc/tab - Pressionar tecla
- /atalho ctrl+c - Executar atalho
- /tela - Screenshot

Sugira comandos quando o usuário pedir para fazer algo.
Responda em português, de forma técnica e concisa.`;

// ============================================
// HANDLERS - MOUSE
// ============================================

// /mouse ou /m - Posição atual
bot.onText(/^\/(mouse|m)$/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await mousePosition();
  await bot.sendMessage(msg.chat.id, result);
});

// /mouse move X Y ou /m X Y
bot.onText(/^\/(mouse move|m) (-?\d+) (-?\d+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await mouseMove(parseInt(match[2]), parseInt(match[3]));
  await bot.sendMessage(msg.chat.id, result);
});

// /mouse rel X Y - Movimento relativo
bot.onText(/^\/(mouse rel|mrel) (-?\d+) (-?\d+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await mouseMove(parseInt(match[2]), parseInt(match[3]), true);
  await bot.sendMessage(msg.chat.id, result);
});

// /click [button] [x y]
bot.onText(/^\/click(.*)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const args = match[1].trim().split(/\s+/).filter(Boolean);
  
  if (args.length === 2 && !isNaN(args[0])) {
    // /click X Y
    const result = await mouseClickAt(parseInt(args[0]), parseInt(args[1]));
    await bot.sendMessage(msg.chat.id, result);
  } else if (args.length === 3 && !isNaN(args[1])) {
    // /click button X Y
    const result = await mouseClickAt(parseInt(args[1]), parseInt(args[2]), args[0]);
    await bot.sendMessage(msg.chat.id, result);
  } else {
    // /click [button]
    const result = await mouseClick(args[0] || 'left');
    await bot.sendMessage(msg.chat.id, result);
  }
});

// /dclick - Duplo clique
bot.onText(/^\/(dclick|doubleclick|duplo)$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await mouseDoubleClick();
  await bot.sendMessage(msg.chat.id, result);
});

// /rclick - Clique direito
bot.onText(/^\/(rclick|rightclick|direito)$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await mouseRightClick();
  await bot.sendMessage(msg.chat.id, result);
});

// /scroll up/down [quantidade]
bot.onText(/^\/scroll (up|down|cima|baixo)( \d+)?$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const dir = match[1].toLowerCase().replace('cima', 'up').replace('baixo', 'down');
  const amount = match[2] ? parseInt(match[2]) : 3;
  const result = await mouseScroll(dir, amount);
  await bot.sendMessage(msg.chat.id, result);
});

// /arrastar X1 Y1 X2 Y2
bot.onText(/^\/(arrastar|drag) (\d+) (\d+) (\d+) (\d+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await mouseDrag(match[2], match[3], match[4], match[5]);
  await bot.sendMessage(msg.chat.id, result);
});

// ============================================
// HANDLERS - TECLADO
// ============================================

// /digitar texto
bot.onText(/^\/(digitar|type|escrever) (.+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await typeText(match[2]);
  await bot.sendMessage(msg.chat.id, result);
});

// /tecla key
bot.onText(/^\/(tecla|key|pressionar) (.+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const key = match[2].trim();
  
  // Verificar se é um atalho (contém +)
  if (key.includes('+')) {
    const result = await pressKeyCombo(key);
    await bot.sendMessage(msg.chat.id, result);
  } else {
    const result = await pressKey(key);
    await bot.sendMessage(msg.chat.id, result);
  }
});

// /atalho nome ou combo
bot.onText(/^\/(atalho|shortcut|hotkey) (.+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const shortcut = match[2].trim();
  
  // Verificar se é nome de atalho pré-definido ou combo direto
  if (SHORTCUTS[shortcut.toLowerCase().replace(/\s+/g, '')]) {
    const result = await executeShortcut(shortcut);
    await bot.sendMessage(msg.chat.id, result);
  } else if (shortcut.includes('+')) {
    const result = await pressKeyCombo(shortcut);
    await bot.sendMessage(msg.chat.id, result);
  } else {
    await bot.sendMessage(msg.chat.id, `❌ Atalho não encontrado.\n\nAtalhos: ${Object.keys(SHORTCUTS).join(', ')}\nOu use formato: ctrl+c, alt+tab`);
  }
});

// /atalhos - Listar atalhos
bot.onText(/^\/atalhos$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  let list = '⌨️ *Atalhos Disponíveis:*\n\n';
  for (const [name, combo] of Object.entries(SHORTCUTS)) {
    list += `• \`${name}\` → ${combo}\n`;
  }
  list += '\nUse: /atalho <nome> ou /atalho ctrl+c';
  await bot.sendMessage(msg.chat.id, list, { parse_mode: 'Markdown' });
});

// Teclas rápidas individuais
bot.onText(/^\/enter$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await bot.sendMessage(msg.chat.id, await pressKey('enter'));
});

bot.onText(/^\/esc$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await bot.sendMessage(msg.chat.id, await pressKey('esc'));
});

bot.onText(/^\/tab$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await bot.sendMessage(msg.chat.id, await pressKey('tab'));
});

bot.onText(/^\/space$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await bot.sendMessage(msg.chat.id, await pressKey('space'));
});

bot.onText(/^\/backspace$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await bot.sendMessage(msg.chat.id, await pressKey('backspace'));
});

// ============================================
// HANDLERS - SCREENSHOT E JANELAS
// ============================================

// /tela ou /screenshot
bot.onText(/^\/(tela|screenshot|print|ss)$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await sendPhoto(msg.chat.id);
  const result = await takeScreenshot();
  
  if (typeof result === 'object' && result.type === 'photo') {
    await bot.sendPhoto(msg.chat.id, result.path, { caption: '📸 Screenshot' });
    setTimeout(() => fs.unlinkSync(result.path), 5000);
  } else {
    await bot.sendMessage(msg.chat.id, result);
  }
});

// /janelas
bot.onText(/^\/(janelas|windows|wlist)$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await getWindowList();
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

// /focar janela
bot.onText(/^\/(focar|focus|janela) (.+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await focusWindow(match[2]);
  await bot.sendMessage(msg.chat.id, result);
});

// /ativa - Janela ativa
bot.onText(/^\/(ativa|active)$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await getActiveWindow();
  await bot.sendMessage(msg.chat.id, result);
});

// /resolucao
bot.onText(/^\/(resolucao|resolution|res)$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await getScreenResolution();
  await bot.sendMessage(msg.chat.id, result);
});

// ============================================
// HANDLERS - SISTEMA
// ============================================

bot.onText(/^\/(start|help|ajuda)$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, '❌ Acesso negado. ID: ' + msg.from.id);
  }
  
  const help = `🤖 *OrangePi 6 Plus - CONTROLE TOTAL*

━━━━ 🖱️ *MOUSE* ━━━━
/mouse X Y - Mover para posição
/mouse - Ver posição atual
/mrel X Y - Movimento relativo
/click - Clique esquerdo
/click r - Clique direito
/click X Y - Clicar em posição
/dclick - Duplo clique
/rclick - Clique direito
/scroll up/down - Rolar
/arrastar X1 Y1 X2 Y2

━━━━ ⌨️ *TECLADO* ━━━━
/digitar texto - Digitar texto
/tecla enter - Pressionar tecla
/tecla ctrl+c - Combo de teclas
/atalho copiar - Atalho pré-definido
/atalhos - Ver todos atalhos
/enter /esc /tab /space

━━━━ 📸 *TELA* ━━━━
/tela - Screenshot
/janelas - Listar janelas
/focar nome - Focar janela
/ativa - Janela ativa
/resolucao - Resolução

━━━━ 💻 *SISTEMA* ━━━━
/status - Status geral
/exec cmd - Executar comando
/gpio N out 0/1 - Controlar GPIO

━━━━ 💬 *IA* ━━━━
Envie qualquer mensagem!`;

  await bot.sendMessage(msg.chat.id, help, { parse_mode: 'Markdown' });
});

bot.onText(/^\/status$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const status = await getSystemStatus();
  await bot.sendMessage(msg.chat.id, status, { parse_mode: 'Markdown' });
});

bot.onText(/^\/exec (.+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const cmd = match[1];
  
  if (needsConfirmation(cmd)) {
    STATE.pendingConfirmation.set(`exec_${msg.chat.id}`, { cmd, expires: Date.now() + 30000 });
    return bot.sendMessage(msg.chat.id, `⚠️ Confirmar: \`${cmd}\`\n/confirmar ou /cancelar`, { parse_mode: 'Markdown' });
  }
  
  await sendTyping(msg.chat.id);
  const result = await executeCommand(cmd);
  await bot.sendMessage(msg.chat.id, `\`\`\`\n${result}\n\`\`\``, { parse_mode: 'Markdown' });
});

bot.onText(/^\/confirmar$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const key = `exec_${msg.chat.id}`;
  const pending = STATE.pendingConfirmation.get(key);
  
  if (pending && pending.expires > Date.now()) {
    STATE.pendingConfirmation.delete(key);
    await sendTyping(msg.chat.id);
    const result = await executeCommand(pending.cmd, 120000);
    await bot.sendMessage(msg.chat.id, `\`\`\`\n${result}\n\`\`\``, { parse_mode: 'Markdown' });
  } else {
    await bot.sendMessage(msg.chat.id, 'ℹ️ Nenhuma ação pendente');
  }
});

bot.onText(/^\/cancelar$/i, async (msg) => {
  STATE.pendingConfirmation.delete(`exec_${msg.chat.id}`);
  await bot.sendMessage(msg.chat.id, '❌ Cancelado');
});

// GPIO
bot.onText(/^\/gpio (\d+) out ([01])$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await writeGpio(parseInt(match[1]), parseInt(match[2]));
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/gpio (\d+) in$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await readGpio(parseInt(match[1]));
  await bot.sendMessage(msg.chat.id, result);
});

// ============================================
// HANDLER - IA (MENSAGENS GERAIS)
// ============================================

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  
  if (text.startsWith('/')) return;
  if (!isAllowed(msg.from.id)) return;
  if (!text.trim()) return;
  
  console.log(`📩 [${msg.from.id}] ${text.slice(0, 50)}...`);
  await sendTyping(chatId);
  
  try {
    const response = await askOllama(text, chatId, SYSTEM_PROMPT);
    
    if (response.length > 4000) {
      const parts = response.match(/.{1,4000}/gs) || [];
      for (const part of parts) await bot.sendMessage(chatId, part);
    } else {
      await bot.sendMessage(chatId, response);
    }
  } catch (error) {
    await bot.sendMessage(chatId, `❌ ${error.message}`);
  }
});

// ============================================
// INICIALIZAÇÃO
// ============================================

console.log('✅ Bot iniciado!');
console.log('🖱️ Mouse e ⌨️ Teclado prontos');
console.log('');

process.on('SIGINT', () => { console.log('\n👋 Encerrando...'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\n👋 Encerrando...'); process.exit(0); });

// Limpeza de pendências
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of STATE.pendingConfirmation.entries()) {
    if (val.expires < now) STATE.pendingConfirmation.delete(key);
  }
}, 60000);
