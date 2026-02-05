/**
 * ============================================
 * 🧠 CLAUDE AGENT - Cérebro do Sistema
 * ============================================
 * Agente de IA avançado usando Claude API
 * com Tool Use (Function Calling) nativo
 * ============================================
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

class ClaudeAgent {
  constructor(config = {}) {
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY
    });
    
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.maxTokens = config.maxTokens || 4096;
    
    // Sistema de memória
    this.memory = {
      shortTerm: [], // Últimas interações
      longTerm: new Map(), // Fatos importantes
      tasks: [], // Tarefas em andamento
      context: {} // Contexto atual
    };
    
    // Ferramentas disponíveis
    this.tools = [];
    this.toolHandlers = new Map();
    
    // Estado
    this.isProcessing = false;
    this.lastScreenshot = null;
    
    console.log('🧠 Claude Agent inicializado');
    console.log(`📊 Modelo: ${this.model}`);
  }

  /**
   * Registrar uma ferramenta que o Claude pode usar
   */
  registerTool(tool) {
    this.tools.push({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters
    });
    
    this.toolHandlers.set(tool.name, tool.handler);
    console.log(`🔧 Ferramenta registrada: ${tool.name}`);
  }

  /**
   * Registrar múltiplas ferramentas
   */
  registerTools(tools) {
    tools.forEach(tool => this.registerTool(tool));
  }

  /**
   * Processar mensagem do usuário
   */
  async processMessage(userMessage, options = {}) {
    this.isProcessing = true;
    
    try {
      // Construir mensagens com histórico
      const messages = this.buildMessages(userMessage, options);
      
      // Fazer chamada ao Claude
      const response = await this.callClaude(messages, options);
      
      // Processar resposta (pode incluir tool calls)
      const result = await this.processResponse(response, messages, options);
      
      // Salvar no histórico
      this.saveToMemory(userMessage, result.text);
      
      return result;
      
    } catch (error) {
      console.error('❌ Erro no agente:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Construir array de mensagens com contexto
   */
  buildMessages(userMessage, options = {}) {
    const messages = [];
    
    // Adicionar histórico recente
    for (const item of this.memory.shortTerm.slice(-10)) {
      messages.push({ role: 'user', content: item.user });
      messages.push({ role: 'assistant', content: item.assistant });
    }
    
    // Mensagem atual
    const content = [];
    
    // Adicionar screenshot se disponível
    if (options.screenshot) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: options.screenshot
        }
      });
    }
    
    // Adicionar texto
    content.push({
      type: 'text',
      text: userMessage
    });
    
    messages.push({ role: 'user', content });
    
    return messages;
  }

  /**
   * Chamar Claude API
   */
  async callClaude(messages, options = {}) {
    const systemPrompt = this.buildSystemPrompt(options);
    
    const params = {
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages: messages
    };
    
    // Adicionar ferramentas se disponíveis
    if (this.tools.length > 0) {
      params.tools = this.tools;
    }
    
    return await this.client.messages.create(params);
  }

  /**
   * Processar resposta do Claude (incluindo tool calls)
   */
  async processResponse(response, messages, options = {}) {
    const result = {
      text: '',
      toolResults: [],
      actions: []
    };
    
    // Processar cada bloco de conteúdo
    for (const block of response.content) {
      if (block.type === 'text') {
        result.text += block.text;
      }
      
      if (block.type === 'tool_use') {
        // Executar ferramenta
        const toolResult = await this.executeTool(block);
        result.toolResults.push(toolResult);
        result.actions.push({
          tool: block.name,
          input: block.input,
          result: toolResult.result
        });
      }
    }
    
    // Se houve tool calls, fazer nova chamada com resultados
    if (response.stop_reason === 'tool_use') {
      // Adicionar resultados das ferramentas
      const toolResultMessages = result.toolResults.map(tr => ({
        type: 'tool_result',
        tool_use_id: tr.id,
        content: JSON.stringify(tr.result)
      }));
      
      messages.push({
        role: 'assistant',
        content: response.content
      });
      
      messages.push({
        role: 'user',
        content: toolResultMessages
      });
      
      // Nova chamada para obter resposta final
      const finalResponse = await this.callClaude(messages, options);
      
      // Processar recursivamente (pode haver mais tool calls)
      const finalResult = await this.processResponse(finalResponse, messages, options);
      
      result.text = finalResult.text;
      result.toolResults.push(...finalResult.toolResults);
      result.actions.push(...finalResult.actions);
    }
    
    return result;
  }

  /**
   * Executar uma ferramenta
   */
  async executeTool(toolCall) {
    const handler = this.toolHandlers.get(toolCall.name);
    
    if (!handler) {
      return {
        id: toolCall.id,
        result: { error: `Ferramenta não encontrada: ${toolCall.name}` }
      };
    }
    
    try {
      console.log(`🔧 Executando: ${toolCall.name}`);
      console.log(`   Params: ${JSON.stringify(toolCall.input)}`);
      
      const result = await handler(toolCall.input);
      
      console.log(`   ✅ Resultado: ${JSON.stringify(result).slice(0, 100)}...`);
      
      return {
        id: toolCall.id,
        result: result
      };
    } catch (error) {
      console.error(`   ❌ Erro: ${error.message}`);
      return {
        id: toolCall.id,
        result: { error: error.message }
      };
    }
  }

  /**
   * Construir system prompt
   */
  buildSystemPrompt(options = {}) {
    const contextInfo = this.getContextInfo();
    
    return `Você é um agente de IA de próximo nível controlando uma Orange Pi 6 Plus com 32GB de RAM.

## IDENTIDADE

Você é um assistente extremamente capaz que tem CONTROLE TOTAL sobre o computador. Você pode ver a tela, mover o mouse, digitar, abrir programas, navegar na web - tudo que um humano faria no computador, você também pode fazer.

## SUAS CAPACIDADES

### 🖱️ MOUSE (mouse_*)
- mouse_move: Mover cursor para posição X, Y
- mouse_move_relative: Mover relativamente
- mouse_click: Clicar (left, right, middle, duplo)
- mouse_click_at: Mover e clicar
- mouse_scroll: Scroll up/down
- mouse_drag: Arrastar de A para B
- mouse_get_position: Onde está o cursor?

### ⌨️ TECLADO (keyboard_*)  
- keyboard_type: Digitar texto
- keyboard_press: Pressionar tecla (enter, esc, tab, f1-f12, setas...)
- keyboard_combo: Combos (ctrl+c, alt+tab, ctrl+shift+esc...)
- keyboard_shortcut: Atalhos prontos (copiar, colar, salvar, desktop...)

### 🚀 APLICATIVOS (app_*, window_*)
- app_open: Abrir programa (navegador, terminal, arquivos, vscode...)
- app_open_url: Abrir URL no browser padrão
- app_open_file: Abrir arquivo com programa padrão
- window_list: Listar janelas abertas
- window_focus: Focar janela pelo nome
- window_close: Fechar janela ativa
- window_minimize/maximize: Minimizar/Maximizar

### 🌐 WEB SEARCH (web_search_*)
- web_search_google: Pesquisar no Google
- web_search_youtube: Pesquisar vídeos
- web_search_wikipedia: Pesquisar na Wikipedia
- web_search_maps: Pesquisar locais

### 🌐 BROWSER AUTOMATION (browser_*)
- browser_open: Abrir browser controlado
- browser_navigate: Ir para URL
- browser_click: Clicar em elemento
- browser_type: Digitar em campo
- browser_screenshot: Print do browser
- browser_get_text/html/links: Extrair conteúdo
- browser_scroll: Rolar página
- browser_press_key: Pressionar tecla
- browser_back/forward/refresh: Navegação
- browser_new_tab/list_tabs/switch_tab: Gerenciar abas
- browser_evaluate: Executar JavaScript

### 📸 TELA (screen_*)
- screen_screenshot: Capturar tela inteira
- screen_get_resolution: Resolução da tela
- screen_get_active_window: Janela ativa

### 📊 SISTEMA (system_*)
- system_status: CPU, RAM, disco, temperatura
- system_run_command: Executar comando terminal
- system_list_processes: Ver processos
- system_service_control: Controlar serviços

### 📁 ARQUIVOS (file_*)
- file_read: Ler arquivo
- file_write: Escrever arquivo
- file_list: Listar diretório
- file_delete: Deletar arquivo
- file_mkdir: Criar pasta

### 💾 MEMÓRIA (memory_*)
- memory_remember: Salvar fato para lembrar depois
- memory_recall: Recuperar fato
- memory_list_facts: Ver todos os fatos
- memory_add_task: Adicionar tarefa
- memory_list_tasks: Ver tarefas
- memory_set_shortcut: Criar atalho personalizado
- memory_add_note: Adicionar nota

### 📍 GPIO (gpio_*)
- gpio_write: Escrever em pino
- gpio_read: Ler pino

## CONTEXTO ATUAL
${contextInfo}

## INSTRUÇÕES CRÍTICAS

1. **SEMPRE USE AS FERRAMENTAS** - Quando o usuário pedir uma ação, execute-a usando as ferramentas. Não apenas descreva como fazer.

2. **SEJA PROATIVO** - Se uma tarefa requer múltiplas ações, execute todas em sequência. Exemplo: "abra o navegador e pesquise X" = app_open + esperar + keyboard_type + keyboard_press enter

3. **VISÃO** - Se uma imagem/screenshot for enviada, você pode VER e analisar o conteúdo. Use isso para guiar suas ações.

4. **CONFIRME AÇÕES** - Após executar, confirme brevemente o que foi feito.

5. **PORTUGUÊS** - Responda sempre em português brasileiro, de forma clara e direta.

6. **MEMÓRIA** - Use memory_remember para guardar informações importantes que o usuário mencionar (nome, preferências, etc).

## EXEMPLOS DE FLUXO

Usuário: "Abre o terminal"
→ Use app_open com app="terminal"

Usuário: "Pesquisa no Google sobre Orange Pi"
→ Use web_search_google com query="Orange Pi"

Usuário: "Move o mouse pro canto e clica"
→ Use mouse_move para posição + mouse_click

Usuário: "Tira um print pra eu ver"
→ Use screen_screenshot (a imagem será enviada automaticamente)

Usuário: "Meu nome é João, lembra disso"
→ Use memory_remember com key="nome_usuario", value="João"

## MODO AUTÔNOMO

Quando receber tarefas complexas, execute passo a passo sem perguntar confirmação para cada etapa. Seja eficiente e direto.`;
  }

  /**
   * Obter informações de contexto
   */
  getContextInfo() {
    const info = [];
    
    if (this.memory.context.lastWindow) {
      info.push(`Última janela ativa: ${this.memory.context.lastWindow}`);
    }
    
    if (this.memory.context.lastMousePosition) {
      info.push(`Posição do mouse: ${JSON.stringify(this.memory.context.lastMousePosition)}`);
    }
    
    if (this.memory.tasks.length > 0) {
      info.push(`Tarefas em andamento: ${this.memory.tasks.length}`);
    }
    
    return info.length > 0 ? info.join('\n') : 'Nenhum contexto adicional';
  }

  /**
   * Salvar interação na memória
   */
  saveToMemory(userMessage, assistantResponse) {
    this.memory.shortTerm.push({
      user: userMessage,
      assistant: assistantResponse,
      timestamp: Date.now()
    });
    
    // Manter apenas últimas 20 interações
    if (this.memory.shortTerm.length > 20) {
      this.memory.shortTerm = this.memory.shortTerm.slice(-20);
    }
  }

  /**
   * Adicionar fato à memória de longo prazo
   */
  remember(key, value) {
    this.memory.longTerm.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Recuperar fato da memória
   */
  recall(key) {
    return this.memory.longTerm.get(key)?.value;
  }

  /**
   * Atualizar contexto
   */
  updateContext(key, value) {
    this.memory.context[key] = value;
  }

  /**
   * Limpar memória de curto prazo
   */
  clearShortTermMemory() {
    this.memory.shortTerm = [];
  }

  /**
   * Processar com visão (screenshot)
   */
  async processWithVision(userMessage, screenshotBase64) {
    return await this.processMessage(userMessage, {
      screenshot: screenshotBase64
    });
  }

  /**
   * Modo autônomo - executar sequência de tarefas
   */
  async executeAutonomously(goal, maxSteps = 10) {
    console.log(`🤖 Modo autônomo: ${goal}`);
    
    const results = [];
    let step = 0;
    let completed = false;
    
    while (step < maxSteps && !completed) {
      step++;
      console.log(`📍 Passo ${step}/${maxSteps}`);
      
      const prompt = step === 1
        ? `Objetivo: ${goal}\n\nExecute o primeiro passo para alcançar este objetivo.`
        : `Continue executando os próximos passos para o objetivo: ${goal}\n\nResultados anteriores: ${JSON.stringify(results.slice(-3))}`;
      
      const result = await this.processMessage(prompt);
      results.push(result);
      
      // Verificar se completou
      if (result.text.toLowerCase().includes('concluído') || 
          result.text.toLowerCase().includes('finalizado') ||
          result.text.toLowerCase().includes('objetivo alcançado')) {
        completed = true;
      }
    }
    
    return {
      goal,
      steps: step,
      completed,
      results
    };
  }
}

module.exports = ClaudeAgent;
