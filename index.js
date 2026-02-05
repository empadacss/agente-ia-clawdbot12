#!/usr/bin/env node

/**
 * ============================================
 * 🧠 CLAUDE AGENT - Orange Pi 6 Plus
 * ============================================
 * 
 * Agente de IA de próximo nível usando Claude API
 * com Tool Use para controle total do sistema
 * 
 * Features:
 * - 🧠 Claude API com Function Calling
 * - 👁️ Visão Computacional (analisa screenshots)
 * - 🖱️ Controle de Mouse
 * - ⌨️ Controle de Teclado  
 * - 🚀 Abrir Aplicativos
 * - 🌐 Pesquisar na Internet
 * - 📸 Screenshots
 * - 📊 Monitoramento do Sistema
 * - 📍 Controle GPIO
 * - 🤖 Modo Autônomo
 * 
 * ============================================
 */

require('dotenv').config();

const ClaudeAgent = require('./src/agent/claude-agent');
const TelegramInterface = require('./src/telegram/bot');
const tools = require('./src/tools');

// ============================================
// BANNER
// ============================================

console.log('');
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║                                                                ║');
console.log('║   🧠 CLAUDE AGENT - Orange Pi 6 Plus                           ║');
console.log('║                                                                ║');
console.log('║   Agente de IA de Próximo Nível                                ║');
console.log('║                                                                ║');
console.log('║   🖱️ Mouse │ ⌨️ Teclado │ 🚀 Apps │ 🌐 Web │ 👁️ Visão          ║');
console.log('║                                                                ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');

// ============================================
// CONFIGURAÇÃO
// ============================================

const CONFIG = {
  // Claude API
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  
  // Telegram
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN,
  allowedUsers: (process.env.TELEGRAM_ALLOWED_CHAT_ID || process.env.ALLOWED_USERS || '').split(',').filter(Boolean)
};

// Validar configuração
if (!CONFIG.anthropicApiKey) {
  console.error('❌ ANTHROPIC_API_KEY não configurada!');
  console.log('');
  console.log('Configure sua API key do Claude:');
  console.log('  export ANTHROPIC_API_KEY="sk-ant-..."');
  console.log('');
  process.exit(1);
}

if (!CONFIG.telegramToken) {
  console.error('❌ TELEGRAM_BOT_TOKEN não configurado!');
  console.log('');
  console.log('Configure seu token do Telegram:');
  console.log('  export TELEGRAM_BOT_TOKEN="123456:ABC..."');
  console.log('');
  process.exit(1);
}

console.log('📊 Configuração:');
console.log(`   🧠 Modelo: ${CONFIG.claudeModel}`);
console.log(`   📱 Telegram: ${CONFIG.telegramToken.slice(0, 10)}...`);
console.log(`   👤 Usuários: ${CONFIG.allowedUsers.join(', ') || 'TODOS'}`);
console.log('');

// ============================================
// INICIALIZAR AGENTE
// ============================================

console.log('🔄 Inicializando agente...');

const agent = new ClaudeAgent({
  apiKey: CONFIG.anthropicApiKey,
  model: CONFIG.claudeModel
});

// Registrar todas as ferramentas
console.log('🔧 Registrando ferramentas...');
agent.registerTools(tools.getAllTools());

console.log(`   ✅ ${tools.getAllTools().length} ferramentas registradas`);
console.log('');

// ============================================
// INICIALIZAR TELEGRAM
// ============================================

console.log('📱 Iniciando Telegram Bot...');

const telegram = new TelegramInterface(CONFIG.telegramToken, agent, {
  allowedUsers: CONFIG.allowedUsers
});

// ============================================
// FINALIZAÇÃO
// ============================================

console.log('');
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║                                                                ║');
console.log('║   ✅ AGENTE PRONTO!                                            ║');
console.log('║                                                                ║');
console.log('║   Converse naturalmente no Telegram.                           ║');
console.log('║   O Claude entende e executa qualquer comando.                 ║');
console.log('║                                                                ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('📝 Exemplos de comandos:');
console.log('   • "Mova o mouse para 500, 300 e clique"');
console.log('   • "Abra o navegador e pesquise o clima"');
console.log('   • "Tire um print da tela pra eu ver"');
console.log('   • "Qual o status do sistema?"');
console.log('   • "Pesquise no YouTube músicas relaxantes"');
console.log('');
console.log('🚀 Modo autônomo: /auto <objetivo>');
console.log('   Exemplo: /auto Abra o terminal e execute htop');
console.log('');

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGINT', () => {
  console.log('\n👋 Encerrando...');
  telegram.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Encerrando...');
  telegram.stop();
  process.exit(0);
});

// Manter processo rodando
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não tratado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada:', reason);
});
