#!/usr/bin/env node

/**
 * ============================================
 * 🤖 CLAUDE AGENT - ORANGE PI 6 PLUS
 * ============================================
 * Agente de IA de nível empresarial
 * Powered by Claude API com Computer Use
 * 
 * Funcionalidades:
 * - 🧠 Claude API (Anthropic) como cérebro
 * - 🖥️ Computer Use (ver tela, controlar mouse/teclado)
 * - 💻 Terminal/Bash
 * - 📝 Editor de arquivos
 * - 🌐 Navegação web
 * - 📱 Interface via Telegram
 * ============================================
 */

require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Core
const ClaudeAgent = require('./src/core/agent');

// Tools
const { computerTool } = require('./src/tools/computer');
const { bashTool } = require('./src/tools/bash');
const { editorTool } = require('./src/tools/editor');
const { browserTool } = require('./src/tools/browser');

// ============================================
// CONFIGURAÇÃO
// ============================================

const CONFIG = {
  // Anthropic
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  
  // Telegram
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || '',
  allowedUsers: (process.env.TELEGRAM_ALLOWED_CHAT_ID || process.env.ALLOWED_USERS || '').split(',').filter(Boolean),
  
  // Agente
  maxIterations: parseInt(process.env.MAX_ITERATIONS) || 25,
  maxTokens: parseInt(process.env.MAX_TOKENS) || 8192
};

// Validação
if (!CONFIG.anthropicApiKey) {
  console.error('❌ ANTHROPIC_API_KEY não configurada!');
  process.exit(1);
}

if (!CONFIG.telegramToken) {
  console.error('❌ TELEGRAM_BOT_TOKEN não configurada!');
  process.exit(1);
}

// ============================================
// BANNER
// ============================================

console.log('');
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║                                                                ║');
console.log('║   🤖 CLAUDE AGENT - Orange Pi 6 Plus                           ║');
console.log('║                                                                ║');
console.log('║   Powered by Claude API + Computer Use                         ║');
console.log('║                                                                ║');
console.log('║   🧠 Claude Sonnet | 🖥️ Computer | 💻 Bash | 🌐 Browser        ║');
console.log('║                                                                ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`📱 Usuários permitidos: ${CONFIG.allowedUsers.join(', ') || 'TODOS'}`);
console.log(`🧠 Modelo: ${CONFIG.claudeModel}`);
console.log(`🔄 Max iterações: ${CONFIG.maxIterations}`);
console.log('');

// ============================================
// INICIALIZAR AGENTE
// ============================================

const agent = new ClaudeAgent({
  apiKey: CONFIG.anthropicApiKey,
  model: CONFIG.claudeModel,
  maxTokens: CONFIG.maxTokens,
  maxIterations: CONFIG.maxIterations
});

// Registrar ferramentas
agent.registerTool('computer', computerTool);
agent.registerTool('bash', bashTool);
agent.registerTool('str_replace_editor', editorTool);
agent.registerTool('browser', browserTool);

// Eventos do agente
agent.on('tool:executing', ({ name, input }) => {
  console.log(`🔧 Executando: ${name}`, JSON.stringify(input).slice(0, 100));
});

agent.on('tool:executed', ({ name, result }) => {
  const resultPreview = typeof result === 'object' 
    ? (result.type === 'image' ? '[screenshot]' : JSON.stringify(result).slice(0, 100))
    : String(result).slice(0, 100);
  console.log(`✅ ${name}:`, resultPreview);
});

agent.on('iteration:start', ({ iteration }) => {
  console.log(`🔄 Iteração ${iteration}`);
});

agent.on('error', (error) => {
  console.error('❌ Erro:', error.message);
});

// ============================================
// INICIALIZAR TELEGRAM BOT
// ============================================

const bot = new TelegramBot(CONFIG.telegramToken, { polling: true });

// Estado por chat
const chatState = new Map();

function getChatState(chatId) {
  if (!chatState.has(chatId)) {
    chatState.set(chatId, {
      isProcessing: false,
      taskCount: 0
    });
  }
  return chatState.get(chatId);
}

function isAllowed(userId) {
  if (CONFIG.allowedUsers.length === 0 || CONFIG.allowedUsers.includes('*')) {
    return true;
  }
  return CONFIG.allowedUsers.includes(userId.toString());
}

async function sendTyping(chatId) {
  try { await bot.sendChatAction(chatId, 'typing'); } catch {}
}

async function sendLongMessage(chatId, text, options = {}) {
  const MAX_LENGTH = 4000;
  
  if (text.length <= MAX_LENGTH) {
    return await bot.sendMessage(chatId, text, options);
  }
  
  // Dividir mensagem
  const parts = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    if (remaining.length <= MAX_LENGTH) {
      parts.push(remaining);
      break;
    }
    
    // Tentar quebrar em nova linha
    let breakPoint = remaining.lastIndexOf('\n', MAX_LENGTH);
    if (breakPoint < MAX_LENGTH / 2) {
      breakPoint = MAX_LENGTH;
    }
    
    parts.push(remaining.slice(0, breakPoint));
    remaining = remaining.slice(breakPoint);
  }
  
  for (const part of parts) {
    await bot.sendMessage(chatId, part, options);
  }
}

