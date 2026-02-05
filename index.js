#!/usr/bin/env node

/**
 * ============================================
 * 🤖 CLAUDE AGENT - Orange Pi 6 Plus
 * ============================================
 * 
 * Agente Autônomo de Nível Profissional
 * Powered by Claude API
 * 
 * Capacidades:
 * - 🖱️ Controle total de mouse
 * - ⌨️ Controle total de teclado
 * - 🚀 Abrir e gerenciar aplicativos
 * - 🌐 Navegar e pesquisar na web
 * - 📸 Visão computacional (screenshots)
 * - 🧠 Raciocínio e planejamento avançado
 * - 📊 Monitoramento de sistema
 * - 🔄 Execução autônoma de tarefas
 * 
 * ============================================
 */

require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const ClaudeAgent = require('./agent/core');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURAÇÃO
// ============================================

const CONFIG = {
  // Telegram
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || '',
  allowedUsers: (process.env.TELEGRAM_ALLOWED_USERS || process.env.ALLOWED_USERS || '').split(',').filter(Boolean),
  
  // Claude
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  maxTokens: parseInt(process.env.MAX_TOKENS) || 8192,
  maxIterations: parseInt(process.env.MAX_ITERATIONS) || 20
};

// ============================================
// BANNER
// ============================================

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                                                            ║');
console.log('║   🤖 CLAUDE AGENT - Orange Pi 6 Plus                       ║');
console.log('║                                                            ║');
console.log('║   Agente Autônomo de Nível Profissional                    ║');
console.log('║   Powered by Claude API + Tool Use + Vision                ║');
console.log('║                                                            ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

// ============================================
// VALIDAÇÃO
// ============================================

if (!CONFIG.telegramToken) {
  console.error('❌ TELEGRAM_BOT_TOKEN não configurado!');
  console.error('   Defina a variável de ambiente TELEGRAM_BOT_TOKEN');
  process.exit(1);
}

if (!CONFIG.anthropicApiKey) {
  console.error('❌ ANTHROPIC_API_KEY não configurado!');
  console.error('   Defina a variável de ambiente ANTHROPIC_API_KEY');
  process.exit(1);
}

console.log(`📱 Telegram: ${CONFIG.allowedUsers.length > 0 ? CONFIG.allowedUsers.join(', ') : 'TODOS (sem restrição)'}`);
console.log(`🧠 Claude: ${CONFIG.claudeModel}`);
console.log(`🔧 Max Iterações: ${CONFIG.maxIterations}`);
console.log('');

// ============================================
// INICIALIZAR AGENTE E BOT
// ============================================

const agent = new ClaudeAgent({
  apiKey: CONFIG.anthropicApiKey,
  model: CONFIG.claudeModel,
  maxTokens: CONFIG.maxTokens,
  maxIterations: CONFIG.maxIterations
});

const bot = new TelegramBot(CONFIG.telegramToken, { polling: true });

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function isAllowed(userId) {
  if (CONFIG.allowedUsers.length === 0) return true;
  if (CONFIG.allowedUsers.includes('*')) return true;
  return CONFIG.allowedUsers.includes(userId.toString());
}

async function sendTyping(chatId) {
  try { await bot.sendChatAction(chatId, 'typing'); } catch {}
}

async function sendPhoto(chatId) {
  try { await bot.sendChatAction(chatId, 'upload_photo'); } catch {}
}

// Dividir mensagens longas
function splitMessage(text, maxLength = 4000) {
  if (text.length <= maxLength) return [text];
  
  const parts = [];
  let current = '';
  
  const lines = text.split('\n');
  for (const line of lines) {
    if ((current + '\n' + line).length > maxLength) {
      if (current) parts.push(current);
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }
  if (current) parts.push(current);
  
  return parts;
}

// ============================================
// HANDLERS TELEGRAM
// ============================================

// Comando /start
bot.onText(/^\/(start|help|ajuda)$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, `❌ Acesso negado.\nSeu ID: ${msg.from.id}`);
  }
  
  const help = `🤖 *CLAUDE AGENT - Orange Pi 6 Plus*

Sou um agente autônomo avançado powered by Claude.
Posso executar tarefas complexas de forma inteligente.

━━━━━━━━━━━━━━━━━━━━━━━━━━

*O QUE POSSO FAZER:*

🖱️ *Mouse* - Mover, clicar, scroll, arrastar
⌨️ *Teclado* - Digitar, teclas, combos
🚀 *Apps* - Abrir programas, gerenciar janelas
🌐 *Web* - Navegar, pesquisar, interagir
📸 *Visão* - Ver e analisar a tela
📊 *Sistema* - Monitorar, executar comandos
🔄 *Automação* - Tarefas multi-step

━━━━━━━━━━━━━━━━━━━━━━━━━━

*COMO USAR:*

Apenas me diga o que você quer fazer!

Exemplos:
• "Abra o navegador e pesquise sobre IA"
• "Tire um screenshot e me mostre"
• "Abra o terminal e rode htop"
• "Qual o status do sistema?"
• "Minimize todas as janelas"
• "Abra o YouTube e pesquise música"

━━━━━━━━━━━━━━━━━━━━━━━━━━

*COMANDOS:*

/tela - Screenshot da tela
/status - Status do sistema
/limpar - Limpar histórico
/help - Esta ajuda

━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Dica: Seja específico! Quanto mais detalhes, melhor executo a tarefa.`;

  await bot.sendMessage(msg.chat.id, help, { parse_mode: 'Markdown' });
});

