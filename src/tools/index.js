/**
 * ============================================
 * 🔧 TOOLS - Ferramentas para o Claude Agent
 * ============================================
 * Todas as ferramentas que o Claude pode usar
 * via Tool Use (Function Calling)
 * ============================================
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

const execAsync = util.promisify(exec);

// ============================================
// 🖱️ MOUSE TOOLS
// ============================================

const mouseTools = [
  {
    name: 'mouse_move',
    description: 'Move o cursor do mouse para uma posição específica na tela',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'integer', description: 'Posição X (horizontal)' },
        y: { type: 'integer', description: 'Posição Y (vertical)' }
      },
      required: ['x', 'y']
    },
    async handler({ x, y }) {
      await execAsync(`xdotool mousemove ${x} ${y}`);
      return { success: true, position: { x, y } };
    }
  },
  
  {
    name: 'mouse_move_relative',
    description: 'Move o cursor do mouse relativamente à posição atual',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'integer', description: 'Movimento X (pode ser negativo)' },
        y: { type: 'integer', description: 'Movimento Y (pode ser negativo)' }
      },
      required: ['x', 'y']
    },
    async handler({ x, y }) {
      await execAsync(`xdotool mousemove_relative -- ${x} ${y}`);
      return { success: true, moved: { x, y } };
    }
  },
  
  {
    name: 'mouse_click',
    description: 'Realiza um clique do mouse. Botões: left, right, middle',
    parameters: {
      type: 'object',
      properties: {
        button: { 
          type: 'string', 
          enum: ['left', 'right', 'middle'],
          description: 'Botão do mouse'
        },
        count: { type: 'integer', description: 'Número de cliques (1 para simples, 2 para duplo)', default: 1 }
      },
      required: []
    },
    async handler({ button = 'left', count = 1 }) {
      const btnMap = { left: 1, middle: 2, right: 3 };
      const btn = btnMap[button] || 1;
      let cmd = `xdotool click`;
      if (count > 1) cmd += ` --repeat ${count} --delay 50`;
      cmd += ` ${btn}`;
      await execAsync(cmd);
      return { success: true, button, count };
    }
  },
  
  {
    name: 'mouse_click_at',
    description: 'Move o mouse para uma posição e clica',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'integer', description: 'Posição X' },
        y: { type: 'integer', description: 'Posição Y' },
        button: { type: 'string', enum: ['left', 'right', 'middle'], default: 'left' }
      },
      required: ['x', 'y']
    },
    async handler({ x, y, button = 'left' }) {
      const btn = button === 'right' ? 3 : button === 'middle' ? 2 : 1;
      await execAsync(`xdotool mousemove ${x} ${y} click ${btn}`);
      return { success: true, position: { x, y }, button };
    }
  },
  
  {
    name: 'mouse_scroll',
    description: 'Rola o scroll do mouse',
    parameters: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['up', 'down'], description: 'Direção do scroll' },
        amount: { type: 'integer', description: 'Quantidade de cliques de scroll', default: 3 }
      },
      required: ['direction']
    },
    async handler({ direction, amount = 3 }) {
      const btn = direction === 'up' ? 4 : 5;
      await execAsync(`xdotool click --repeat ${amount} --delay 50 ${btn}`);
      return { success: true, direction, amount };
    }
  },
  
  {
    name: 'mouse_drag',
    description: 'Arrasta o mouse de uma posição para outra',
    parameters: {
      type: 'object',
      properties: {
        startX: { type: 'integer', description: 'Posição X inicial' },
        startY: { type: 'integer', description: 'Posição Y inicial' },
        endX: { type: 'integer', description: 'Posição X final' },
        endY: { type: 'integer', description: 'Posição Y final' }
      },
      required: ['startX', 'startY', 'endX', 'endY']
    },
    async handler({ startX, startY, endX, endY }) {
      await execAsync(`xdotool mousemove ${startX} ${startY} mousedown 1 mousemove ${endX} ${endY} mouseup 1`);
      return { success: true, from: { x: startX, y: startY }, to: { x: endX, y: endY } };
    }
  },
  
  {
    name: 'mouse_get_position',
    description: 'Obtém a posição atual do cursor do mouse',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      const { stdout } = await execAsync('xdotool getmouselocation --shell');
      const match = stdout.match(/X=(\d+)\nY=(\d+)/);
      if (match) {
        return { x: parseInt(match[1]), y: parseInt(match[2]) };
      }
      return { error: 'Não foi possível obter posição' };
    }
  }
];

// ============================================
// ⌨️ KEYBOARD TOOLS
// ============================================

const keyboardTools = [
  {
    name: 'keyboard_type',
    description: 'Digita um texto no campo ativo',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Texto para digitar' },
        delay: { type: 'integer', description: 'Delay entre teclas em ms', default: 12 }
      },
      required: ['text']
    },
    async handler({ text, delay = 12 }) {
      const escaped = text.replace(/'/g, "'\\''");
      await execAsync(`xdotool type --delay ${delay} '${escaped}'`);
      return { success: true, typed: text.length + ' caracteres' };
    }
  },
  
  {
    name: 'keyboard_press',
    description: 'Pressiona uma tecla específica (enter, esc, tab, f1-f12, up, down, left, right, etc)',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Nome da tecla' }
      },
      required: ['key']
    },
    async handler({ key }) {
      const keyMap = {
        'enter': 'Return', 'return': 'Return',
        'esc': 'Escape', 'escape': 'Escape',
        'tab': 'Tab', 'space': 'space',
        'backspace': 'BackSpace', 'delete': 'Delete',
        'up': 'Up', 'down': 'Down', 'left': 'Left', 'right': 'Right',
        'home': 'Home', 'end': 'End',
        'pageup': 'Page_Up', 'pagedown': 'Page_Down',
        'f1': 'F1', 'f2': 'F2', 'f3': 'F3', 'f4': 'F4',
        'f5': 'F5', 'f6': 'F6', 'f7': 'F7', 'f8': 'F8',
        'f9': 'F9', 'f10': 'F10', 'f11': 'F11', 'f12': 'F12'
      };
      const mappedKey = keyMap[key.toLowerCase()] || key;
      await execAsync(`xdotool key ${mappedKey}`);
      return { success: true, key };
    }
  },
  
  {
    name: 'keyboard_combo',
    description: 'Pressiona uma combinação de teclas (ex: ctrl+c, alt+tab, ctrl+shift+esc)',
    parameters: {
      type: 'object',
      properties: {
        combo: { type: 'string', description: 'Combinação de teclas separadas por +' }
      },
      required: ['combo']
    },
    async handler({ combo }) {
      // Converter para formato xdotool
      const parts = combo.toLowerCase().split('+');
      const modMap = { 'ctrl': 'ctrl', 'control': 'ctrl', 'alt': 'alt', 'shift': 'shift', 'super': 'super', 'win': 'super', 'meta': 'super' };
      const keyMap = { 'c': 'c', 'v': 'v', 'x': 'x', 'z': 'z', 'a': 'a', 's': 's', 'tab': 'Tab', 'd': 'd', 'f4': 'F4', 'f5': 'F5', 'esc': 'Escape', 'escape': 'Escape' };
      
      const converted = parts.map((p, i) => {
        if (i < parts.length - 1) return modMap[p] || p;
        return keyMap[p] || p;
      }).join('+');
      
      await execAsync(`xdotool key ${converted}`);
      return { success: true, combo };
    }
  },
  
  {
    name: 'keyboard_shortcut',
    description: 'Executa um atalho pré-definido (copiar, colar, cortar, salvar, desfazer, alternar, fechar, desktop, terminal)',
    parameters: {
      type: 'object',
      properties: {
        name: { 
          type: 'string', 
          enum: ['copiar', 'colar', 'cortar', 'salvar', 'desfazer', 'refazer', 'selecionartudo', 'fechar', 'alternar', 'desktop', 'terminal', 'buscar', 'novaguia', 'atualizar', 'telacheia'],
          description: 'Nome do atalho'
        }
      },
      required: ['name']
    },
    async handler({ name }) {
      const shortcuts = {
        'copiar': 'ctrl+c', 'colar': 'ctrl+v', 'cortar': 'ctrl+x',
        'salvar': 'ctrl+s', 'desfazer': 'ctrl+z', 'refazer': 'ctrl+y',
        'selecionartudo': 'ctrl+a', 'fechar': 'alt+F4', 'alternar': 'alt+Tab',
        'desktop': 'super+d', 'terminal': 'ctrl+alt+t', 'buscar': 'ctrl+f',
        'novaguia': 'ctrl+t', 'atualizar': 'F5', 'telacheia': 'F11'
      };
      const combo = shortcuts[name.toLowerCase()];
      if (!combo) return { error: 'Atalho não encontrado' };
      await execAsync(`xdotool key ${combo}`);
      return { success: true, shortcut: name, combo };
    }
  }
];

// ============================================
// 🚀 APPLICATION TOOLS
// ============================================

const appTools = [
  {
    name: 'app_open',
    description: 'Abre um aplicativo pelo nome (navegador, terminal, arquivos, editor, calculadora, vlc, vscode, etc)',
    parameters: {
      type: 'object',
      properties: {
        app: { type: 'string', description: 'Nome do aplicativo' }
      },
      required: ['app']
    },
    async handler({ app }) {
      const apps = {
        'navegador': 'chromium-browser || chromium || firefox',
        'chrome': 'chromium-browser || chromium',
        'firefox': 'firefox',
        'terminal': 'x-terminal-emulator || gnome-terminal || xfce4-terminal',
        'arquivos': 'nautilus || thunar || pcmanfm',
        'editor': 'gedit || mousepad || kate',
        'calculadora': 'gnome-calculator || galculator',
        'vlc': 'vlc',
        'vscode': 'code || codium',
        'configuracoes': 'gnome-control-center || xfce4-settings-manager'
      };
      
      const cmd = apps[app.toLowerCase()] || app;
      exec(`(${cmd}) &`, { detached: true });
      return { success: true, app };
    }
  },
  
  {
    name: 'app_open_url',
    description: 'Abre uma URL no navegador padrão',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL para abrir' }
      },
      required: ['url']
    },
    async handler({ url }) {
      let fullUrl = url;
      if (!url.startsWith('http')) fullUrl = 'https://' + url;
      exec(`xdg-open "${fullUrl}" &`, { detached: true });
      return { success: true, url: fullUrl };
    }
  },
  
  {
    name: 'app_open_file',
    description: 'Abre um arquivo com o aplicativo padrão',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho do arquivo' }
      },
      required: ['path']
    },
    async handler({ path }) {
      exec(`xdg-open "${path}" &`, { detached: true });
      return { success: true, path };
    }
  },
  
  {
    name: 'window_list',
    description: 'Lista todas as janelas abertas',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      try {
        const { stdout } = await execAsync('wmctrl -l');
        const windows = stdout.trim().split('\n').map(line => {
          const parts = line.split(/\s+/);
          return { id: parts[0], desktop: parts[1], name: parts.slice(3).join(' ') };
        });
        return { windows };
      } catch (error) {
        return { error: error.message };
      }
    }
  },
  
  {
    name: 'window_focus',
    description: 'Foca em uma janela pelo nome',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome ou parte do nome da janela' }
      },
      required: ['name']
    },
    async handler({ name }) {
      await execAsync(`wmctrl -a "${name}"`);
      return { success: true, focused: name };
    }
  },
  
  {
    name: 'window_close',
    description: 'Fecha a janela ativa',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      await execAsync('wmctrl -c :ACTIVE:');
      return { success: true };
    }
  },
  
  {
    name: 'window_minimize',
    description: 'Minimiza a janela ativa',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      await execAsync('xdotool getactivewindow windowminimize');
      return { success: true };
    }
  },
  
  {
    name: 'window_maximize',
    description: 'Maximiza a janela ativa',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      await execAsync('wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz');
      return { success: true };
    }
  }
];

// ============================================
// 🌐 WEB SEARCH TOOLS
// ============================================

const webTools = [
  {
    name: 'web_search_google',
    description: 'Pesquisa algo no Google',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Termo de pesquisa' }
      },
      required: ['query']
    },
    async handler({ query }) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      exec(`xdg-open "${url}" &`, { detached: true });
      return { success: true, query, url };
    }
  },
  
  {
    name: 'web_search_youtube',
    description: 'Pesquisa um vídeo no YouTube',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Termo de pesquisa' }
      },
      required: ['query']
    },
    async handler({ query }) {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      exec(`xdg-open "${url}" &`, { detached: true });
      return { success: true, query, url };
    }
  },
  
  {
    name: 'web_search_wikipedia',
    description: 'Pesquisa na Wikipedia',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Termo de pesquisa' }
      },
      required: ['query']
    },
    async handler({ query }) {
      const url = `https://pt.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`;
      exec(`xdg-open "${url}" &`, { detached: true });
      return { success: true, query, url };
    }
  },
  
  {
    name: 'web_search_maps',
    description: 'Pesquisa um local no Google Maps',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Local ou endereço' }
      },
      required: ['query']
    },
    async handler({ query }) {
      const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
      exec(`xdg-open "${url}" &`, { detached: true });
      return { success: true, query, url };
    }
  }
];

// ============================================
// 📸 SCREEN TOOLS
// ============================================

const screenTools = [
  {
    name: 'screen_screenshot',
    description: 'Captura uma screenshot da tela inteira',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      const filepath = `/tmp/screenshot-${Date.now()}.png`;
      try {
        await execAsync(`scrot ${filepath}`);
      } catch {
        await execAsync(`DISPLAY=:0 import -window root ${filepath}`);
      }
      
      // Retornar em base64 para o Claude poder ver
      const imageBuffer = fs.readFileSync(filepath);
      const base64 = imageBuffer.toString('base64');
      
      return { 
        success: true, 
        path: filepath,
        base64: base64,
        message: 'Screenshot capturada. A imagem foi anexada para análise.'
      };
    }
  },
  
  {
    name: 'screen_get_resolution',
    description: 'Obtém a resolução da tela',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      const { stdout } = await execAsync("xdpyinfo | grep dimensions");
      const match = stdout.match(/(\d+)x(\d+)/);
      if (match) {
        return { width: parseInt(match[1]), height: parseInt(match[2]) };
      }
      return { error: 'Não foi possível obter resolução' };
    }
  },
  
  {
    name: 'screen_get_active_window',
    description: 'Obtém informações da janela ativa',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      const { stdout: name } = await execAsync('xdotool getactivewindow getwindowname');
      const { stdout: geo } = await execAsync('xdotool getactivewindow getwindowgeometry');
      return { name: name.trim(), geometry: geo.trim() };
    }
  }
];

// ============================================
// 📊 SYSTEM TOOLS
// ============================================

const systemTools = [
  {
    name: 'system_status',
    description: 'Obtém status completo do sistema (CPU, RAM, disco, temperatura)',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      const cpuResult = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print int($2+$4)}'").catch(() => ({ stdout: 'N/A' }));
      const diskResult = await execAsync("df -h / | awk 'NR==2{print $3,$2,$4,$5}'").catch(() => ({ stdout: 'N/A' }));
      
      let temp = 'N/A';
      try {
        if (fs.existsSync('/sys/class/thermal/thermal_zone0/temp')) {
          temp = (parseInt(fs.readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf8')) / 1000).toFixed(1);
        }
      } catch {}
      
      const [diskUsed, diskTotal, diskFree, diskPercent] = diskResult.stdout.trim().split(' ');
      const totalMem = Math.round(os.totalmem() / 1024 / 1024);
      const freeMem = Math.round(os.freemem() / 1024 / 1024);
      const usedMem = totalMem - freeMem;
      
      return {
        cpu: { usage: cpuResult.stdout.trim() + '%', cores: os.cpus().length },
        memory: { used: usedMem + 'MB', total: totalMem + 'MB', percent: Math.round((usedMem/totalMem)*100) + '%' },
        disk: { used: diskUsed, total: diskTotal, free: diskFree, percent: diskPercent },
        temperature: temp + '°C',
        uptime: this.formatUptime(os.uptime()),
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch()
      };
    },
    
    formatUptime(seconds) {
      const d = Math.floor(seconds / 86400);
      const h = Math.floor((seconds % 86400) / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${d}d ${h}h ${m}m`;
    }
  },
  
  {
    name: 'system_run_command',
    description: 'Executa um comando no terminal',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Comando para executar' },
        timeout: { type: 'integer', description: 'Timeout em ms', default: 30000 }
      },
      required: ['command']
    },
    async handler({ command, timeout = 30000 }) {
      // Verificar comandos perigosos
      const dangerous = ['rm -rf /', 'mkfs', 'dd if=/dev/zero', ':(){:|:&};:'];
      if (dangerous.some(d => command.toLowerCase().includes(d))) {
        return { error: 'Comando bloqueado por segurança' };
      }
      
      try {
        const { stdout, stderr } = await execAsync(command, { timeout, maxBuffer: 5 * 1024 * 1024 });
        return { success: true, stdout: stdout.slice(0, 4000), stderr: stderr.slice(0, 1000) };
      } catch (error) {
        return { error: error.message };
      }
    }
  },
  
  {
    name: 'system_list_processes',
    description: 'Lista os processos ordenados por uso de memória',
    parameters: {
      type: 'object',
      properties: {
        count: { type: 'integer', description: 'Número de processos', default: 10 }
      },
      required: []
    },
    async handler({ count = 10 }) {
      const { stdout } = await execAsync(`ps aux --sort=-%mem | head -${count + 1}`);
      return { processes: stdout };
    }
  },
  
  {
    name: 'system_service_control',
    description: 'Controla um serviço systemd (start, stop, restart, status)',
    parameters: {
      type: 'object',
      properties: {
        service: { type: 'string', description: 'Nome do serviço' },
        action: { type: 'string', enum: ['start', 'stop', 'restart', 'status', 'enable', 'disable'] }
      },
      required: ['service', 'action']
    },
    async handler({ service, action }) {
      try {
        const { stdout } = await execAsync(`sudo systemctl ${action} ${service}`);
        return { success: true, service, action, output: stdout };
      } catch (error) {
        return { error: error.message };
      }
    }
  }
];

// ============================================
// 📍 GPIO TOOLS
// ============================================

const gpioTools = [
  {
    name: 'gpio_write',
    description: 'Define o valor de um pino GPIO (saída)',
    parameters: {
      type: 'object',
      properties: {
        pin: { type: 'integer', description: 'Número do pino GPIO' },
        value: { type: 'integer', enum: [0, 1], description: 'Valor (0 ou 1)' }
      },
      required: ['pin', 'value']
    },
    async handler({ pin, value }) {
      const basePath = '/sys/class/gpio';
      try {
        if (!fs.existsSync(`${basePath}/gpio${pin}`)) {
          fs.writeFileSync(`${basePath}/export`, pin.toString());
          await new Promise(r => setTimeout(r, 100));
        }
        fs.writeFileSync(`${basePath}/gpio${pin}/direction`, 'out');
        fs.writeFileSync(`${basePath}/gpio${pin}/value`, value.toString());
        return { success: true, pin, value };
      } catch (error) {
        return { error: error.message };
      }
    }
  },
  
  {
    name: 'gpio_read',
    description: 'Lê o valor de um pino GPIO (entrada)',
    parameters: {
      type: 'object',
      properties: {
        pin: { type: 'integer', description: 'Número do pino GPIO' }
      },
      required: ['pin']
    },
    async handler({ pin }) {
      const basePath = '/sys/class/gpio';
      try {
        if (!fs.existsSync(`${basePath}/gpio${pin}`)) {
          fs.writeFileSync(`${basePath}/export`, pin.toString());
          await new Promise(r => setTimeout(r, 100));
        }
        fs.writeFileSync(`${basePath}/gpio${pin}/direction`, 'in');
        const value = parseInt(fs.readFileSync(`${basePath}/gpio${pin}/value`, 'utf8').trim());
        return { success: true, pin, value };
      } catch (error) {
        return { error: error.message };
      }
    }
  }
];

// ============================================
// 📁 FILE TOOLS
// ============================================

const fileTools = [
  {
    name: 'file_read',
    description: 'Lê o conteúdo de um arquivo',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho do arquivo' },
        encoding: { type: 'string', default: 'utf8' }
      },
      required: ['path']
    },
    async handler({ path: filePath, encoding = 'utf8' }) {
      try {
        const content = fs.readFileSync(filePath, encoding);
        return { content: content.slice(0, 10000) };
      } catch (error) {
        return { error: error.message };
      }
    }
  },
  
  {
    name: 'file_write',
    description: 'Escreve conteúdo em um arquivo',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho do arquivo' },
        content: { type: 'string', description: 'Conteúdo a escrever' },
        append: { type: 'boolean', default: false }
      },
      required: ['path', 'content']
    },
    async handler({ path: filePath, content, append = false }) {
      try {
        if (append) {
          fs.appendFileSync(filePath, content);
        } else {
          fs.writeFileSync(filePath, content);
        }
        return { success: true, path: filePath };
      } catch (error) {
        return { error: error.message };
      }
    }
  },
  
  {
    name: 'file_list',
    description: 'Lista arquivos em um diretório',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho do diretório', default: '.' }
      },
      required: []
    },
    async handler({ path: dirPath = '.' }) {
      try {
        const files = fs.readdirSync(dirPath).map(name => {
          const fullPath = path.join(dirPath, name);
          const stat = fs.statSync(fullPath);
          return {
            name,
            type: stat.isDirectory() ? 'directory' : 'file',
            size: stat.size
          };
        });
        return { files };
      } catch (error) {
        return { error: error.message };
      }
    }
  },
  
  {
    name: 'file_delete',
    description: 'Deleta um arquivo',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho do arquivo' }
      },
      required: ['path']
    },
    async handler({ path: filePath }) {
      try {
        fs.unlinkSync(filePath);
        return { success: true, deleted: filePath };
      } catch (error) {
        return { error: error.message };
      }
    }
  },
  
  {
    name: 'file_mkdir',
    description: 'Cria um diretório',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho do diretório' }
      },
      required: ['path']
    },
    async handler({ path: dirPath }) {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
        return { success: true, created: dirPath };
      } catch (error) {
        return { error: error.message };
      }
    }
  }
];

// ============================================
// 📦 IMPORTAR BROWSER TOOLS
// ============================================

let browserTools = [];
try {
  const browser = require('./browser-tools');
  browserTools = browser.browserTools || [];
} catch {
  console.log('⚠️ Browser tools não disponíveis');
}

// ============================================
// 💾 IMPORTAR MEMORY TOOLS
// ============================================

let memoryTools = [];
try {
  const memModule = require('./memory-tools');
  memoryTools = memModule.memoryTools || [];
} catch {
  console.log('⚠️ Memory tools não disponíveis');
}

// ============================================
// EXPORTAR TODAS AS FERRAMENTAS
// ============================================

module.exports = {
  mouseTools,
  keyboardTools,
  appTools,
  webTools,
  screenTools,
  systemTools,
  gpioTools,
  fileTools,
  browserTools,
  memoryTools,
  
  // Todas as ferramentas em um array
  getAllTools() {
    return [
      ...mouseTools,
      ...keyboardTools,
      ...appTools,
      ...webTools,
      ...screenTools,
      ...systemTools,
      ...gpioTools,
      ...fileTools,
      ...browserTools,
      ...memoryTools
    ];
  }
};
