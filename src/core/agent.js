/**
 * ============================================
 * 🤖 CLAUDE AGENT - CORE ENGINE
 * ============================================
 * Agente autônomo de nível empresarial
 * Powered by Claude API com Computer Use
 * ============================================
 */

const Anthropic = require('@anthropic-ai/sdk');
const EventEmitter = require('events');

class ClaudeAgent extends EventEmitter {
  constructor(config) {
    super();
    
    this.config = {
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      model: config.model || 'claude-sonnet-4-20250514',
      maxTokens: config.maxTokens || 8192,
      temperature: config.temperature || 0.7,
      maxIterations: config.maxIterations || 20,
      ...config
    };
    
    this.client = new Anthropic({ apiKey: this.config.apiKey });
    this.tools = new Map();
    this.memory = [];
    this.taskQueue = [];
    this.isRunning = false;
    this.currentTask = null;
    
    this.systemPrompt = this._buildSystemPrompt();
  }
  
  _buildSystemPrompt() {
    return `Você é um agente de IA autônomo extremamente capaz, controlando uma Orange Pi 6 Plus com 32GB de RAM.

## SUAS CAPACIDADES

### 🖥️ COMPUTER USE
Você pode VER a tela através de screenshots e AGIR através de mouse e teclado.
Use a ferramenta 'computer' para interagir com a interface gráfica.

### 🛠️ FERRAMENTAS DISPONÍVEIS
- **computer**: Controle de mouse, teclado e screenshots
- **bash**: Executar comandos no terminal
- **file_editor**: Criar e editar arquivos
- **browser**: Navegar na internet e pesquisar

### 🧠 COMO PENSAR
1. Analise o que o usuário quer
2. Planeje os passos necessários
3. Execute cada passo verificando o resultado
4. Se algo falhar, tente uma abordagem alternativa
5. Confirme quando a tarefa estiver completa

### 📋 REGRAS
- Sempre capture um screenshot antes de clicar para ter certeza da posição
- Use coordenadas precisas baseadas no screenshot
- Seja proativo: se o usuário pedir algo vago, pergunte ou faça a melhor escolha
- Reporte o progresso de tarefas longas
- Se encontrar um erro, tente resolver automaticamente

### 🎯 SEU OBJETIVO
Ajudar o usuário a controlar completamente a Orange Pi, executando qualquer tarefa solicitada de forma autônoma e inteligente.`;
  }
  
  /**
   * Registrar uma ferramenta
   */
  registerTool(name, definition) {
    this.tools.set(name, definition);
    this.emit('tool:registered', { name, definition });
  }
  
  /**
   * Obter definições de ferramentas para o Claude
   */
  getToolDefinitions() {
    const definitions = [];
    
    for (const [name, tool] of this.tools) {
      definitions.push({
        name: tool.name || name,
        description: tool.description,
        input_schema: tool.inputSchema || tool.input_schema
      });
    }
    
    return definitions;
  }
  
  /**
   * Executar uma ferramenta
   */
  async executeTool(name, input) {
    const tool = this.tools.get(name);
    
    if (!tool) {
      return { error: `Ferramenta não encontrada: ${name}` };
    }
    
    try {
      this.emit('tool:executing', { name, input });
      const result = await tool.handler(input);
      this.emit('tool:executed', { name, input, result });
      return result;
    } catch (error) {
      this.emit('tool:error', { name, input, error });
      return { error: error.message };
    }
  }
  
  /**
   * Processar uma mensagem do usuário
   */
  async processMessage(userMessage, options = {}) {
    const messages = [
      ...this.memory.slice(-20), // Últimas 20 mensagens do histórico
      { role: 'user', content: userMessage }
    ];
    
    this.memory.push({ role: 'user', content: userMessage });
    
    let iterations = 0;
    let finalResponse = null;
    
    while (iterations < this.config.maxIterations) {
      iterations++;
      
      this.emit('iteration:start', { iteration: iterations });
      
      try {
        const response = await this.client.messages.create({
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          system: this.systemPrompt,
          tools: this.getToolDefinitions(),
          messages
        });
        
        // Processar a resposta
        const assistantMessage = { role: 'assistant', content: response.content };
        messages.push(assistantMessage);
        
        // Verificar se há tool_use
        const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');
        
        if (toolUseBlocks.length === 0) {
          // Sem ferramentas para executar, resposta final
          const textBlocks = response.content.filter(block => block.type === 'text');
          finalResponse = textBlocks.map(b => b.text).join('\n');
          break;
        }
        
        // Executar ferramentas
        const toolResults = [];
        
        for (const toolUse of toolUseBlocks) {
          const result = await this.executeTool(toolUse.name, toolUse.input);
          
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: this._formatToolResult(result)
          });
        }
        
        // Adicionar resultados das ferramentas
        messages.push({ role: 'user', content: toolResults });
        
        // Verificar stop_reason
        if (response.stop_reason === 'end_turn' && toolUseBlocks.length === 0) {
          break;
        }
        
      } catch (error) {
        this.emit('error', error);
        throw error;
      }
    }
    
    if (finalResponse) {
      this.memory.push({ role: 'assistant', content: finalResponse });
    }
    
    this.emit('response:complete', { response: finalResponse, iterations });
    
    return {
      response: finalResponse,
      iterations
    };
  }
  
  /**
   * Formatar resultado de ferramenta para o Claude
   */
  _formatToolResult(result) {
    if (result.type === 'image') {
      return [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: result.mediaType || 'image/png',
            data: result.data
          }
        }
      ];
    }
    
    if (typeof result === 'string') {
      return result;
    }
    
    return JSON.stringify(result, null, 2);
  }
  
  /**
   * Executar tarefa autônoma
   */
  async runAutonomousTask(task, onProgress) {
    this.isRunning = true;
    this.currentTask = task;
    
    const progressHandler = (data) => {
      if (onProgress) onProgress(data);
    };
    
    this.on('tool:executing', progressHandler);
    this.on('iteration:start', progressHandler);
    
    try {
      const result = await this.processMessage(
        `Execute a seguinte tarefa de forma autônoma e completa: ${task}`
      );
      
      return result;
    } finally {
      this.isRunning = false;
      this.currentTask = null;
      this.off('tool:executing', progressHandler);
      this.off('iteration:start', progressHandler);
    }
  }
  
  /**
   * Limpar memória
   */
  clearMemory() {
    this.memory = [];
    this.emit('memory:cleared');
  }
  
  /**
   * Obter status do agente
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentTask: this.currentTask,
      memorySize: this.memory.length,
      toolsCount: this.tools.size,
      model: this.config.model
    };
  }
}

module.exports = ClaudeAgent;
