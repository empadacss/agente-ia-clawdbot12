#!/usr/bin/env node

/**
 * ============================================
 * 🤖 CLAWDBOT AGENT - Orange Pi 6 Plus
 * ============================================
 * Agente de IA completo e 100% funcional
 * 
 * Funcionalidades:
 * - 🖱️ Controle de Mouse
 * - ⌨️ Controle de Teclado
 * - 🚀 Abrir Aplicativos
 * - 🌐 Pesquisar na Internet
 * - 📸 Screenshots
 * - 🧠 IA Local (Ollama)
 * - 📍 GPIO
 * - ⚙️ Sistema
 * ============================================
 */

require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const util = require('util');

const execAsync = util.promisify(exec);

// Carregar skills
const inputControl = require('./skills/input-control');
const appsLauncher = require('./skills/apps-launcher');
const webAutomation = require('./skills/web-automation');
const screenControl = require('./skills/screen-control');
const systemMonitor = require('./skills/system-monitor');

// ============================================
// CONFIGURAÇÃO
// ============================================

const CONFIG = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || '',
  allowedUsers: (process.env.TELEGRAM_ALLOWED_CHAT_ID || process.env.ALLOWED_USERS || '').split(',').filter(Boolean),
  ollamaUrl: process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || 'http://localhost:11434',
  ollamaModel: process.env.LLM_MODEL || process.env.OLLAMA_MODEL || 'llama3.1:8b'
};

// Estado global
const STATE = {
  conversationHistory: new Map()
};

