/**
 * ============================================
 * 🧠 CLAUDE AGENT CORE - Orange Pi 6 Plus
 * ============================================
 * Agente Autônomo de Nível Profissional
 * 
 * Características:
 * - Claude API com Tool Use (function calling)
 * - Visão Computacional (análise de screenshots)
 * - Execução autônoma de tarefas complexas
 * - Planejamento e raciocínio multi-step
 * - Memória persistente
 * - Verificação de resultados
 * ============================================
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// Importar ferramentas
const tools = require('./tools');
const memory = require('./memory');

class ClaudeAgent {
  constructor(config) {
    this.config = {
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      model: config.model || 'claude-sonnet-4-20250514',
      maxTokens: config.maxTokens || 8192,
      maxIterations: config.maxIterations || 20,
      ...config
    };
    
    this.client = new Anthropic({ apiKey: this.config.apiKey });
    this.conversationHistory = [];
    this.taskHistory = [];
    this.isExecuting = false;
    
    console.log('🧠 Claude Agent inicializado');
    console.log(`📦 Modelo: ${this.config.model}`);
    console.log(`🔧 Ferramentas: ${Object.keys(tools.definitions).length}`);
  }
  
  // ============================================
  // SYSTEM PROMPT AVANÇADO
  // ============================================
  
  getSystemPrompt() {
    return `Você é um agente de IA autônomo extremamente capaz, controlando uma Orange Pi 6 Plus com 32GB de RAM.

## SUAS CAPACIDADES

Você tem CONTROLE TOTAL do sistema através de ferramentas especializadas:

### 🖱️ MOUSE
- Mover cursor para qualquer posição (x, y)
- Clicar (esquerdo, direito, duplo)
- Scroll (cima, baixo)
- Arrastar elementos

### ⌨️ TECLADO
- Digitar texto
- Pressionar teclas (Enter, Esc, Tab, F1-F12, etc)
- Combos (Ctrl+C, Alt+Tab, Ctrl+Shift+T, etc)
- Atalhos de sistema

### 🚀 APLICATIVOS
- Abrir qualquer programa
- Gerenciar janelas (focar, minimizar, maximizar, fechar)
- Executar comandos no terminal

### 🌐 NAVEGADOR E WEB
- Navegar para URLs
- Pesquisar (Google, YouTube, Wikipedia, Maps)
- Interagir com páginas web
- Preencher formulários

### 📸 VISÃO
- Capturar screenshots
- Analisar o que está na tela
- Localizar elementos visuais
- Verificar resultados de ações

### 📊 SISTEMA
- Monitorar CPU, RAM, temperatura, disco
- Gerenciar serviços
- Controlar GPIO
- Gerenciar arquivos

## COMO VOCÊ OPERA

1. **ENTENDA** a tarefa do usuário completamente
2. **PLANEJE** os passos necessários
3. **EXECUTE** cada passo usando as ferramentas apropriadas
4. **VERIFIQUE** o resultado (capture screenshot se necessário)
5. **ADAPTE** se algo não funcionar como esperado
6. **COMPLETE** a tarefa ou explique o que impediu

## REGRAS IMPORTANTES

- SEMPRE use ferramentas quando precisar interagir com o sistema
- Capture screenshots para verificar se ações funcionaram
- Se uma ação falhar, tente uma abordagem alternativa
- Seja proativo e complete tarefas sem pedir confirmação desnecessária
- Explique o que está fazendo de forma concisa
- Para tarefas complexas, divida em passos menores

## ESTILO DE RESPOSTA

- Seja direto e técnico
- Responda em português brasileiro
- Mostre progresso enquanto executa tarefas
- Relate o resultado final claramente

Você é o agente mais capaz possível. Execute tarefas com autonomia e inteligência.`;
  }
  
  // ============================================
  // DEFINIÇÕES DE FERRAMENTAS PARA CLAUDE
  // ============================================
  
  getToolDefinitions() {
    return [
      // MOUSE
      {
        name: 'mouse_move',
        description: 'Move o cursor do mouse para uma posição específica na tela',
        input_schema: {
          type: 'object',
          properties: {
            x: { type: 'integer', description: 'Posição X (horizontal)' },
            y: { type: 'integer', description: 'Posição Y (vertical)' }
          },
          required: ['x', 'y']
        }
      },
      {
        name: 'mouse_click',
        description: 'Clica com o mouse. Pode ser clique esquerdo, direito ou duplo.',
        input_schema: {
          type: 'object',
          properties: {
            button: { type: 'string', enum: ['left', 'right', 'middle'], description: 'Botão do mouse' },
            count: { type: 'integer', description: 'Número de cliques (2 para duplo clique)', default: 1 }
          }
        }
      },
      {
        name: 'mouse_click_at',
        description: 'Move o mouse para uma posição e clica',
        input_schema: {
          type: 'object',
          properties: {
            x: { type: 'integer', description: 'Posição X' },
            y: { type: 'integer', description: 'Posição Y' },
            button: { type: 'string', enum: ['left', 'right'], default: 'left' }
          },
          required: ['x', 'y']
        }
      },
      {
        name: 'mouse_scroll',
        description: 'Rola a roda do mouse para cima ou para baixo',
        input_schema: {
          type: 'object',
          properties: {
            direction: { type: 'string', enum: ['up', 'down'], description: 'Direção do scroll' },
            amount: { type: 'integer', description: 'Quantidade de scroll', default: 3 }
          },
          required: ['direction']
        }
      },
      {
        name: 'mouse_drag',
        description: 'Arrasta o mouse de um ponto a outro (click and drag)',
        input_schema: {
          type: 'object',
          properties: {
            start_x: { type: 'integer' },
            start_y: { type: 'integer' },
            end_x: { type: 'integer' },
            end_y: { type: 'integer' }
          },
          required: ['start_x', 'start_y', 'end_x', 'end_y']
        }
      },
      {
        name: 'mouse_position',
        description: 'Retorna a posição atual do cursor do mouse',
        input_schema: { type: 'object', properties: {} }
      },
      
      // TECLADO
      {
        name: 'type_text',
        description: 'Digita um texto no campo ou aplicativo ativo',
        input_schema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Texto para digitar' },
            delay: { type: 'integer', description: 'Delay entre caracteres em ms', default: 12 }
          },
          required: ['text']
        }
      },
      {
        name: 'press_key',
        description: 'Pressiona uma tecla específica (enter, esc, tab, f1-f12, backspace, delete, up, down, left, right, home, end, pageup, pagedown, etc)',
        input_schema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Nome da tecla' }
          },
          required: ['key']
        }
      },
      {
        name: 'press_combo',
        description: 'Pressiona uma combinação de teclas (ex: ctrl+c, alt+tab, ctrl+shift+t, super+d)',
        input_schema: {
          type: 'object',
          properties: {
            combo: { type: 'string', description: 'Combinação de teclas separadas por +' }
          },
          required: ['combo']
        }
      },
      
      // APLICATIVOS
      {
        name: 'open_application',
        description: 'Abre um aplicativo pelo nome (navegador, terminal, arquivos, editor, calculadora, vlc, etc)',
        input_schema: {
          type: 'object',
          properties: {
            app_name: { type: 'string', description: 'Nome do aplicativo' }
          },
          required: ['app_name']
        }
      },
      {
        name: 'open_url',
        description: 'Abre uma URL no navegador padrão',
        input_schema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL para abrir' }
          },
          required: ['url']
        }
      },
      {
        name: 'run_command',
        description: 'Executa um comando no terminal e retorna o resultado',
        input_schema: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Comando para executar' },
            timeout: { type: 'integer', description: 'Timeout em ms', default: 30000 }
          },
          required: ['command']
        }
      },
      {
        name: 'list_windows',
        description: 'Lista todas as janelas abertas no sistema',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'focus_window',
        description: 'Foca em uma janela específica pelo nome',
        input_schema: {
          type: 'object',
          properties: {
            window_name: { type: 'string', description: 'Nome ou parte do nome da janela' }
          },
          required: ['window_name']
        }
      },
      {
        name: 'close_window',
        description: 'Fecha a janela ativa atual',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'minimize_window',
        description: 'Minimiza a janela ativa',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'maximize_window',
        description: 'Maximiza a janela ativa',
        input_schema: { type: 'object', properties: {} }
      },
      
      // WEB E PESQUISA
      {
        name: 'search_google',
        description: 'Faz uma pesquisa no Google',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Termo de pesquisa' }
          },
          required: ['query']
        }
      },
      {
        name: 'search_youtube',
        description: 'Pesquisa vídeos no YouTube',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Termo de pesquisa' }
          },
          required: ['query']
        }
      },
      
      // TELA E VISÃO
      {
        name: 'take_screenshot',
        description: 'Captura um screenshot da tela atual. Use para verificar o estado da tela e resultados de ações.',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'get_screen_resolution',
        description: 'Retorna a resolução da tela',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'get_active_window',
        description: 'Retorna informações sobre a janela ativa',
        input_schema: { type: 'object', properties: {} }
      },
      
      // SISTEMA
      {
        name: 'get_system_status',
        description: 'Retorna status do sistema (CPU, RAM, disco, temperatura)',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'list_files',
        description: 'Lista arquivos em um diretório',
        input_schema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Caminho do diretório', default: '.' }
          }
        }
      },
      {
        name: 'read_file',
        description: 'Lê o conteúdo de um arquivo',
        input_schema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Caminho do arquivo' }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: 'Escreve conteúdo em um arquivo',
        input_schema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Caminho do arquivo' },
            content: { type: 'string', description: 'Conteúdo para escrever' }
          },
          required: ['path', 'content']
        }
      },
      
      // ESPERA
      {
        name: 'wait',
        description: 'Aguarda um tempo antes de continuar (útil para esperar carregamentos)',
        input_schema: {
          type: 'object',
          properties: {
            seconds: { type: 'number', description: 'Segundos para aguardar' }
          },
          required: ['seconds']
        }
      }
    ];
  }
  
  // ============================================
  // EXECUTAR FERRAMENTA
  // ============================================
  
  async executeTool(toolName, toolInput) {
    console.log(`🔧 Executando: ${toolName}`);
    console.log(`   Params: ${JSON.stringify(toolInput)}`);
    
    try {
      const result = await tools.execute(toolName, toolInput);
      console.log(`   ✅ Resultado: ${typeof result === 'string' ? result.slice(0, 100) : 'OK'}`);
      return result;
    } catch (error) {
      console.error(`   ❌ Erro: ${error.message}`);
      return { error: error.message };
    }
  }
  
  // ============================================
  // PROCESSAR MENSAGEM COM AGENTIC LOOP
  // ============================================
  
  async processMessage(userMessage, chatId = 'default') {
    if (this.isExecuting) {
      return 'Aguarde, ainda estou executando a tarefa anterior...';
    }
    
    this.isExecuting = true;
    const startTime = Date.now();
    
    try {
      // Adicionar mensagem do usuário ao histórico
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });
      
      // Carregar memória relevante
      const relevantMemory = await memory.getRelevant(userMessage, chatId);
      
      let messages = [...this.conversationHistory];
      let iterations = 0;
      let finalResponse = '';
      let screenshotData = null;
      
      // Loop agentic - continua até Claude terminar ou atingir limite
      while (iterations < this.config.maxIterations) {
        iterations++;
        console.log(`\n🔄 Iteração ${iterations}/${this.config.maxIterations}`);
        
        // Preparar conteúdo com possível screenshot
        let messageContent = messages[messages.length - 1].content;
        
        // Fazer chamada para Claude
        const response = await this.client.messages.create({
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          system: this.getSystemPrompt() + (relevantMemory ? `\n\nMemória relevante:\n${relevantMemory}` : ''),
          tools: this.getToolDefinitions(),
          messages: messages
        });
        
        console.log(`📩 Stop reason: ${response.stop_reason}`);
        
        // Processar resposta
        let assistantContent = [];
        let hasToolUse = false;
        
        for (const block of response.content) {
          if (block.type === 'text') {
            finalResponse = block.text;
            assistantContent.push(block);
            console.log(`💬 Texto: ${block.text.slice(0, 100)}...`);
          } else if (block.type === 'tool_use') {
            hasToolUse = true;
            assistantContent.push(block);
            
            // Executar ferramenta
            const toolResult = await this.executeTool(block.name, block.input);
            
            // Adicionar resposta do assistente e resultado da ferramenta
            messages.push({ role: 'assistant', content: assistantContent });
            
            // Se for screenshot, incluir como imagem
            if (block.name === 'take_screenshot' && toolResult.type === 'image') {
              messages.push({
                role: 'user',
                content: [
                  {
                    type: 'tool_result',
                    tool_use_id: block.id,
                    content: [
                      {
                        type: 'image',
                        source: {
                          type: 'base64',
                          media_type: 'image/png',
                          data: toolResult.data
                        }
                      },
                      {
                        type: 'text',
                        text: 'Screenshot capturado. Analise a imagem para verificar o estado da tela.'
                      }
                    ]
                  }
                ]
              });
            } else {
              messages.push({
                role: 'user',
                content: [{
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
                }]
              });
            }
            
            assistantContent = [];
          }
        }
        
        // Se não usou ferramenta, terminou
        if (!hasToolUse || response.stop_reason === 'end_turn') {
          // Adicionar resposta final ao histórico
          if (assistantContent.length > 0) {
            messages.push({ role: 'assistant', content: assistantContent });
          }
          break;
        }
      }
      
      // Atualizar histórico de conversa
      this.conversationHistory = messages.slice(-20); // Manter últimas 20 mensagens
      
      // Salvar na memória
      await memory.save({
        userMessage,
        response: finalResponse,
        iterations,
        chatId,
        timestamp: Date.now()
      });
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n✅ Tarefa concluída em ${elapsed}s (${iterations} iterações)`);
      
      return finalResponse;
      
    } catch (error) {
      console.error('❌ Erro no agente:', error);
      return `Erro: ${error.message}`;
    } finally {
      this.isExecuting = false;
    }
  }
  
  // ============================================
  // EXECUTAR TAREFA AUTÔNOMA
  // ============================================
  
  async executeTask(taskDescription) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 NOVA TAREFA: ${taskDescription}`);
    console.log(`${'='.repeat(60)}\n`);
    
    return await this.processMessage(taskDescription);
  }
  
  // ============================================
  // LIMPAR HISTÓRICO
  // ============================================
  
  clearHistory() {
    this.conversationHistory = [];
    console.log('🗑️ Histórico limpo');
  }
}

module.exports = ClaudeAgent;
