#!/usr/bin/env node

/**
 * ============================================
 * CLAUDE AGENT - ORANGE PI 6 PLUS
 * ============================================
 * Powered by Claude API + Computer Use
 * Interface via Telegram
 * ============================================
 */

require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const ClaudeAgent = require('./src/core/agent');
const { computerTool, takeScreenshot } = require('./src/tools/computer');
const { bashTool, executeBash } = require('./src/tools/bash');
const { editorTool } = require('./src/tools/editor');
const { browserTool, closeBrowser } = require('./src/tools/browser');

// ============================================
// CONFIG
// ============================================

const CONFIG = {
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  token: process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || '',
  users: (process.env.TELEGRAM_ALLOWED_CHAT_ID || process.env.ALLOWED_USERS || '').split(',').filter(Boolean),
  maxIter: parseInt(process.env.MAX_ITERATIONS) || 25,
  maxTokens: parseInt(process.env.MAX_TOKENS) || 8192
};

if (!CONFIG.apiKey) { console.error('ANTHROPIC_API_KEY nao configurada'); process.exit(1); }
if (!CONFIG.token) { console.error('TELEGRAM_BOT_TOKEN nao configurado'); process.exit(1); }

// ============================================
// BANNER
// ============================================

console.log(`
====================================================
  CLAUDE AGENT - Orange Pi 6 Plus
  Modelo: ${CONFIG.model}
  Usuarios: ${CONFIG.users.join(', ') || 'TODOS'}
  Max iteracoes: ${CONFIG.maxIter}
====================================================
`);

// ============================================
// AGENT
// ============================================

const agent = new ClaudeAgent({
  apiKey: CONFIG.apiKey,
  model: CONFIG.model,
  maxTokens: CONFIG.maxTokens,
  maxIterations: CONFIG.maxIter
});

agent.registerTool('computer', computerTool);
agent.registerTool('bash', bashTool);
agent.registerTool('str_replace_editor', editorTool);
agent.registerTool('browser', browserTool);

// Logging
agent.on('tool:executing', ({ name, input }) => {
  const preview = JSON.stringify(input).slice(0, 120);
  console.log(`  [tool] ${name}: ${preview}`);
});
agent.on('tool:executed', ({ name, elapsed }) => {
  console.log(`  [done] ${name} (${elapsed}ms)`);
});
agent.on('iteration:start', ({ iteration, maxIterations }) => {
  console.log(`  [iter] ${iteration}/${maxIterations}`);
});
agent.on('error', (err) => {
  console.error('  [ERROR]', err.message);
});

// ============================================
// TELEGRAM
// ============================================

const bot = new TelegramBot(CONFIG.token, {
  polling: { params: { timeout: 30 } }
});

bot.on('polling_error', (err) => {
  console.error('[telegram polling]', err.message);
});

const state = new Map(); // chatId -> { processing, count }

function getState(cid) {
  if (!state.has(cid)) state.set(cid, { processing: false, count: 0 });
  return state.get(cid);
}

function allowed(uid) {
  if (!CONFIG.users.length || CONFIG.users.includes('*')) return true;
  return CONFIG.users.includes(String(uid));
}

// Enviar mensagem longa dividida
async function sendLong(cid, text, opts = {}) {
  const MAX = 4000;
  if (!text) return;
  if (text.length <= MAX) return bot.sendMessage(cid, text, opts);

  let remaining = text;
  while (remaining.length > 0) {
    let cut = remaining.length <= MAX ? remaining.length : remaining.lastIndexOf('\n', MAX);
    if (cut < MAX / 2) cut = MAX;
    await bot.sendMessage(cid, remaining.slice(0, cut), opts);
    remaining = remaining.slice(cut);
  }
}

// Typing indicator loop
function startTyping(cid) {
  const interval = setInterval(() => {
    bot.sendChatAction(cid, 'typing').catch(() => {});
  }, 4000);
  bot.sendChatAction(cid, 'typing').catch(() => {});
  return interval;
}