// ============================================
// BANNER E INICIALIZAÇÃO
// ============================================

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  🤖 CLAWDBOT AGENT - Orange Pi 6 Plus                      ║');
console.log('║  🖱️ Mouse + ⌨️ Teclado + 🚀 Apps + 🌐 Web + 🧠 IA          ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`📱 Usuários: ${CONFIG.allowedUsers.join(', ') || 'NENHUM'}`);
console.log(`🧠 Modelo: ${CONFIG.ollamaModel}`);
console.log(`🌐 Ollama: ${CONFIG.ollamaUrl}`);
console.log('');

if (!CONFIG.telegramToken) {
  console.error('❌ TELEGRAM_BOT_TOKEN não configurado!');
  process.exit(1);
}

const bot = new TelegramBot(CONFIG.telegramToken, { polling: true });

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function isAllowed(userId) {
  if (CONFIG.allowedUsers.includes('*')) return true;
  return CONFIG.allowedUsers.includes(userId.toString());
}

async function sendTyping(chatId) {
  try { await bot.sendChatAction(chatId, 'typing'); } catch {}
}

async function sendPhoto(chatId) {
  try { await bot.sendChatAction(chatId, 'upload_photo'); } catch {}
}

// ============================================
// OLLAMA - IA LOCAL
// ============================================

async function askOllama(prompt, chatId) {
  return new Promise((resolve, reject) => {
    let history = STATE.conversationHistory.get(chatId) || [];
    
    const systemPrompt = `Você é um agente de IA avançado rodando na Orange Pi 6 Plus com 32GB de RAM.

SUAS CAPACIDADES:
- Controlar mouse: mover, clicar, scroll, arrastar
- Controlar teclado: digitar, teclas, atalhos (ctrl+c, alt+tab, etc)
- Abrir aplicativos: navegador, terminal, arquivos, qualquer programa
- Pesquisar na internet: Google, YouTube, Wikipedia, Maps
- Capturar screenshots da tela
- Monitorar o sistema: CPU, RAM, temperatura, disco
- Controlar GPIO para automação física
- Gerenciar janelas: focar, minimizar, maximizar, fechar
- Executar comandos no terminal

QUANDO O USUÁRIO PEDIR ALGO, SUGIRA O COMANDO ADEQUADO:
- "mova o mouse" → Uso da skill de mouse
- "clique" → Uso da skill de click
- "digite" → Uso da skill de digitação
- "abra o navegador" → Uso da skill de apps
- "pesquise X" → Uso da skill de pesquisa
- "status do sistema" → Uso da skill de monitoramento

Responda em português brasileiro de forma clara e técnica.
Seja proativo em sugerir ações e comandos.`;

    const fullPrompt = `${systemPrompt}

Histórico:
${history.slice(-5).join('\n')}

Usuário: ${prompt}
Assistente:`;

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
// EXECUTAR AÇÃO DE SKILL
// ============================================

async function executeSkillAction(skill, action, params = {}) {
  try {
    const skillModule = {
      'input': inputControl,
      'mouse': inputControl,
      'teclado': inputControl,
      'keyboard': inputControl,
      'apps': appsLauncher,
      'app': appsLauncher,
      'web': webAutomation,
      'pesquisa': webAutomation,
      'search': webAutomation,
      'tela': screenControl,
      'screen': screenControl,
      'sistema': systemMonitor,
      'system': systemMonitor
    }[skill.toLowerCase()];
    
    if (!skillModule) {
      return `❌ Skill não encontrada: ${skill}`;
    }
    
    const actionHandler = skillModule.actions[action];
    if (!actionHandler) {
      return `❌ Ação não encontrada: ${action}\n\nAções disponíveis: ${Object.keys(skillModule.actions).join(', ')}`;
    }
    
    return await actionHandler.handler(params);
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

// ============================================
// HANDLERS TELEGRAM - MOUSE
// ============================================

bot.onText(/^\/mouse$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await inputControl.actions.mousePosition.handler();
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/mouse (\d+) (\d+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await inputControl.actions.mouseMove.handler({ x: parseInt(match[1]), y: parseInt(match[2]) });
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/mrel (-?\d+) (-?\d+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await inputControl.actions.mouseMoveRelative.handler({ x: parseInt(match[1]), y: parseInt(match[2]) });
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/click(.*)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const args = match[1].trim().split(/\s+/).filter(Boolean);
  
  let result;
  if (args.length === 2 && !isNaN(args[0])) {
    result = await inputControl.actions.mouseClickAt.handler({ x: parseInt(args[0]), y: parseInt(args[1]) });
  } else {
    result = await inputControl.actions.mouseClick.handler({ button: args[0] || 'left' });
  }
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/(dclick|doubleclick)$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await inputControl.actions.mouseDoubleClick.handler();
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/scroll (up|down|cima|baixo)( \d+)?$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const dir = match[1].toLowerCase().replace('cima', 'up').replace('baixo', 'down');
  const amount = match[2] ? parseInt(match[2]) : 3;
  const result = await inputControl.actions.mouseScroll.handler({ direction: dir, amount });
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/arrastar (\d+) (\d+) (\d+) (\d+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await inputControl.actions.mouseDrag.handler({
    startX: parseInt(match[1]), startY: parseInt(match[2]),
    endX: parseInt(match[3]), endY: parseInt(match[4])
  });
  await bot.sendMessage(msg.chat.id, result);
});

// ============================================
// HANDLERS TELEGRAM - TECLADO
// ============================================

bot.onText(/^\/(digitar|type) (.+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await inputControl.actions.type.handler({ text: match[2] });
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/(tecla|key) (.+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const key = match[2].trim();
  
  let result;
  if (key.includes('+')) {
    result = await inputControl.actions.pressCombo.handler({ combo: key });
  } else {
    result = await inputControl.actions.pressKey.handler({ key });
  }
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/(atalho|shortcut) (.+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await inputControl.actions.shortcut.handler({ name: match[2] });
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/atalhos$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await inputControl.actions.listShortcuts.handler();
  await bot.sendMessage(msg.chat.id, result);
});

// Teclas rápidas
bot.onText(/^\/enter$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await bot.sendMessage(msg.chat.id, await inputControl.actions.pressKey.handler({ key: 'enter' }));
});

bot.onText(/^\/esc$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await bot.sendMessage(msg.chat.id, await inputControl.actions.pressKey.handler({ key: 'esc' }));
});

bot.onText(/^\/tab$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await bot.sendMessage(msg.chat.id, await inputControl.actions.pressKey.handler({ key: 'tab' }));
});

// ============================================
// HANDLERS TELEGRAM - APLICATIVOS
// ============================================

bot.onText(/^\/(abrir|open) (.+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await appsLauncher.actions.openApp.handler({ app: match[2] });
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/url (.+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await appsLauncher.actions.openUrl.handler({ url: match[2] });
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/apps$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await appsLauncher.actions.listApps.handler();
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/janelas$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await appsLauncher.actions.listWindows.handler();
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

bot.onText(/^\/(focar|focus) (.+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await appsLauncher.actions.focusWindow.handler({ name: match[2] });
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/fecharjanela$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await appsLauncher.actions.closeWindow.handler();
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/minimizar$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await appsLauncher.actions.minimizeWindow.handler();
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/maximizar$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await appsLauncher.actions.maximizeWindow.handler();
  await bot.sendMessage(msg.chat.id, result);
});

// ============================================
// HANDLERS TELEGRAM - PESQUISA E WEB
// ============================================

bot.onText(/^\/(pesquisar|search|google) (.+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await webAutomation.actions.search.handler({ query: match[2] });
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/(youtube|yt) (.+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await webAutomation.actions.searchYoutube.handler({ query: match[2] });
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/(wikipedia|wiki) (.+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await webAutomation.actions.searchWikipedia.handler({ query: match[2] });
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/(maps|mapa) (.+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await webAutomation.actions.searchMaps.handler({ query: match[2] });
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/imagens (.+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await webAutomation.actions.searchImages.handler({ query: match[2] });
  await bot.sendMessage(msg.chat.id, result);
});

// ============================================
// HANDLERS TELEGRAM - TELA
// ============================================

bot.onText(/^\/(tela|screenshot|print|ss)$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await sendPhoto(msg.chat.id);
  
  const result = await screenControl.actions.screenshot.handler();
  
  if (typeof result === 'object' && result.type === 'photo') {
    await bot.sendPhoto(msg.chat.id, result.path, { caption: '📸 Screenshot' });
    setTimeout(() => { try { fs.unlinkSync(result.path); } catch {} }, 5000);
  } else {
    await bot.sendMessage(msg.chat.id, result);
  }
});

bot.onText(/^\/resolucao$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await screenControl.actions.getResolution.handler();
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/desktop$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await screenControl.actions.showDesktop.handler();
  await bot.sendMessage(msg.chat.id, result);
});

// ============================================
// HANDLERS TELEGRAM - SISTEMA
// ============================================

bot.onText(/^\/status$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const result = await systemMonitor.actions.status.handler();
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

bot.onText(/^\/cpu$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await systemMonitor.actions.cpu.handler();
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/ram$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await systemMonitor.actions.memory.handler();
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/temp$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await systemMonitor.actions.temperature.handler();
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/disco$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await systemMonitor.actions.disk.handler();
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

bot.onText(/^\/processos$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const result = await systemMonitor.actions.processes.handler({ count: 10 });
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

bot.onText(/^\/exec (.+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const result = await appsLauncher.actions.runCommand.handler({ command: match[1] });
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

// ============================================
// HANDLERS TELEGRAM - AJUDA
// ============================================

bot.onText(/^\/(start|help|ajuda)$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, '❌ Acesso negado. Seu ID: ' + msg.from.id);
  }
  
  const help = `🤖 *CLAWDBOT AGENT - Orange Pi 6 Plus*

━━━━ 🖱️ *MOUSE* ━━━━
/mouse X Y - Mover
/mrel X Y - Mover relativo
/click - Clique esquerdo
/click r - Clique direito
/dclick - Duplo clique
/scroll up/down - Rolar
/arrastar X1 Y1 X2 Y2

━━━━ ⌨️ *TECLADO* ━━━━
/digitar texto - Digitar
/tecla enter - Tecla
/tecla ctrl+c - Combo
/atalho copiar - Atalho
/atalhos - Listar
/enter /esc /tab

━━━━ 🚀 *APLICATIVOS* ━━━━
/abrir navegador - Abrir app
/apps - Listar apps
/janelas - Listar janelas
/focar Chrome - Focar janela
/minimizar /maximizar

━━━━ 🌐 *PESQUISA* ━━━━
/pesquisar termo - Google
/youtube termo - YouTube
/wikipedia termo - Wiki
/maps local - Google Maps
/imagens termo - Imagens

━━━━ 📸 *TELA* ━━━━
/tela - Screenshot
/resolucao - Ver resolução
/desktop - Mostrar desktop

━━━━ 📊 *SISTEMA* ━━━━
/status - Status completo
/cpu /ram /temp /disco
/processos
/exec comando

━━━━ 💬 *IA* ━━━━
Envie qualquer mensagem!`;

  await bot.sendMessage(msg.chat.id, help, { parse_mode: 'Markdown' });
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
    const response = await askOllama(text, chatId);
    
    if (response.length > 4000) {
      const parts = response.match(/.{1,4000}/gs) || [];
      for (const part of parts) await bot.sendMessage(chatId, part);
    } else {
      await bot.sendMessage(chatId, response);
    }
    
    console.log('📤 Resposta enviada');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await bot.sendMessage(chatId, `❌ ${error.message}\n\nVerifique se Ollama está rodando.`);
  }
});

// ============================================
// INICIALIZAÇÃO
// ============================================

console.log('✅ Agente iniciado!');
console.log('🖱️ Mouse + ⌨️ Teclado + 🚀 Apps + 🌐 Web + 🧠 IA');
console.log('');

process.on('SIGINT', () => { console.log('\n👋 Encerrando...'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\n👋 Encerrando...'); process.exit(0); });
