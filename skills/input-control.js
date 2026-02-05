/**
 * 🖱️⌨️ INPUT CONTROL SKILL
 * Controle completo de Mouse e Teclado
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Mapeamento de teclas
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
  'print': 'Print', 'pause': 'Pause'
};

// Atalhos pré-definidos
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
  'buscar': 'ctrl+f', 'find': 'ctrl+f',
  'novaguia': 'ctrl+t', 'newtab': 'ctrl+t',
  'fechaguia': 'ctrl+w', 'closetab': 'ctrl+w',
  'atualizar': 'F5', 'refresh': 'F5',
  'telacheia': 'F11', 'fullscreen': 'F11'
};

module.exports = {
  name: 'input-control',
  description: 'Controle de Mouse e Teclado',
  
  actions: {
    // ============ MOUSE ============
    
    mouseMove: {
      description: 'Mover o mouse para uma posição X Y',
      parameters: {
        x: { type: 'number', required: true, description: 'Posição X' },
        y: { type: 'number', required: true, description: 'Posição Y' }
      },
      async handler({ x, y }) {
        await execAsync(`xdotool mousemove ${x} ${y}`);
        return `🖱️ Mouse movido para (${x}, ${y})`;
      }
    },
    
    mouseMoveRelative: {
      description: 'Mover o mouse relativamente',
      parameters: {
        x: { type: 'number', required: true },
        y: { type: 'number', required: true }
      },
      async handler({ x, y }) {
        await execAsync(`xdotool mousemove_relative -- ${x} ${y}`);
        return `🖱️ Mouse movido relativamente (${x}, ${y})`;
      }
    },
    
    mouseClick: {
      description: 'Clicar com o mouse. Botão: left, right, middle',
      parameters: {
        button: { type: 'string', default: 'left' },
        count: { type: 'number', default: 1 }
      },
      async handler({ button = 'left', count = 1 }) {
        const btnMap = { left: 1, middle: 2, right: 3, l: 1, m: 2, r: 3 };
        const btn = btnMap[button.toLowerCase()] || 1;
        let cmd = `xdotool click`;
        if (count > 1) cmd += ` --repeat ${count} --delay 50`;
        cmd += ` ${btn}`;
        await execAsync(cmd);
        return `🖱️ Click ${button} ${count > 1 ? `(${count}x)` : ''}`;
      }
    },
    
    mouseClickAt: {
      description: 'Clicar em uma posição específica',
      parameters: {
        x: { type: 'number', required: true },
        y: { type: 'number', required: true },
        button: { type: 'string', default: 'left' }
      },
      async handler({ x, y, button = 'left' }) {
        const btn = button === 'right' ? 3 : button === 'middle' ? 2 : 1;
        await execAsync(`xdotool mousemove ${x} ${y} click ${btn}`);
        return `🖱️ Click em (${x}, ${y})`;
      }
    },
    
    mouseDoubleClick: {
      description: 'Duplo clique',
      async handler() {
        await execAsync('xdotool click --repeat 2 --delay 50 1');
        return '🖱️ Duplo clique';
      }
    },
    
    mouseScroll: {
      description: 'Rolar o mouse. Direção: up ou down',
      parameters: {
        direction: { type: 'string', required: true },
        amount: { type: 'number', default: 3 }
      },
      async handler({ direction, amount = 3 }) {
        const btn = direction.toLowerCase() === 'up' ? 4 : 5;
        await execAsync(`xdotool click --repeat ${amount} --delay 50 ${btn}`);
        return `🖱️ Scroll ${direction} (${amount}x)`;
      }
    },
    
    mouseDrag: {
      description: 'Arrastar o mouse de um ponto a outro',
      parameters: {
        startX: { type: 'number', required: true },
        startY: { type: 'number', required: true },
        endX: { type: 'number', required: true },
        endY: { type: 'number', required: true }
      },
      async handler({ startX, startY, endX, endY }) {
        await execAsync(`xdotool mousemove ${startX} ${startY} mousedown 1 mousemove ${endX} ${endY} mouseup 1`);
        return `🖱️ Arrastado de (${startX},${startY}) para (${endX},${endY})`;
      }
    },
    
    mousePosition: {
      description: 'Obter posição atual do mouse',
      async handler() {
        const { stdout } = await execAsync('xdotool getmouselocation --shell');
        const match = stdout.match(/X=(\d+)\nY=(\d+)/);
        if (match) {
          return `🖱️ Posição: (${match[1]}, ${match[2]})`;
        }
        return '❌ Não foi possível obter posição';
      }
    },
    
    // ============ TECLADO ============
    
    type: {
      description: 'Digitar um texto',
      parameters: {
        text: { type: 'string', required: true, description: 'Texto para digitar' }
      },
      async handler({ text }) {
        const escaped = text.replace(/'/g, "'\\''");
        await execAsync(`xdotool type --delay 12 '${escaped}'`);
        return `⌨️ Digitado: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`;
      }
    },
    
    pressKey: {
      description: 'Pressionar uma tecla (enter, esc, tab, f1-f12, etc)',
      parameters: {
        key: { type: 'string', required: true }
      },
      async handler({ key }) {
        const mappedKey = KEY_MAP[key.toLowerCase()] || key;
        await execAsync(`xdotool key ${mappedKey}`);
        return `⌨️ Tecla: ${key}`;
      }
    },
    
    pressCombo: {
      description: 'Pressionar combinação de teclas (ex: ctrl+c, alt+tab)',
      parameters: {
        combo: { type: 'string', required: true, description: 'Combinação como ctrl+c, alt+tab' }
      },
      async handler({ combo }) {
        const parts = combo.toLowerCase().split('+');
        const modMap = { 'ctrl': 'ctrl', 'control': 'ctrl', 'alt': 'alt', 'shift': 'shift', 'super': 'super', 'win': 'super' };
        
        const modifiers = parts.slice(0, -1).map(p => modMap[p] || p);
        let key = parts[parts.length - 1];
        key = KEY_MAP[key] || key;
        
        const xdotoolCombo = [...modifiers, key].join('+');
        await execAsync(`xdotool key ${xdotoolCombo}`);
        return `⌨️ Combo: ${combo}`;
      }
    },
    
    shortcut: {
      description: 'Executar atalho pré-definido (copiar, colar, salvar, etc)',
      parameters: {
        name: { type: 'string', required: true, description: 'Nome do atalho' }
      },
      async handler({ name }) {
        const combo = SHORTCUTS[name.toLowerCase().replace(/\s+/g, '')];
        if (!combo) {
          return `❌ Atalho não encontrado. Disponíveis: ${Object.keys(SHORTCUTS).join(', ')}`;
        }
        await execAsync(`xdotool key ${combo}`);
        return `⌨️ Atalho ${name}: ${combo}`;
      }
    },
    
    listShortcuts: {
      description: 'Listar todos os atalhos disponíveis',
      async handler() {
        let list = '⌨️ Atalhos disponíveis:\n\n';
        for (const [name, combo] of Object.entries(SHORTCUTS)) {
          list += `• ${name}: ${combo}\n`;
        }
        return list;
      }
    }
  }
};