// ============================================
// COMMANDS
// ============================================

bot.onText(/^\/start$/i, (msg) => {
  if (!allowed(msg.from.id)) return bot.sendMessage(msg.chat.id, `Acesso negado. Seu ID: ${msg.from.id}`);
  bot.sendMessage(msg.chat.id, `*CLAUDE AGENT - Orange Pi 6 Plus*

Sou um agente de IA com controle total do sistema.

*Capacidades:*
- Ver a tela e controlar mouse/teclado
- Executar comandos no terminal
- Criar e editar arquivos
- Navegar na internet

*Comandos:*
/screenshot - Capturar tela
/status - Status do sistema
/clear - Limpar historico
/stop - Cancelar tarefa

*Como usar:* Me diga em linguagem natural o que quer fazer.

_Modelo: ${CONFIG.model}_`, { parse_mode: 'Markdown' });
});

bot.onText(/^\/help$/i, (msg) => {
  bot.emit('message', { ...msg, text: '/start' });
});

bot.onText(/^\/screenshot$/i, async (msg) => {
  const cid = msg.chat.id;
  if (!allowed(msg.from.id)) return;
  try {
    await bot.sendChatAction(cid, 'upload_photo');
    const result = await takeScreenshot();
    if (result.type === 'image') {
      await bot.sendPhoto(cid, Buffer.from(result.data, 'base64'), {
        caption: `Screenshot ${result.screenWidth}x${result.screenHeight}`
      });
    }
  } catch (e) {
    await bot.sendMessage(cid, `Erro: ${e.message}`);
  }
});

bot.onText(/^\/status$/i, async (msg) => {
  const cid = msg.chat.id;
  if (!allowed(msg.from.id)) return;

  const s = agent.getStatus();
  const st = getState(cid);

  const [cpu, mem, temp, disk, uptime] = await Promise.all([
    executeBash("top -bn1 | grep 'Cpu(s)' | awk '{printf \"%.0f\", $2+$4}'"),
    executeBash("free -m | awk 'NR==2{printf \"%d/%dMB (%.0f%%)\", $3,$2,$3*100/$2}'"),
    executeBash("cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null | head -1 | awk '{printf \"%.1f\", $1/1000}'"),
    executeBash("df -h / | awk 'NR==2{printf \"%s/%s (%s)\", $3,$2,$5}'"),
    executeBash("uptime -p")
  ]);

  await bot.sendMessage(cid, `*STATUS*

*Agente*
Modelo: \`${s.model}\`
Ferramentas: ${s.toolsCount}
Conversas ativas: ${s.conversationsCount}
Processando: ${s.isRunning ? 'Sim' : 'Nao'}

*Sistema*
CPU: ${cpu.output || 'N/A'}%
RAM: ${mem.output || 'N/A'}
Temp: ${temp.output || 'N/A'}C
Disco: ${disk.output || 'N/A'}
Uptime: ${(uptime.output || 'N/A').replace('up ', '')}

Tarefas nesta sessao: ${st.count}`, { parse_mode: 'Markdown' });
});

bot.onText(/^\/clear$/i, (msg) => {
  if (!allowed(msg.from.id)) return;
  agent.clearMemory(String(msg.chat.id));
  bot.sendMessage(msg.chat.id, 'Historico limpo.');
});

bot.onText(/^\/stop$/i, (msg) => {
  if (!allowed(msg.from.id)) return;
  const st = getState(msg.chat.id);
  if (st.processing) {
    agent.abort();
    bot.sendMessage(msg.chat.id, 'Cancelando...');
  } else {
    bot.sendMessage(msg.chat.id, 'Nenhuma tarefa em execucao.');
  }
});

// ============================================
// MAIN MESSAGE HANDLER
// ============================================

