/**
 * ============================================
 * 💾 MEMORY TOOLS - Ferramentas de Memória
 * ============================================
 */

const PersistentMemory = require('../utils/memory');

// Instância compartilhada da memória
const memory = new PersistentMemory();

const memoryTools = [
  {
    name: 'memory_remember',
    description: 'Salva um fato importante na memória de longo prazo',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Nome/chave do fato (ex: "nome_usuario", "preferencia_tema")' },
        value: { type: 'string', description: 'Valor a lembrar' }
      },
      required: ['key', 'value']
    },
    async handler({ key, value }) {
      memory.setFact(key, value);
      return { success: true, message: `Lembrado: ${key} = ${value}` };
    }
  },
  
  {
    name: 'memory_recall',
    description: 'Recupera um fato da memória',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Nome/chave do fato' }
      },
      required: ['key']
    },
    async handler({ key }) {
      const value = memory.getFact(key);
      if (value !== undefined) {
        return { found: true, key, value };
      }
      return { found: false, key };
    }
  },
  
  {
    name: 'memory_list_facts',
    description: 'Lista todos os fatos salvos na memória',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      const facts = memory.getAllFacts();
      return { facts, count: facts.length };
    }
  },
  
  {
    name: 'memory_forget',
    description: 'Remove um fato da memória',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Nome/chave do fato a esquecer' }
      },
      required: ['key']
    },
    async handler({ key }) {
      memory.deleteFact(key);
      return { success: true, message: `Esquecido: ${key}` };
    }
  },
  
  {
    name: 'memory_add_task',
    description: 'Adiciona uma tarefa para lembrar depois',
    parameters: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Descrição da tarefa' }
      },
      required: ['task']
    },
    async handler({ task }) {
      const added = memory.addTask(task);
      return { success: true, task: added };
    }
  },
  
  {
    name: 'memory_list_tasks',
    description: 'Lista tarefas pendentes',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      const tasks = memory.getTasks();
      return { tasks, count: tasks.length };
    }
  },
  
  {
    name: 'memory_complete_task',
    description: 'Marca uma tarefa como concluída',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'ID da tarefa' }
      },
      required: ['id']
    },
    async handler({ id }) {
      const task = memory.completeTask(id);
      if (task) {
        return { success: true, task };
      }
      return { error: 'Tarefa não encontrada' };
    }
  },
  
  {
    name: 'memory_set_shortcut',
    description: 'Cria um atalho para um comando frequente',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome do atalho' },
        command: { type: 'string', description: 'Comando/ação a executar' }
      },
      required: ['name', 'command']
    },
    async handler({ name, command }) {
      memory.setShortcut(name, command);
      return { success: true, message: `Atalho "${name}" criado` };
    }
  },
  
  {
    name: 'memory_list_shortcuts',
    description: 'Lista atalhos personalizados',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      return { shortcuts: memory.getAllShortcuts() };
    }
  },
  
  {
    name: 'memory_add_note',
    description: 'Adiciona uma nota rápida',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Conteúdo da nota' }
      },
      required: ['content']
    },
    async handler({ content }) {
      const note = memory.addNote(content);
      return { success: true, note };
    }
  },
  
  {
    name: 'memory_list_notes',
    description: 'Lista notas salvas',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'integer', default: 10 }
      },
      required: []
    },
    async handler({ limit = 10 }) {
      return { notes: memory.getNotes(limit) };
    }
  },
  
  {
    name: 'memory_get_context',
    description: 'Obtém resumo do contexto da memória',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      return { context: memory.getContext() };
    }
  },
  
  {
    name: 'memory_clear',
    description: 'Limpa toda a memória (cuidado!)',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      memory.clear();
      return { success: true, message: 'Memória limpa' };
    }
  }
];

module.exports = { memoryTools, memory };
