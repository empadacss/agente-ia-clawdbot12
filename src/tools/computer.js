/**
 * ============================================
 * 🖥️ COMPUTER USE TOOL
 * ============================================
 * Controle completo de Mouse, Teclado e Tela
 * Compatível com Claude Computer Use
 * ============================================
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = util.promisify(exec);

// Configurações de tela
const SCREEN = {
  width: 1920,
  height: 1080
};

// Mapeamento de teclas
const KEY_MAP = {
  'Return': 'Return', 'enter': 'Return',
  'Escape': 'Escape', 'esc': 'Escape',
  'Tab': 'Tab', 'tab': 'Tab',
  'space': 'space', ' ': 'space',
  'BackSpace': 'BackSpace', 'backspace': 'BackSpace',
  'Delete': 'Delete', 'delete': 'Delete',
  'Up': 'Up', 'up': 'Up',
  'Down': 'Down', 'down': 'Down',
  'Left': 'Left', 'left': 'Left',
  'Right': 'Right', 'right': 'Right',
  'Home': 'Home', 'home': 'Home',
  'End': 'End', 'end': 'End',
  'Page_Up': 'Page_Up', 'pageup': 'Page_Up',
  'Page_Down': 'Page_Down', 'pagedown': 'Page_Down',
  'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4',
  'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8',
  'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12'
};

/**
 * Capturar screenshot e retornar em base64
 */
async function takeScreenshot() {
  const filepath = `/tmp/screenshot-${Date.now()}.png`;
  
  try {
    // Tentar com scrot primeiro
    await execAsync(`scrot -o ${filepath}`);
  } catch {
    // Fallback para import (ImageMagick)
    try {
      await execAsync(`DISPLAY=:0 import -window root ${filepath}`);
    } catch (error) {
      throw new Error(`Falha ao capturar tela: ${error.message}`);
    }
  }
  
  // Ler arquivo e converter para base64
  const imageBuffer = fs.readFileSync(filepath);
  const base64 = imageBuffer.toString('base64');
  
  // Limpar arquivo temporário
  try { fs.unlinkSync(filepath); } catch {}
  
  // Atualizar dimensões da tela
  try {
    const { stdout } = await execAsync("xdpyinfo | grep dimensions | awk '{print $2}'");
    const [w, h] = stdout.trim().split('x').map(Number);
    if (w && h) {
      SCREEN.width = w;
      SCREEN.height = h;
    }
  } catch {}
  
  return {
    type: 'image',
    mediaType: 'image/png',
    data: base64,
    width: SCREEN.width,
    height: SCREEN.height
  };
}

/**
 * Mover mouse para posição
 */
async function mouseMove(x, y) {
  await execAsync(`xdotool mousemove ${x} ${y}`);
  return { success: true, action: 'mouse_move', x, y };
}

/**
 * Clicar com o mouse
 */
async function mouseClick(button = 'left', clickCount = 1) {
  const buttonMap = { left: 1, middle: 2, right: 3 };
  const btn = buttonMap[button] || 1;
  
  let cmd = `xdotool click`;
  if (clickCount > 1) {
    cmd += ` --repeat ${clickCount} --delay 50`;
  }
  cmd += ` ${btn}`;
  
  await execAsync(cmd);
  return { success: true, action: 'click', button, clickCount };
}

/**
 * Pressionar e soltar botão do mouse
 */
async function mouseDown(button = 'left') {
  const buttonMap = { left: 1, middle: 2, right: 3 };
  await execAsync(`xdotool mousedown ${buttonMap[button] || 1}`);
  return { success: true, action: 'mouse_down', button };
}

async function mouseUp(button = 'left') {
  const buttonMap = { left: 1, middle: 2, right: 3 };
  await execAsync(`xdotool mouseup ${buttonMap[button] || 1}`);
  return { success: true, action: 'mouse_up', button };
}

/**
 * Scroll do mouse
 */
async function scroll(direction, amount = 3) {
  const btn = direction === 'up' ? 4 : 5;
  await execAsync(`xdotool click --repeat ${amount} --delay 50 ${btn}`);
  return { success: true, action: 'scroll', direction, amount };
}

/**
 * Digitar texto
 */
async function typeText(text) {
  // Escapar caracteres especiais
  const escaped = text.replace(/'/g, "'\\''").replace(/"/g, '\\"');
  await execAsync(`xdotool type --delay 12 '${escaped}'`);
  return { success: true, action: 'type', length: text.length };
}

/**
 * Pressionar tecla
 */
async function pressKey(key) {
  const mappedKey = KEY_MAP[key] || key;
  await execAsync(`xdotool key ${mappedKey}`);
  return { success: true, action: 'key', key: mappedKey };
}

/**
 * Pressionar combinação de teclas
 */
async function pressKeyCombo(keys) {
  // keys é um array como ['ctrl', 'c'] ou uma string como 'ctrl+c'
  let combo;
  if (Array.isArray(keys)) {
    combo = keys.map(k => KEY_MAP[k] || k).join('+');
  } else {
    combo = keys.split('+').map(k => KEY_MAP[k.trim()] || k.trim()).join('+');
  }
  
  await execAsync(`xdotool key ${combo}`);
  return { success: true, action: 'key_combo', combo };
}

