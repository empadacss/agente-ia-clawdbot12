/**
 * ============================================
 * 🔧 TOOLS - Ferramentas do Agente Claude
 * ============================================
 * Implementação de todas as ferramentas disponíveis
 * para o agente executar ações no sistema
 * ============================================
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

const execAsync = util.promisify(exec);

// ============================================
// MAPEAMENTOS
// ============================================

const KEY_MAP = {
  'enter': 'Return', 'return': 'Return',
  'esc': 'Escape', 'escape': 'Escape',
  'tab': 'Tab', 'space': 'space',
  'backspace': 'BackSpace', 'delete': 'Delete',
  'up': 'Up', 'down': 'Down', 'left': 'Left', 'right': 'Right',
  'home': 'Home', 'end': 'End',
  'pageup': 'Page_Up', 'pagedown': 'Page_Down',
  'f1': 'F1', 'f2': 'F2', 'f3': 'F3', 'f4': 'F4',
  'f5': 'F5', 'f6': 'F6', 'f7': 'F7', 'f8': 'F8',
  'f9': 'F9', 'f10': 'F10', 'f11': 'F11', 'f12': 'F12',
  'print': 'Print', 'pause': 'Pause',
  'insert': 'Insert', 'capslock': 'Caps_Lock'
};

const APPS = {
  'navegador': 'chromium-browser || chromium || firefox',
  'chrome': 'chromium-browser || chromium',
  'firefox': 'firefox',
  'terminal': 'x-terminal-emulator || gnome-terminal || xfce4-terminal || xterm',
  'arquivos': 'nautilus || thunar || pcmanfm',
  'editor': 'gedit || mousepad || kate',
  'calculadora': 'gnome-calculator || galculator',
  'vlc': 'vlc',
  'settings': 'gnome-control-center || xfce4-settings-manager',
  'monitor': 'gnome-system-monitor || xfce4-taskmanager',
  'code': 'code || codium',
  'telegram': 'telegram-desktop'
};

// ============================================
// IMPLEMENTAÇÃO DAS FERRAMENTAS
// ============================================

const toolImplementations = {
  // ============ MOUSE ============
  
  async mouse_move({ x, y }) {
    await execAsync(`xdotool mousemove ${x} ${y}`);
    return `Mouse movido para (${x}, ${y})`;
  },
  
  async mouse_click({ button = 'left', count = 1 }) {
    const btnMap = { left: 1, middle: 2, right: 3 };
    const btn = btnMap[button] || 1;
    let cmd = `xdotool click`;
    if (count > 1) cmd += ` --repeat ${count} --delay 50`;
    cmd += ` ${btn}`;
    await execAsync(cmd);
    return `Clique ${button}${count > 1 ? ` (${count}x)` : ''}`;
  },
  
  async mouse_click_at({ x, y, button = 'left' }) {
    const btn = button === 'right' ? 3 : 1;
    await execAsync(`xdotool mousemove ${x} ${y} click ${btn}`);
    return `Clique em (${x}, ${y})`;
  },
  
  async mouse_scroll({ direction, amount = 3 }) {
    const btn = direction === 'up' ? 4 : 5;
    await execAsync(`xdotool click --repeat ${amount} --delay 50 ${btn}`);
    return `Scroll ${direction} (${amount}x)`;
  },
  
  async mouse_drag({ start_x, start_y, end_x, end_y }) {
    await execAsync(`xdotool mousemove ${start_x} ${start_y} mousedown 1 mousemove ${end_x} ${end_y} mouseup 1`);
    return `Arrastado de (${start_x},${start_y}) para (${end_x},${end_y})`;
  },
  
  async mouse_position() {
    const { stdout } = await execAsync('xdotool getmouselocation --shell');
    const match = stdout.match(/X=(\d+)\nY=(\d+)/);
    if (match) {
      return `Posição do mouse: (${match[1]}, ${match[2]})`;
    }
    return 'Não foi possível obter posição';
  },
  
  // ============ TECLADO ============
  
  async type_text({ text, delay = 12 }) {
    const escaped = text.replace(/'/g, "'\\''");
    await execAsync(`xdotool type --delay ${delay} '${escaped}'`);
    return `Digitado: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`;
  },
  
  async press_key({ key }) {
    const mappedKey = KEY_MAP[key.toLowerCase()] || key;
    await execAsync(`xdotool key ${mappedKey}`);
    return `Tecla pressionada: ${key}`;
  },
  
  async press_combo({ combo }) {
    const parts = combo.toLowerCase().split('+');
    const modMap = { 'ctrl': 'ctrl', 'control': 'ctrl', 'alt': 'alt', 'shift': 'shift', 'super': 'super', 'win': 'super' };
    
    const modifiers = parts.slice(0, -1).map(p => modMap[p] || p);
    let key = parts[parts.length - 1];
    key = KEY_MAP[key] || key;
    
    const xdotoolCombo = [...modifiers, key].join('+');
    await execAsync(`xdotool key ${xdotoolCombo}`);
    return `Combo pressionado: ${combo}`;
  },
  
  // ============ APLICATIVOS ============
  
  async open_application({ app_name }) {
    const appLower = app_name.toLowerCase().replace(/\s+/g, '');
    const cmd = APPS[appLower] || app_name;
    
    exec(`(${cmd}) &`, { detached: true });
    await new Promise(r => setTimeout(r, 1000)); // Aguardar app iniciar
    return `Aplicativo aberto: ${app_name}`;
  },
  
  async open_url({ url }) {
    let fullUrl = url;
    if (!url.startsWith('http')) fullUrl = 'https://' + url;
    
    exec(`xdg-open "${fullUrl}" &`, { detached: true });
    await new Promise(r => setTimeout(r, 1500));
    return `URL aberta: ${fullUrl}`;
  },
  
  async run_command({ command, timeout = 30000 }) {
    try {
      const { stdout, stderr } = await execAsync(command, { timeout, maxBuffer: 5 * 1024 * 1024 });
      return stdout || stderr || 'Comando executado (sem saída)';
    } catch (error) {
      if (error.killed) return 'Timeout: comando demorou muito';
      return `Erro: ${error.message}`;
    }
  },
  
  async list_windows() {
    try {
      const { stdout } = await execAsync('wmctrl -l');
      return `Janelas abertas:\n${stdout}`;
    } catch {
      return 'Não foi possível listar janelas (wmctrl não instalado?)';
    }
  },
  
  async focus_window({ window_name }) {
    try {
      await execAsync(`wmctrl -a "${window_name}"`);
      return `Janela focada: ${window_name}`;
    } catch {
      // Tentar com xdotool
      try {
        await execAsync(`xdotool search --name "${window_name}" windowactivate`);
        return `Janela focada: ${window_name}`;
      } catch {
        return `Janela não encontrada: ${window_name}`;
      }
    }
  },
  
  async close_window() {
    await execAsync('xdotool key alt+F4');
    return 'Janela fechada';
  },
  
  async minimize_window() {
    await execAsync('xdotool getactivewindow windowminimize');
    return 'Janela minimizada';
  },
  
  async maximize_window() {
    await execAsync('wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz');
    return 'Janela maximizada';
  },
  
  // ============ WEB E PESQUISA ============
  
  async search_google({ query }) {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    exec(`xdg-open "${url}" &`, { detached: true });
    await new Promise(r => setTimeout(r, 2000));
    return `Pesquisa Google: ${query}`;
  },
  
  async search_youtube({ query }) {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    exec(`xdg-open "${url}" &`, { detached: true });
    await new Promise(r => setTimeout(r, 2000));
    return `Pesquisa YouTube: ${query}`;
  },
  
  // ============ TELA E VISÃO ============
  
  async take_screenshot() {
    const filepath = `/tmp/screenshot-${Date.now()}.png`;
    
    try {
      await execAsync(`scrot ${filepath}`);
    } catch {
      try {
        await execAsync(`DISPLAY=:0 import -window root ${filepath}`);
      } catch (error) {
        return { error: `Erro ao capturar tela: ${error.message}` };
      }
    }
    
    // Ler imagem e converter para base64
    const imageData = fs.readFileSync(filepath);
    const base64 = imageData.toString('base64');
    
    // Limpar arquivo
    setTimeout(() => { try { fs.unlinkSync(filepath); } catch {} }, 5000);
    
    return {
      type: 'image',
      data: base64,
      path: filepath
    };
  },
  
  async get_screen_resolution() {
    try {
      const { stdout } = await execAsync("xdpyinfo | grep dimensions");
      const match = stdout.match(/(\d+x\d+)/);
      return `Resolução: ${match ? match[1] : 'N/A'}`;
    } catch {
      return 'Não foi possível obter resolução';
    }
  },
  
  async get_active_window() {
    try {
      const { stdout: name } = await execAsync('xdotool getactivewindow getwindowname');
      const { stdout: geo } = await execAsync('xdotool getactivewindow getwindowgeometry');
      return `Janela ativa: ${name.trim()}\n${geo}`;
    } catch {
      return 'Não foi possível obter janela ativa';
    }
  },
  
  // ============ SISTEMA ============
  
  async get_system_status() {
    const cpuUsage = await getCpuUsage();
    const memInfo = getMemoryInfo();
    const diskInfo = await getDiskInfo();
    const temp = await getTemperature();
    const uptime = getUptime();
    const ip = getLocalIP();
    
    return `📊 STATUS DO SISTEMA

🖥️ CPU: ${cpuUsage}%
💾 RAM: ${memInfo.used}MB / ${memInfo.total}MB (${memInfo.percent}%)
💿 Disco: ${diskInfo.used} / ${diskInfo.total} (${diskInfo.percent})
🌡️ Temperatura: ${temp}°C
⏱️ Uptime: ${uptime}
🌐 IP: ${ip}
📍 Hostname: ${os.hostname()}`;
  },
  
  async list_files({ path: dirPath = '.' }) {
    try {
      const { stdout } = await execAsync(`ls -lahF "${dirPath}" | head -50`);
      return `Arquivos em ${dirPath}:\n${stdout}`;
    } catch (error) {
      return `Erro: ${error.message}`;
    }
  },
  
  async read_file({ path: filePath }) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return content.slice(0, 10000); // Limitar a 10KB
    } catch (error) {
      return `Erro ao ler arquivo: ${error.message}`;
    }
  },
  
  async write_file({ path: filePath, content }) {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      return `Arquivo salvo: ${filePath}`;
    } catch (error) {
      return `Erro ao escrever arquivo: ${error.message}`;
    }
  },
  
  // ============ UTILIDADES ============
  
  async wait({ seconds }) {
    await new Promise(r => setTimeout(r, seconds * 1000));
    return `Aguardou ${seconds} segundos`;
  }
};

// ============================================
// FUNÇÕES AUXILIARES DE SISTEMA
// ============================================

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
  } catch {
    return { used: 'N/A', total: 'N/A', available: 'N/A', percent: 'N/A' };
  }
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
// EXECUTOR DE FERRAMENTAS
// ============================================

async function execute(toolName, toolInput) {
  const handler = toolImplementations[toolName];
  
  if (!handler) {
    throw new Error(`Ferramenta não encontrada: ${toolName}`);
  }
  
  return await handler(toolInput);
}

module.exports = {
  execute,
  implementations: toolImplementations,
  definitions: toolImplementations
};
