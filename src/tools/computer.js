/**
 * ============================================
 * COMPUTER USE TOOL
 * ============================================
 * Controle de Mouse, Teclado e Tela via xdotool
 * com redimensionamento de screenshots para economia de tokens
 * ============================================
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');

const execAsync = util.promisify(exec);

const ENV = { ...process.env, DISPLAY: process.env.DISPLAY || ':0' };

// Resolução real e resolução das imagens enviadas para a API
let SCREEN_W = 1920;
let SCREEN_H = 1080;
const API_MAX_LONG = 1280; // max lado longo do screenshot enviado à API

// Mapeamento de teclas xdotool
const KEY_MAP = {
  enter: 'Return', return: 'Return', Return: 'Return',
  escape: 'Escape', esc: 'Escape', Escape: 'Escape',
  tab: 'Tab', Tab: 'Tab',
  space: 'space', ' ': 'space',
  backspace: 'BackSpace', BackSpace: 'BackSpace',
  delete: 'Delete', Delete: 'Delete',
  up: 'Up', Up: 'Up', down: 'Down', Down: 'Down',
  left: 'Left', Left: 'Left', right: 'Right', Right: 'Right',
  home: 'Home', Home: 'Home', end: 'End', End: 'End',
  pageup: 'Page_Up', Page_Up: 'Page_Up',
  pagedown: 'Page_Down', Page_Down: 'Page_Down',
  F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4',
  F5: 'F5', F6: 'F6', F7: 'F7', F8: 'F8',
  F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12',
  super: 'super', ctrl: 'ctrl', alt: 'alt', shift: 'shift'
};

function mapKey(k) { return KEY_MAP[k] || KEY_MAP[k.toLowerCase()] || k; }

// ----- Helpers -----

async function run(cmd) {
  return execAsync(cmd, { env: ENV, timeout: 10000 });
}

async function detectResolution() {
  try {
    const { stdout } = await run("xdpyinfo | grep dimensions | awk '{print $2}'");
    const [w, h] = stdout.trim().split('x').map(Number);
    if (w > 0 && h > 0) { SCREEN_W = w; SCREEN_H = h; }
  } catch {}
}

// ----- Screenshot -----

async function takeScreenshot() {
  await detectResolution();

  const raw = `/tmp/ss-raw-${Date.now()}.png`;
  const resized = `/tmp/ss-${Date.now()}.png`;

  // Capturar
  try {
    await run(`scrot -o "${raw}"`);
  } catch {
    try {
      await run(`import -window root "${raw}"`);
    } catch (e) {
      throw new Error('Falha ao capturar tela: ' + e.message);
    }
  }

  // Redimensionar para economizar tokens (manter aspect ratio)
  const longSide = Math.max(SCREEN_W, SCREEN_H);
  if (longSide > API_MAX_LONG) {
    try {
      await run(`convert "${raw}" -resize ${API_MAX_LONG}x${API_MAX_LONG} "${resized}"`);
    } catch {
      // Se convert falhar, usar original
      fs.copyFileSync(raw, resized);
    }
  } else {
    fs.copyFileSync(raw, resized);
  }

  const buf = fs.readFileSync(resized);
  const base64 = buf.toString('base64');

  // Limpar
  try { fs.unlinkSync(raw); } catch {}
  try { fs.unlinkSync(resized); } catch {}

  return {
    type: 'image',
    mediaType: 'image/png',
    data: base64,
    screenWidth: SCREEN_W,
    screenHeight: SCREEN_H
  };
}

// ----- Mouse -----

async function mouseMove(x, y) {
  await run(`xdotool mousemove ${Math.round(x)} ${Math.round(y)}`);
  return { success: true, action: 'mouse_move', x, y };
}

async function mouseClick(button = 'left', count = 1) {
  const btn = { left: 1, middle: 2, right: 3 }[button] || 1;
  const repeat = count > 1 ? `--repeat ${count} --delay 80` : '';
  await run(`xdotool click ${repeat} ${btn}`);
  return { success: true, action: 'click', button, count };
}

async function scroll(direction, amount = 3) {
  const btn = direction === 'up' ? 4 : 5;
  await run(`xdotool click --repeat ${amount} --delay 40 ${btn}`);
  return { success: true, action: 'scroll', direction, amount };
}

async function drag(sx, sy, ex, ey) {
  await run(`xdotool mousemove ${sx} ${sy} mousedown 1 mousemove --sync ${ex} ${ey} mouseup 1`);
  return { success: true, action: 'drag', from: [sx, sy], to: [ex, ey] };
}

async function getCursorPosition() {
  const { stdout } = await run('xdotool getmouselocation --shell');
  const xm = stdout.match(/X=(\d+)/);
  const ym = stdout.match(/Y=(\d+)/);
  return { x: xm ? +xm[1] : 0, y: ym ? +ym[1] : 0 };
}

// ----- Teclado -----

async function typeText(text) {
  // xdotool type com --clearmodifiers evita interferência de teclas presas
  // Usar stdin para evitar problemas de shell escaping
  return new Promise((resolve, reject) => {
    const child = exec('xdotool type --clearmodifiers --delay 12 --file -', { env: ENV }, (err) => {
      if (err) reject(err);
      else resolve({ success: true, action: 'type', length: text.length });
    });
    child.stdin.write(text);
    child.stdin.end();
  });
}

async function pressKey(key) {
  const k = mapKey(key);
  await run(`xdotool key --clearmodifiers ${k}`);
  return { success: true, action: 'key', key: k };
}

async function pressKeyCombo(keys) {
  let combo;
  if (Array.isArray(keys)) {
    combo = keys.map(mapKey).join('+');
  } else {
    combo = keys.split('+').map(k => mapKey(k.trim())).join('+');
  }
  await run(`xdotool key --clearmodifiers ${combo}`);
  return { success: true, action: 'key_combo', combo };
}

// ----- Handler principal -----

async function computerHandler(input) {
  const { action, coordinate, text, key } = input;

  try {
    switch (action) {
      case 'screenshot':
        return await takeScreenshot();

      case 'mouse_move':
        if (!coordinate) throw new Error('coordinate [x,y] obrigatório');
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
          throw new Error('start_coordinate e end_coordinate obrigatórios');
        }
        return await drag(
          input.start_coordinate[0], input.start_coordinate[1],
          input.end_coordinate[0], input.end_coordinate[1]
        );

      case 'scroll': {
        const dir = input.direction || (coordinate && coordinate[1] < 0 ? 'up' : 'down');
        const amt = input.amount || (coordinate ? Math.max(1, Math.ceil(Math.abs(coordinate[1]) / 100)) : 3);
        if (coordinate) await mouseMove(coordinate[0], Math.abs(coordinate[1]) > 500 ? SCREEN_H / 2 : coordinate[1]);
        return await scroll(dir, amt);
      }

      case 'type':
        if (!text) throw new Error('text obrigatório');
        return await typeText(text);

      case 'key':
        if (!key) throw new Error('key obrigatório');
        if (Array.isArray(key) || (typeof key === 'string' && key.includes('+'))) {
          return await pressKeyCombo(key);
        }
        return await pressKey(key);

      case 'cursor_position':
        return await getCursorPosition();

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }
  } catch (err) {
    return { error: err.message, action };
  }
}

// ----- Definição da ferramenta -----

const computerTool = {
  name: 'computer',
  description: `Controla o computador via mouse, teclado e screenshots.

Ações:
- screenshot: captura a tela (redimensionada automaticamente)
- mouse_move: move cursor para coordinate [x,y]
- left_click/right_click/middle_click: clique (opcionalmente em coordinate)
- double_click/triple_click: clique múltiplo
- left_click_drag: arrasta de start_coordinate para end_coordinate
- scroll: rola (direction "up"/"down", amount = clicks)
- type: digita texto
- key: pressiona tecla ou combo (ex: "Return", "ctrl+c")
- cursor_position: posição atual do cursor

IMPORTANTE: sempre tire screenshot antes de clicar para confirmar posições.`,

  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: [
          'screenshot', 'mouse_move', 'left_click', 'right_click',
          'middle_click', 'double_click', 'triple_click', 'left_click_drag',
          'scroll', 'type', 'key', 'cursor_position'
        ]
      },
      coordinate: { type: 'array', items: { type: 'integer' }, description: '[x, y]' },
      start_coordinate: { type: 'array', items: { type: 'integer' } },
      end_coordinate: { type: 'array', items: { type: 'integer' } },
      text: { type: 'string' },
      key: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
      direction: { type: 'string', enum: ['up', 'down'] },
      amount: { type: 'integer' }
    },
    required: ['action']
  },

  handler: computerHandler
};

module.exports = { computerTool, takeScreenshot, mouseMove, mouseClick, typeText, pressKey, pressKeyCombo, scroll, drag, getCursorPosition };