// Comando /tela - Screenshot rápido
bot.onText(/^\/(tela|screenshot|ss|print)$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  
  await sendPhoto(msg.chat.id);
  
  try {
    const tools = require('./agent/tools');
    const result = await tools.execute('take_screenshot', {});
    
    if (result.type === 'image') {
      const buffer = Buffer.from(result.data, 'base64');
      await bot.sendPhoto(msg.chat.id, buffer, { caption: '📸 Screenshot atual' });
    } else {
      await bot.sendMessage(msg.chat.id, result.error || 'Erro ao capturar tela');
    }
  } catch (error) {
    await bot.sendMessage(msg.chat.id, `❌ Erro: ${error.message}`);
  }
});

// Comando /status
bot.onText(/^\/status$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  
  await sendTyping(msg.chat.id);
  
  try {
    const tools = require('./agent/tools');
    const result = await tools.execute('get_system_status', {});
    await bot.sendMessage(msg.chat.id, result);
  } catch (error) {
    await bot.sendMessage(msg.chat.id, `❌ Erro: ${error.message}`);
  }
});

// Comando /limpar
bot.onText(/^\/(limpar|clear|reset)$/i, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  
  agent.clearHistory();
  const memory = require('./agent/memory');
  await memory.clear(msg.chat.id.toString());
  
  await bot.sendMessage(msg.chat.id, '🗑️ Histórico e memória limpos');
});

// Comando /exec - Executar comando direto
bot.onText(/^\/exec (.+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  
  await sendTyping(msg.chat.id);
  
  try {
    const tools = require('./agent/tools');
    const result = await tools.execute('run_command', { command: match[1] });
    
    const parts = splitMessage(`\`\`\`\n${result}\n\`\`\``);
    for (const part of parts) {
      await bot.sendMessage(msg.chat.id, part, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    await bot.sendMessage(msg.chat.id, `❌ Erro: ${error.message}`);
  }
});

// ============================================
// HANDLER PRINCIPAL - AGENTE AUTÔNOMO
// ============================================

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  const userId = msg.from.id;
  
  // Ignorar comandos
  if (text.startsWith('/')) return;
  
  // Verificar permissão
  if (!isAllowed(userId)) {
    return bot.sendMessage(chatId, `❌ Acesso negado. Seu ID: ${userId}`);
  }
  
  // Ignorar mensagens vazias
  if (!text.trim()) return;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📩 [${userId}] ${text}`);
  console.log(`${'='.repeat(60)}`);
  
  // Enviar indicador de digitação
  await sendTyping(chatId);
  
  // Configurar intervalo para manter "digitando" ativo
  const typingInterval = setInterval(() => sendTyping(chatId), 4000);
  
  try {
    // Notificar início do processamento
    const processingMsg = await bot.sendMessage(chatId, '🧠 Processando sua solicitação...');
    
    // Executar agente
    const response = await agent.processMessage(text, chatId.toString());
    
    // Deletar mensagem de processamento
    try { await bot.deleteMessage(chatId, processingMsg.message_id); } catch {}
    
    // Enviar resposta
    if (response) {
      const parts = splitMessage(response);
      for (const part of parts) {
        await bot.sendMessage(chatId, part, { parse_mode: 'Markdown' }).catch(() => {
          // Se falhar com Markdown, enviar sem formatação
          bot.sendMessage(chatId, part);
        });
      }
    }
    
    console.log('✅ Resposta enviada');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    await bot.sendMessage(chatId, `❌ Erro: ${error.message}`);
  } finally {
    clearInterval(typingInterval);
  }
});

// ============================================
// HANDLER DE FOTOS (Visão)
// ============================================

bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  
  if (!isAllowed(msg.from.id)) return;
  
  await sendTyping(chatId);
  
  try {
    // Pegar a maior resolução da foto
    const photo = msg.photo[msg.photo.length - 1];
    const file = await bot.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${CONFIG.telegramToken}/${file.file_path}`;
    
    // Baixar a imagem
    const https = require('https');
    const imageBuffer = await new Promise((resolve, reject) => {
      https.get(fileUrl, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });
    });
    
    const base64Image = imageBuffer.toString('base64');
    const caption = msg.caption || 'O que você vê nesta imagem?';
    
    // Processar com Claude Vision
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: CONFIG.anthropicApiKey });
    
    const response = await client.messages.create({
      model: CONFIG.claudeModel,
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Image
            }
          },
          {
            type: 'text',
            text: caption
          }
        ]
      }]
    });
    
    const textResponse = response.content[0].text;
    await bot.sendMessage(chatId, textResponse);
    
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    await bot.sendMessage(chatId, `❌ Erro ao analisar imagem: ${error.message}`);
  }
});

// ============================================
// INICIALIZAÇÃO
// ============================================

console.log('✅ Claude Agent iniciado!');
console.log('🤖 Aguardando mensagens no Telegram...');
console.log('');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Encerrando...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Encerrando...');
  process.exit(0);
});

// Tratar erros não capturados
process.on('uncaughtException', (error) => {
  console.error('Erro não capturado:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Promise rejeitada:', error);
});