// ============================================
// HANDLERS TELEGRAM
// ============================================

// /start
bot.onText(/^\/start$/i, async (msg) => {
  const chatId = msg.chat.id;
  
  if (!isAllowed(msg.from.id)) {
    return bot.sendMessage(chatId, `❌ Acesso negado.\n\nSeu ID: \`${msg.from.id}\``, { parse_mode: 'Markdown' });
  }
  
  const welcome = `🤖 *CLAUDE AGENT - Orange Pi 6 Plus*

Olá! Sou um agente de IA avançado com *controle total* do sistema.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠 *Powered by Claude (Anthropic)*
Posso entender linguagem natural e executar tarefas complexas de forma autônoma.

🖥️ *Computer Use*
Posso ver a tela, mover mouse, clicar e digitar.

💻 *Terminal*
Posso executar qualquer comando bash.

📝 *Editor*
Posso criar e editar arquivos.

🌐 *Browser*
Posso navegar na internet e pesquisar.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*COMANDOS:*
/screenshot - Captura a tela
/status - Status do agente
/clear - Limpa histórico
/help - Esta mensagem

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*COMO USAR:*
Apenas me diga o que você quer fazer em linguagem natural!

Exemplos:
• "Abra o navegador e pesquise sobre Linux"
• "Crie um arquivo Python que calcule fatorial"
• "Mostre o uso de CPU e memória"
• "Abra o terminal e instale htop"
• "Clique no ícone do menu"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Modelo: \`${CONFIG.claudeModel}\``;

  await bot.sendMessage(chatId, welcome, { parse_mode: 'Markdown' });
});

// /help
bot.onText(/^\/help$/i, async (msg) => {
  bot.emit('text', { ...msg, text: '/start' });
});