/**
 * Arrastar mouse
 */
async function drag(startX, startY, endX, endY) {
  await execAsync(`xdotool mousemove ${startX} ${startY} mousedown 1 mousemove ${endX} ${endY} mouseup 1`);
  return { success: true, action: 'drag', from: { x: startX, y: startY }, to: { x: endX, y: endY } };
}

/**
 * Obter posição do cursor
 */
async function getCursorPosition() {
  const { stdout } = await execAsync("xdotool getmouselocation --shell");
  const match = stdout.match(/X=(\d+)\nY=(\d+)/);
  if (match) {
    return { x: parseInt(match[1]), y: parseInt(match[2]) };
  }
  throw new Error('Não foi possível obter posição do cursor');
}

/**
 * Handler principal da ferramenta Computer
 */
async function computerHandler(input) {
  const { action, coordinate, text, key } = input;
  
  try {
    switch (action) {
      case 'screenshot':
        return await takeScreenshot();
      
      case 'mouse_move':
        if (!coordinate) throw new Error('coordinate é obrigatório para mouse_move');
        return await mouseMove(coordinate[0], coordinate[1]);
      
      case 'left_click':
        if (coordinate) await mouseMove(coordinate[0], coordinate[1]);
        return await mouseClick('left', 1);
      
      case 'right_click':
        if (coordinate) await mouseMove(coordinate[0], coordinate[1]);
        return await mouseClick('right', 1);
      
      case 'middle_click':
        if (coordinate) await mouseMove(coordinate[0], coordinate[1]);
        return await mouseClick('middle', 1);
      
      case 'double_click':
        if (coordinate) await mouseMove(coordinate[0], coordinate[1]);
        return await mouseClick('left', 2);
      
      case 'triple_click':
        if (coordinate) await mouseMove(coordinate[0], coordinate[1]);
        return await mouseClick('left', 3);
      
      case 'left_click_drag':
        if (!input.start_coordinate || !input.end_coordinate) {
          throw new Error('start_coordinate e end_coordinate são obrigatórios');
        }
        return await drag(
          input.start_coordinate[0], input.start_coordinate[1],
          input.end_coordinate[0], input.end_coordinate[1]
        );
      
      case 'scroll':
        const direction = coordinate && coordinate[1] < 0 ? 'up' : 'down';
        const amount = Math.abs(coordinate ? coordinate[1] : 3);
        return await scroll(direction, Math.ceil(amount / 100) || 3);
      
      case 'type':
        if (!text) throw new Error('text é obrigatório para type');
        return await typeText(text);
      
      case 'key':
        if (!key) throw new Error('key é obrigatório para key');
        if (Array.isArray(key) || key.includes('+')) {
          return await pressKeyCombo(key);
        }
        return await pressKey(key);
      
      case 'cursor_position':
        return await getCursorPosition();
      
      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }
  } catch (error) {
    return { error: error.message, action };
  }
}

/**
 * Definição da ferramenta para o Claude
 */
const computerTool = {
  name: 'computer',
  description: `Controle o computador usando mouse, teclado e screenshots.

Ações disponíveis:
- screenshot: Captura a tela atual
- mouse_move: Move o mouse para coordenadas [x, y]
- left_click: Clique esquerdo (opcionalmente em coordenadas)
- right_click: Clique direito
- double_click: Duplo clique
- triple_click: Triplo clique (seleciona linha)
- left_click_drag: Arrasta de start_coordinate para end_coordinate
- scroll: Rola a tela (coordinate[1] negativo = para cima)
- type: Digita texto
- key: Pressiona tecla ou combinação (ex: "Return", "ctrl+c", ["ctrl", "shift", "t"])
- cursor_position: Retorna posição atual do cursor

Sempre capture um screenshot antes de clicar para ver onde está o elemento.`,
  
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: [
          'screenshot', 'mouse_move', 'left_click', 'right_click',
          'middle_click', 'double_click', 'triple_click', 'left_click_drag',
          'scroll', 'type', 'key', 'cursor_position'
        ],
        description: 'A ação a ser executada'
      },
      coordinate: {
        type: 'array',
        items: { type: 'integer' },
        description: 'Coordenadas [x, y] para ações de mouse'
      },
      start_coordinate: {
        type: 'array',
        items: { type: 'integer' },
        description: 'Coordenada inicial para drag'
      },
      end_coordinate: {
        type: 'array',
        items: { type: 'integer' },
        description: 'Coordenada final para drag'
      },
      text: {
        type: 'string',
        description: 'Texto para digitar'
      },
      key: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } }
        ],
        description: 'Tecla ou combinação de teclas'
      }
    },
    required: ['action']
  },
  
  handler: computerHandler
};

module.exports = {
  computerTool,
  takeScreenshot,
  mouseMove,
  mouseClick,
  typeText,
  pressKey,
  pressKeyCombo,
  scroll,
  drag,
  getCursorPosition
};
