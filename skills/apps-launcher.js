/**
 * 🚀 APPS LAUNCHER SKILL
 * Abrir e gerenciar aplicativos
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Mapeamento de aplicativos comuns
const APPS = {
  // Navegadores
  'navegador': 'chromium-browser || chromium || firefox || google-chrome',
  'chrome': 'chromium-browser || chromium || google-chrome',
  'chromium': 'chromium-browser || chromium',
  'firefox': 'firefox',
  'browser': 'xdg-open http://google.com',
  
  // Escritório
  'arquivos': 'nautilus || thunar || pcmanfm || dolphin',
  'files': 'nautilus || thunar || pcmanfm || dolphin',
  'gerenciador': 'nautilus || thunar || pcmanfm',
  'terminal': 'x-terminal-emulator || gnome-terminal || xfce4-terminal || konsole || xterm',
  'editor': 'gedit || mousepad || kate || nano',
  'texto': 'gedit || mousepad || kate',
  'calculadora': 'gnome-calculator || galculator || kcalc',
  'calc': 'gnome-calculator || galculator || kcalc',
  
  // Multimídia
  'musica': 'rhythmbox || audacious || vlc',
  'video': 'vlc || totem || mpv',
  'vlc': 'vlc',
  'imagem': 'eog || gpicview || feh',
  
  // Sistema
  'configuracoes': 'gnome-control-center || xfce4-settings-manager',
  'settings': 'gnome-control-center || xfce4-settings-manager',
  'monitor': 'gnome-system-monitor || xfce4-taskmanager || htop',
  'tarefas': 'gnome-system-monitor || xfce4-taskmanager',
  
  // Desenvolvimento
  'code': 'code || codium',
  'vscode': 'code || codium',
  
  // Comunicação
  'telegram': 'telegram-desktop',
  
  // Utilitários
  'screenshot': 'gnome-screenshot || xfce4-screenshooter || scrot'
};

module.exports = {
  name: 'apps-launcher',
  description: 'Abrir e gerenciar aplicativos',
  
  actions: {
    openApp: {
      description: 'Abrir um aplicativo pelo nome',
      parameters: {
        app: { type: 'string', required: true, description: 'Nome do aplicativo' }
      },
      async handler({ app }) {
        const appLower = app.toLowerCase().replace(/\s+/g, '');
        const cmd = APPS[appLower];
        
        if (cmd) {
          try {
            // Tentar executar em background
            exec(`(${cmd}) &`, { detached: true });
            return `🚀 Abrindo: ${app}`;
          } catch (error) {
            return `❌ Erro ao abrir ${app}: ${error.message}`;
          }
        } else {
          // Tentar executar diretamente
          try {
            exec(`${app} &`, { detached: true });
            return `🚀 Abrindo: ${app}`;
          } catch (error) {
            return `❌ Aplicativo não encontrado: ${app}\n\nDisponíveis: ${Object.keys(APPS).join(', ')}`;
          }
        }
      }
    },
    
    openUrl: {
      description: 'Abrir uma URL no navegador padrão',
      parameters: {
        url: { type: 'string', required: true, description: 'URL para abrir' }
      },
      async handler({ url }) {
        let fullUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          fullUrl = 'https://' + url;
        }
        
        try {
          exec(`xdg-open "${fullUrl}" &`, { detached: true });
          return `🌐 Abrindo: ${fullUrl}`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    openFile: {
      description: 'Abrir um arquivo com o aplicativo padrão',
      parameters: {
        path: { type: 'string', required: true, description: 'Caminho do arquivo' }
      },
      async handler({ path }) {
        try {
          exec(`xdg-open "${path}" &`, { detached: true });
          return `📄 Abrindo arquivo: ${path}`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    openFolder: {
      description: 'Abrir uma pasta no gerenciador de arquivos',
      parameters: {
        path: { type: 'string', required: true, description: 'Caminho da pasta' }
      },
      async handler({ path }) {
        try {
          exec(`xdg-open "${path}" &`, { detached: true });
          return `📁 Abrindo pasta: ${path}`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    runCommand: {
      description: 'Executar um comando no terminal',
      parameters: {
        command: { type: 'string', required: true }
      },
      async handler({ command }) {
        try {
          const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
          return `💻 Resultado:\n\`\`\`\n${stdout || stderr || 'Executado'}\`\`\``;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    listWindows: {
      description: 'Listar todas as janelas abertas',
      async handler() {
        try {
          const { stdout } = await execAsync('wmctrl -l');
          return `🪟 Janelas abertas:\n\`\`\`\n${stdout}\`\`\``;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    focusWindow: {
      description: 'Focar em uma janela pelo nome',
      parameters: {
        name: { type: 'string', required: true, description: 'Nome da janela' }
      },
      async handler({ name }) {
        try {
          await execAsync(`wmctrl -a "${name}"`);
          return `🪟 Focando: ${name}`;
        } catch (error) {
          return `❌ Janela não encontrada: ${name}`;
        }
      }
    },
    
    closeWindow: {
      description: 'Fechar a janela ativa',
      async handler() {
        try {
          await execAsync('wmctrl -c :ACTIVE:');
          return `🪟 Janela fechada`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    minimizeWindow: {
      description: 'Minimizar a janela ativa',
      async handler() {
        try {
          await execAsync('xdotool getactivewindow windowminimize');
          return `🪟 Janela minimizada`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    maximizeWindow: {
      description: 'Maximizar a janela ativa',
      async handler() {
        try {
          await execAsync('wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz');
          return `🪟 Janela maximizada`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    listApps: {
      description: 'Listar aplicativos disponíveis',
      async handler() {
        let list = '🚀 Aplicativos disponíveis:\n\n';
        for (const [name, cmd] of Object.entries(APPS)) {
          list += `• ${name}\n`;
        }
        return list;
      }
    },
    
    killApp: {
      description: 'Encerrar um aplicativo pelo nome',
      parameters: {
        name: { type: 'string', required: true }
      },
      async handler({ name }) {
        try {
          await execAsync(`pkill -f "${name}"`);
          return `💀 Aplicativo encerrado: ${name}`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    }
  }
};
