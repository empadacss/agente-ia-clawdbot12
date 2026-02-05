/**
 * ============================================
 * 📱 TELEGRAM BOT - Interface do Usuário
 * ============================================
 * Conecta o usuário ao Claude Agent
 * ============================================
 */

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

class TelegramInterface {
  constructor(token, agent, config = {}) {
    this.token = token;
    this.agent = agent;
    this.allowedUsers = config.allowedUsers || [];
    
    this.bot = new TelegramBot(token, { polling: true });
    this.setupHandlers();
    
    console.log('📱 Telegram Bot iniciado');
    console.log(`👤 Usuários permitidos: ${this.allowedUsers.join(', ') || 'TODOS'}`);
  }

  isAllowed(userId) {
    if (this.allowedUsers.length === 0) return true;
    if (this.allowedUsers.includes('*')) return true;
    return this.allowedUsers.includes(userId.toString());
  }

  async sendTyping(chatId) {
    try {
      await this.bot.sendChatAction(chatId, 'typing');
    } catch {}
  }

  async sendPhoto(chatId, photoPath, caption = '') {
    try {
      await this.bot.sendPhoto(chatId, photoPath, { caption });
    } catch (error) {
      console.error('Erro ao enviar foto:', error.message);
    }
  }

  setupHandlers() {
    // /start - Ajuda completa
    this.bot.onText(/^\/(start|help|ajuda)$/i, async (msg) => {
      if (!this.isAllowed(msg.from.id)) {
        return this.bot.sendMessage(msg.chat.id, `❌ Acesso negado.\nSeu ID: ${msg.from.id}`);
      }

      const help = `🧠 *CLAUDE AGENT - Orange Pi 6 Plus*

_Agente de IA com controle total do sistema_

━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 *COMO USAR*

Simplesmente *converse naturalmente* comigo!

Exemplos:
• "Mova o mouse para o centro da tela"
• "Abra o navegador e pesquise clima"
• "Clique no botão de fechar"
• "Digite meu email: exemplo@email.com"
• "Tira um print da tela pra eu ver"
• "Qual o status do sistema?"
• "Pesquisa no YouTube músicas relaxantes"

━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 *COMANDOS RÁPIDOS*

/tela - Screenshot
/status - Status do sistema
/janelas - Listar janelas
/limpar - Limpar memória

━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 *CAPACIDADES*

🖱️ Mouse - Mover, clicar, scroll, arrastar
⌨️ Teclado - Digitar, teclas, atalhos
🚀 Apps - Abrir programas, gerenciar janelas
🌐 Web - Pesquisar Google, YouTube, Maps
📸 Tela - Screenshots, análise visual
📊 Sistema - CPU, RAM, temperatura
📍 GPIO - Automação física

━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠 Powered by Claude AI`;

      await this.bot.sendMessage(msg.chat.id, help, { parse_mode: 'Markdown' });
    });

    // /tela - Screenshot
    this.bot.onText(/^\/tela$/i, async (msg) => {
      if (!this.isAllowed(msg.from.id)) return;
      
      await this.sendTyping(msg.chat.id);
      
      try {
        const result = await this.agent.processMessage('Tire uma screenshot da tela atual.');
        
        // Procurar por screenshot nos resultados
        for (const action of result.actions || []) {
          if (action.tool === 'screen_screenshot' && action.result?.path) {
            await this.sendPhoto(msg.chat.id, action.result.path, '📸 Screenshot');
            return;
          }
        }
        
        await this.bot.sendMessage(msg.chat.id, result.text || '❌ Erro ao capturar');
      } catch (error) {
        await this.bot.sendMessage(msg.chat.id, `❌ ${error.message}`);
      }
    });

    // /status - Status do sistema
    this.bot.onText(/^\/status$/i, async (msg) => {
      if (!this.isAllowed(msg.from.id)) return;
      
      await this.sendTyping(msg.chat.id);
      
      try {
        const result = await this.agent.processMessage('Me mostre o status completo do sistema.');
        await this.bot.sendMessage(msg.chat.id, result.text, { parse_mode: 'Markdown' });
      } catch (error) {
        await this.bot.sendMessage(msg.chat.id, `❌ ${error.message}`);
      }
    });

    // /janelas - Listar janelas
    this.bot.onText(/^\/janelas$/i, async (msg) => {
      if (!this.isAllowed(msg.from.id)) return;
      
      await this.sendTyping(msg.chat.id);
      
      try {
        const result = await this.agent.processMessage('Liste todas as janelas abertas.');
        await this.bot.sendMessage(msg.chat.id, result.text);
      } catch (error) {
        await this.bot.sendMessage(msg.chat.id, `❌ ${error.message}`);
      }
    });

    // /limpar - Limpar memória
    this.bot.onText(/^\/limpar$/i, async (msg) => {
      if (!this.isAllowed(msg.from.id)) return;
      
      this.agent.clearShortTermMemory();
      await this.bot.sendMessage(msg.chat.id, '🗑️ Memória limpa. Começando conversa do zero.');
    });

    // /auto - Modo autônomo
    this.bot.onText(/^\/auto (.+)$/i, async (msg, match) => {
      if (!this.isAllowed(msg.from.id)) return;
      
      const goal = match[1];
      await this.bot.sendMessage(msg.chat.id, `🤖 Iniciando modo autônomo...\n\n*Objetivo:* ${goal}`, { parse_mode: 'Markdown' });
      
      try {
        const result = await this.agent.executeAutonomously(goal, 10);
        
        let summary = `🤖 *Modo Autônomo Finalizado*\n\n`;
        summary += `📊 Passos: ${result.steps}\n`;
        summary += `✅ Concluído: ${result.completed ? 'Sim' : 'Não'}\n\n`;
        summary += `📝 Último resultado:\n${result.results[result.results.length - 1]?.text?.slice(0, 500) || 'N/A'}`;
        
        await this.bot.sendMessage(msg.chat.id, summary, { parse_mode: 'Markdown' });
      } catch (error) {
        await this.bot.sendMessage(msg.chat.id, `❌ ${error.message}`);
      }
    });

    // Mensagens gerais - Processar com Claude
    this.bot.on('message', async (msg) => {
      if (!msg.text) return;
      if (msg.text.startsWith('/')) return;
      if (!this.isAllowed(msg.from.id)) return;

      const chatId = msg.chat.id;
      const text = msg.text;

      console.log(`📩 [${msg.from.id}] ${text.slice(0, 50)}...`);
      
      await this.sendTyping(chatId);

      try {
        const result = await this.agent.processMessage(text);
        
        // Processar resultado
        let response = result.text;
        
        // Se houve ações, adicionar resumo
        if (result.actions && result.actions.length > 0) {
          const actionsText = result.actions
            .map(a => `✅ ${a.tool}`)
            .join('\n');
          
          // Verificar se há screenshots para enviar
          for (const action of result.actions) {
            if (action.tool === 'screen_screenshot' && action.result?.path) {
              await this.sendPhoto(chatId, action.result.path, '📸 Screenshot');
            }
          }
        }
        
        // Enviar resposta (dividir se muito longa)
        if (response.length > 4000) {
          const parts = response.match(/.{1,4000}/gs) || [];
          for (const part of parts) {
            await this.bot.sendMessage(chatId, part);
          }
        } else {
          await this.bot.sendMessage(chatId, response);
        }
        
        console.log('📤 Resposta enviada');
        
      } catch (error) {
        console.error('❌ Erro:', error.message);
        await this.bot.sendMessage(chatId, `❌ Erro: ${error.message}`);
      }
    });

    // Processar fotos (para visão)
    this.bot.on('photo', async (msg) => {
      if (!this.isAllowed(msg.from.id)) return;

      const chatId = msg.chat.id;
      const caption = msg.caption || 'O que você vê nesta imagem?';
      
      await this.sendTyping(chatId);

      try {
        // Pegar maior resolução
        const photo = msg.photo[msg.photo.length - 1];
        const file = await this.bot.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${this.token}/${file.file_path}`;
        
        // Baixar imagem
        const response = await fetch(fileUrl);
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        
        // Processar com visão
        const result = await this.agent.processWithVision(caption, base64);
        
        await this.bot.sendMessage(chatId, result.text);
        
      } catch (error) {
        console.error('❌ Erro ao processar imagem:', error.message);
        await this.bot.sendMessage(chatId, `❌ Erro: ${error.message}`);
      }
    });
  }

  stop() {
    this.bot.stopPolling();
    console.log('📱 Telegram Bot parado');
  }
}

module.exports = TelegramInterface;