// /screenshot
bot.onText(/^\/screenshot$/i, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  try {
    await bot.sendChatAction(chatId, 'upload_photo');
    
    const { takeScreenshot } = require('./src/tools/computer');
    const result = await takeScreenshot();
    
    if (result.type === 'image') {
      const buffer = Buffer.from(result.data, 'base64');
      await bot.sendPhoto(chatId, buffer, { caption: '📸 Screenshot' });
    } else {
      await bot.sendMessage(chatId, '❌ Erro ao capturar tela');
    }
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Erro: ${error.message}`);
  }
});

// /status
bot.onText(/^\/status$/i, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  const status = agent.getStatus();
  const state = getChatState(chatId);
  
  const { executeBash } = require('./src/tools/bash');
  const cpuResult = await executeBash("top -bn1 | grep 'Cpu(s)' | awk '{print int($2+$4)}'");
  const memResult = await executeBash("free -m | awk 'NR==2{printf \"%d/%dMB (%.1f%%)\", $3,$2,$3*100/$2}'");
  const tempResult = await executeBash("cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null | awk '{printf \"%.1f\", $1/1000}'");
  
  const statusText = `📊 *STATUS DO AGENTE*

🤖 *Agente*
├ Modelo: ${status.model}
├ Ferramentas: ${status.toolsCount}
├ Memória: ${status.memorySize} mensagens
└ Processando: ${status.isRunning ? '✅ Sim' : '❌ Não'}

🖥️ *Sistema*
├ CPU: ${cpuResult.output || 'N/A'}%
├ RAM: ${memResult.output || 'N/A'}
└ Temp: ${tempResult.output || 'N/A'}°C

📱 *Sessão*
└ Tarefas executadas: ${state.taskCount}`;

  await bot.sendMessage(chatId, statusText, { parse_mode: 'Markdown' });
});

// /clear
bot.onText(/^\/clear$/i, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  agent.clearMemory();
  await bot.sendMessage(chatId, '🗑️ Histórico de conversa limpo');
});

// /stop
bot.onText(/^\/stop$/i, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  const state = getChatState(chatId);
  if (state.isProcessing) {
    state.shouldStop = true;
    await bot.sendMessage(chatId, '⏹️ Parando tarefa...');
  } else {
    await bot.sendMessage(chatId, 'ℹ️ Nenhuma tarefa em execução');
  }
});

// ============================================
// HANDLER PRINCIPAL - MENSAGENS
// ============================================

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  
  // Ignorar comandos
  if (text.startsWith('/')) return;
  
  // Verificar permissão
  if (!isAllowed(msg.from.id)) return;
  
  // Ignorar mensagens vazias
  if (!text.trim()) return;
  
  const state = getChatState(chatId);
  
  // Verificar se já está processando
  if (state.isProcessing) {
    await bot.sendMessage(chatId, '⏳ Aguarde, ainda estou processando a tarefa anterior...\n\nUse /stop para cancelar.');
    return;
  }
  
  state.isProcessing = true;
  state.taskCount++;
  
  console.log(`\n📩 [${msg.from.id}] ${text.slice(0, 100)}...`);
  
  // Mensagem de processamento
  const processingMsg = await bot.sendMessage(chatId, '🤔 Pensando...');
  
  try {
    await sendTyping(chatId);
    
    // Processar com o agente
    const result = await agent.processMessage(text);
    
    // Deletar mensagem de processamento
    try { await bot.deleteMessage(chatId, processingMsg.message_id); } catch {}
    
    if (result.response) {
      await sendLongMessage(chatId, result.response);
      console.log(`📤 Resposta enviada (${result.iterations} iterações)`);
    } else {
      await bot.sendMessage(chatId, '✅ Tarefa concluída');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
    
    try { await bot.deleteMessage(chatId, processingMsg.message_id); } catch {}
    
    let errorMsg = `❌ Erro: ${error.message}`;
    
    if (error.message.includes('API')) {
      errorMsg += '\n\nVerifique sua ANTHROPIC_API_KEY.';
    }
    
    await bot.sendMessage(chatId, errorMsg);
  } finally {
    state.isProcessing = false;
  }
});

// ============================================
// HANDLER DE FOTOS
// ============================================

bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  
  if (!isAllowed(msg.from.id)) return;
  
  const caption = msg.caption || 'O que você vê nesta imagem?';
  
  try {
    // Obter maior resolução
    const photo = msg.photo[msg.photo.length - 1];
    const file = await bot.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${CONFIG.telegramToken}/${file.file_path}`;
    
    // Baixar imagem
    const https = require('https');
    const imageBuffer = await new Promise((resolve, reject) => {
      https.get(fileUrl, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });
    });
    
    const base64 = imageBuffer.toString('base64');
    
    // Enviar para o agente com a imagem
    // (Nota: isso requer suporte a imagens no agent.processMessage)
    await bot.sendMessage(chatId, '📸 Imagem recebida! Analisando...');
    
    // Por enquanto, apenas confirmar recebimento
    await bot.sendMessage(chatId, `Recebi a imagem. "${caption}"\n\nPara análise de imagens da tela, use /screenshot e me pergunte sobre o que você vê.`);
    
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Erro ao processar imagem: ${error.message}`);
  }
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGINT', async () => {
  console.log('\n👋 Encerrando...');
  
  try {
    const { closeBrowser } = require('./src/tools/browser');
    await closeBrowser();
  } catch {}
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 Encerrando...');
  process.exit(0);
});

// ============================================
// INICIALIZAÇÃO COMPLETA
// ============================================

console.log('✅ Claude Agent iniciado!');
console.log('📱 Aguardando mensagens no Telegram...');
console.log('');