bot.on('message', async (msg) => {
  const cid = msg.chat.id;
  const text = msg.text || '';

  if (text.startsWith('/')) return;
  if (!allowed(msg.from.id)) return;
  if (!text.trim()) return;

  const st = getState(cid);
  if (st.processing) {
    return bot.sendMessage(cid, 'Aguarde... Use /stop para cancelar.');
  }

  st.processing = true;
  st.count++;

  console.log(`\n[msg] ${msg.from.id}: ${text.slice(0, 80)}`);

  const thinkMsg = await bot.sendMessage(cid, 'Pensando...');
  const typingInterval = startTyping(cid);

  try {
    const result = await agent.processMessage(text, String(cid));

    clearInterval(typingInterval);
    try { await bot.deleteMessage(cid, thinkMsg.message_id); } catch {}

    if (result.response) {
      await sendLong(cid, result.response);
      console.log(`[ok] ${result.iterations} iter, ${result.totalToolCalls} tools`);
    } else {
      await bot.sendMessage(cid, 'Tarefa concluida.');
    }
  } catch (err) {
    clearInterval(typingInterval);
    try { await bot.deleteMessage(cid, thinkMsg.message_id); } catch {}
    console.error('[error]', err.message);

    let msg = `Erro: ${err.message}`;
    if (err.status === 401 || err.message.includes('auth')) {
      msg += '\n\nVerifique sua ANTHROPIC_API_KEY.';
    } else if (err.status === 429) {
      msg += '\n\nLimite de taxa excedido. Aguarde um momento.';
    } else if (err.status === 529) {
      msg += '\n\nAPI sobrecarregada. Tente novamente.';
    }
    await bot.sendMessage(cid, msg);
  } finally {
    st.processing = false;
  }
});

// ============================================
// PHOTO HANDLER - Analise de imagens com Claude
// ============================================

bot.on('photo', async (msg) => {
  const cid = msg.chat.id;
  if (!allowed(msg.from.id)) return;

  const st = getState(cid);
  if (st.processing) return bot.sendMessage(cid, 'Aguarde a tarefa atual.');

  st.processing = true;
  st.count++;

  const caption = msg.caption || 'Descreva esta imagem.';
  const typingInterval = startTyping(cid);

  try {
    const photo = msg.photo[msg.photo.length - 1];
    const file = await bot.getFile(photo.file_id);
    const url = `https://api.telegram.org/file/bot${CONFIG.token}/${file.file_path}`;

    const https = require('https');
    const buf = await new Promise((resolve, reject) => {
      https.get(url, res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    });

    const base64 = buf.toString('base64');
    const ext = file.file_path.endsWith('.png') ? 'image/png' : 'image/jpeg';

    // Enviar imagem como mensagem multimodal para o agente
    const history = agent._getHistory(String(cid));
    const imageMessage = {
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: ext, data: base64 }
        },
        { type: 'text', text: caption }
      ]
    };
    history.push(imageMessage);

    const messages = [...history];
    agent.isRunning = true;

    const response = await agent.client.messages.create({
      model: agent.config.model,
      max_tokens: agent.config.maxTokens,
      system: agent.systemPrompt,
      tools: agent._getToolDefinitions(),
      messages
    });

    agent.isRunning = false;
    clearInterval(typingInterval);

    const texts = response.content.filter(b => b.type === 'text');
    const reply = texts.map(b => b.text).join('\n') || 'Imagem analisada.';
    history.push({ role: 'assistant', content: reply });

    await sendLong(cid, reply);
  } catch (err) {
    clearInterval(typingInterval);
    agent.isRunning = false;
    await bot.sendMessage(cid, `Erro ao analisar imagem: ${err.message}`);
  } finally {
    st.processing = false;
  }
});

// ============================================
// SHUTDOWN
// ============================================

async function shutdown() {
  console.log('\nEncerrando...');
  try { await closeBrowser(); } catch {}
  try { await bot.stopPolling(); } catch {}
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('Claude Agent iniciado. Aguardando mensagens no Telegram...\n');
