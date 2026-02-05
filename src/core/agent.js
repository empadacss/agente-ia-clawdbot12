/**
 * ============================================
 * CLAUDE AGENT - CORE ENGINE
 * ============================================
 * Agente autônomo powered by Claude API
 * com agentic loop e tool use
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
      maxIterations: config.maxIterations || 25
    };

    this.client = new Anthropic({ apiKey: this.config.apiKey });
    this.tools = new Map();
    this.conversations = new Map(); // memória por chatId
    this.isRunning = false;
    this.currentTask = null;
    this.abortController = null;

    this.systemPrompt = this._buildSystemPrompt();
  }

  _buildSystemPrompt() {
    return `Você é um agente de IA autônomo extremamente capaz rodando em uma Orange Pi 6 Plus (RK3588, 32 GB RAM, Linux, ambiente gráfico X11).

## CAPACIDADES

### COMPUTER USE
Veja a tela via screenshot e aja com mouse/teclado usando a ferramenta "computer".
- SEMPRE tire um screenshot antes de clicar para confirmar posições.
- Use coordenadas absolutas [x, y] baseadas no screenshot.

### BASH
Execute qualquer comando no terminal. Use para instalar pacotes, gerenciar serviços, verificar sistema, etc.

### EDITOR
Crie e edite arquivos. Visualize conteúdo, substitua texto, insira linhas.

### BROWSER
Navegue na web com Puppeteer. Pesquise no Google/YouTube, extraia conteúdo de páginas.

## ESTRATÉGIA
1. Analise o pedido do usuário.
2. Planeje os passos necessários.
3. Execute cada passo e verifique o resultado.
4. Se falhar, tente abordagem alternativa.
5. Confirme conclusão ao usuário com resumo.

## REGRAS
- Responda em português brasileiro.
- Seja conciso mas informativo.
- Em tarefas GUI, capture screenshot → analise → aja.
- Não execute comandos destrutivos sem avisar.
- Reporte progresso de tarefas longas.`;
  }

  // ----- Ferramentas -----

  registerTool(name, definition) {
    this.tools.set(name, definition);
    this.emit('tool:registered', { name });
  }

  _getToolDefinitions() {
    const defs = [];
    for (const [, tool] of this.tools) {
      defs.push({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema || tool.input_schema
      });
    }
    return defs;
  }

  async _executeTool(name, input) {
    // Procurar por name do registro OU por name interno da ferramenta
    let tool = this.tools.get(name);
    if (!tool) {
      for (const [, t] of this.tools) {
        if (t.name === name) { tool = t; break; }
      }
    }
    if (!tool) return { error: `Ferramenta desconhecida: ${name}` };

    try {
      this.emit('tool:executing', { name, input });
      const start = Date.now();
      const result = await tool.handler(input);
      const elapsed = Date.now() - start;
      this.emit('tool:executed', { name, input, result, elapsed });
      return result;
    } catch (err) {
      this.emit('tool:error', { name, error: err });
      return { error: err.message };
    }
  }

  // ----- Memória por chat -----

  _getHistory(chatId) {
    if (!this.conversations.has(chatId)) {
      this.conversations.set(chatId, []);
    }
    return this.conversations.get(chatId);
  }

  _trimHistory(history, maxPairs = 10) {
    // Manter no máximo maxPairs pares user/assistant
    // Contar pares (cada par = user msg + assistant msg + tool results)
    // Simplificação: manter últimos N messages
    const MAX = maxPairs * 3; // estimativa
    if (history.length > MAX) {
      history.splice(0, history.length - MAX);
    }
  }

  clearMemory(chatId) {
    if (chatId) {
      this.conversations.delete(chatId);
    } else {
      this.conversations.clear();
    }
    this.emit('memory:cleared', { chatId });
  }

  // ----- Agentic Loop -----

  async processMessage(userMessage, chatId = 'default') {
    const history = this._getHistory(chatId);
    history.push({ role: 'user', content: userMessage });
    this._trimHistory(history);

    // Copiar histórico para a request (não incluir tool results gigantes de imagens antigas)
    const messages = history.map(m => ({ ...m }));

    this.isRunning = true;
    this.abortController = new AbortController();

    let iterations = 0;
    let finalResponse = null;
    let totalToolCalls = 0;

    try {
      while (iterations < this.config.maxIterations) {
        iterations++;
        this.emit('iteration:start', { iteration: iterations, maxIterations: this.config.maxIterations });

        if (this.abortController.signal.aborted) {
          finalResponse = 'Tarefa cancelada pelo usuário.';
          break;
        }

        const response = await this.client.messages.create({
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          system: this.systemPrompt,
          tools: this._getToolDefinitions(),
          messages
        });

        // Adicionar resposta do assistant
        messages.push({ role: 'assistant', content: response.content });

        // Extrair tool_use blocks
        const toolUses = response.content.filter(b => b.type === 'tool_use');

        if (toolUses.length === 0 || response.stop_reason === 'end_turn') {
          // Resposta final - extrair texto
          const texts = response.content.filter(b => b.type === 'text');
          finalResponse = texts.map(b => b.text).join('\n') || null;
          break;
        }

        // Executar ferramentas
        const toolResults = [];
        for (const tu of toolUses) {
          totalToolCalls++;
          const result = await this._executeTool(tu.name, tu.input);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: this._formatToolResult(result)
          });
        }

        messages.push({ role: 'user', content: toolResults });
      }
    } catch (err) {
      this.emit('error', err);
      throw err;
    } finally {
      this.isRunning = false;
      this.abortController = null;
    }

    // Salvar resposta final no histórico (resumida)
    if (finalResponse) {
      history.push({ role: 'assistant', content: finalResponse });
    }
    this._trimHistory(history);

    this.emit('response:complete', { response: finalResponse, iterations, totalToolCalls });
    return { response: finalResponse, iterations, totalToolCalls };
  }

  _formatToolResult(result) {
    if (!result) return 'null';

    // Imagem
    if (result.type === 'image' && result.data) {
      return [{
        type: 'image',
        source: {
          type: 'base64',
          media_type: result.mediaType || 'image/png',
          data: result.data
        }
      }];
    }

    // String simples
    if (typeof result === 'string') return result;

    // Objeto com error
    if (result.error) return `ERROR: ${result.error}`;

    // Objeto genérico - serializar
    const str = JSON.stringify(result, null, 2);
    // Limitar tamanho para não estourar contexto
    if (str.length > 50000) {
      return str.slice(0, 50000) + '\n... (truncado)';
    }
    return str;
  }

  // ----- Controle -----

  abort() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      currentTask: this.currentTask,
      conversationsCount: this.conversations.size,
      toolsCount: this.tools.size,
      model: this.config.model
    };
  }
}

module.exports = ClaudeAgent;
