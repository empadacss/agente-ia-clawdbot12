/**
 * 📸 SCREEN CONTROL SKILL
 * Captura de tela e controle de display
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const execAsync = util.promisify(exec);

module.exports = {
  name: 'screen-control',
  description: 'Captura de tela e controle de display',
  
  actions: {
    screenshot: {
      description: 'Capturar screenshot da tela inteira',
      async handler() {
        try {
          const filepath = `/tmp/screenshot-${Date.now()}.png`;
          await execAsync(`scrot ${filepath}`);
          return { type: 'photo', path: filepath };
        } catch (error) {
          // Tentar com import do ImageMagick
          try {
            const filepath = `/tmp/screenshot-${Date.now()}.png`;
            await execAsync(`DISPLAY=:0 import -window root ${filepath}`);
            return { type: 'photo', path: filepath };
          } catch {
            return `❌ Erro ao capturar tela: ${error.message}`;
          }
        }
      }
    },
    
    screenshotRegion: {
      description: 'Capturar uma região específica da tela',
      parameters: {
        x: { type: 'number', required: true },
        y: { type: 'number', required: true },
        width: { type: 'number', required: true },
        height: { type: 'number', required: true }
      },
      async handler({ x, y, width, height }) {
        try {
          const filepath = `/tmp/screenshot-${Date.now()}.png`;
          await execAsync(`scrot -a ${x},${y},${width},${height} ${filepath}`);
          return { type: 'photo', path: filepath };
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    screenshotWindow: {
      description: 'Capturar screenshot da janela ativa',
      async handler() {
        try {
          const filepath = `/tmp/screenshot-${Date.now()}.png`;
          await execAsync(`scrot -u ${filepath}`);
          return { type: 'photo', path: filepath };
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    getResolution: {
      description: 'Obter a resolução da tela',
      async handler() {
        try {
          const { stdout } = await execAsync("xdpyinfo | grep dimensions");
          const match = stdout.match(/(\d+x\d+)/);
          return `🖥️ Resolução: ${match ? match[1] : 'N/A'}`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    listDisplays: {
      description: 'Listar monitores conectados',
      async handler() {
        try {
          const { stdout } = await execAsync("xrandr --query | grep ' connected'");
          return `🖥️ Monitores:\n\`\`\`\n${stdout}\`\`\``;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    setBrightness: {
      description: 'Ajustar brilho da tela (0.0 a 1.0)',
      parameters: {
        level: { type: 'number', required: true, description: 'Nível de brilho (0.0 a 1.0)' }
      },
      async handler({ level }) {
        try {
          const { stdout: displays } = await execAsync("xrandr --query | grep ' connected' | cut -d' ' -f1");
          const display = displays.trim().split('\n')[0];
          
          await execAsync(`xrandr --output ${display} --brightness ${level}`);
          return `💡 Brilho ajustado para ${Math.round(level * 100)}%`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    getActiveWindow: {
      description: 'Obter informações da janela ativa',
      async handler() {
        try {
          const { stdout: name } = await execAsync("xdotool getactivewindow getwindowname");
          const { stdout: geo } = await execAsync("xdotool getactivewindow getwindowgeometry");
          return `🪟 Janela Ativa:\n📄 ${name.trim()}\n\n${geo}`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    listWindows: {
      description: 'Listar todas as janelas abertas',
      async handler() {
        try {
          const { stdout } = await execAsync("wmctrl -l");
          return `🪟 Janelas:\n\`\`\`\n${stdout}\`\`\``;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    focusWindow: {
      description: 'Focar em uma janela pelo nome',
      parameters: {
        name: { type: 'string', required: true }
      },
      async handler({ name }) {
        try {
          await execAsync(`wmctrl -a "${name}"`);
          return `🪟 Focado: ${name}`;
        } catch (error) {
          return `❌ Janela não encontrada: ${name}`;
        }
      }
    },
    
    moveWindow: {
      description: 'Mover a janela ativa para uma posição',
      parameters: {
        x: { type: 'number', required: true },
        y: { type: 'number', required: true }
      },
      async handler({ x, y }) {
        try {
          await execAsync(`xdotool getactivewindow windowmove ${x} ${y}`);
          return `🪟 Janela movida para (${x}, ${y})`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    resizeWindow: {
      description: 'Redimensionar a janela ativa',
      parameters: {
        width: { type: 'number', required: true },
        height: { type: 'number', required: true }
      },
      async handler({ width, height }) {
        try {
          await execAsync(`xdotool getactivewindow windowsize ${width} ${height}`);
          return `🪟 Janela redimensionada para ${width}x${height}`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    minimizeAll: {
      description: 'Minimizar todas as janelas',
      async handler() {
        try {
          await execAsync('wmctrl -k on');
          return '🪟 Todas as janelas minimizadas';
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    showDesktop: {
      description: 'Mostrar/ocultar desktop',
      async handler() {
        try {
          await execAsync('wmctrl -k toggle');
          return '🖥️ Desktop alternado';
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    }
  }
};
