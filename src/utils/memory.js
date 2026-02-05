/**
 * ============================================
 * 💾 MEMORY - Sistema de Memória Persistente
 * ============================================
 */

const fs = require('fs');
const path = require('path');

class PersistentMemory {
  constructor(filepath = null) {
    this.filepath = filepath || path.join(process.env.HOME || '/tmp', '.claude-agent-memory.json');
    this.data = {
      facts: {},           // Fatos importantes
      preferences: {},     // Preferências do usuário
      history: [],         // Histórico resumido
      tasks: [],           // Tarefas recorrentes
      shortcuts: {},       // Atalhos personalizados
      notes: []           // Notas gerais
    };
    
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filepath)) {
        const content = fs.readFileSync(this.filepath, 'utf8');
        this.data = JSON.parse(content);
        console.log('💾 Memória carregada');
      }
    } catch (error) {
      console.log('💾 Iniciando nova memória');
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filepath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('❌ Erro ao salvar memória:', error.message);
    }
  }

  // ============================================
  // FATOS
  // ============================================
  
  setFact(key, value) {
    this.data.facts[key] = {
      value,
      updatedAt: Date.now()
    };
    this.save();
  }

  getFact(key) {
    return this.data.facts[key]?.value;
  }

  getAllFacts() {
    return Object.entries(this.data.facts).map(([key, data]) => ({
      key,
      value: data.value,
      updatedAt: new Date(data.updatedAt).toLocaleString('pt-BR')
    }));
  }

  deleteFact(key) {
    delete this.data.facts[key];
    this.save();
  }

  // ============================================
  // PREFERÊNCIAS
  // ============================================
  
  setPreference(key, value) {
    this.data.preferences[key] = value;
    this.save();
  }

  getPreference(key, defaultValue = null) {
    return this.data.preferences[key] ?? defaultValue;
  }

  // ============================================
  // HISTÓRICO
  // ============================================
  
  addToHistory(summary) {
    this.data.history.push({
      summary,
      timestamp: Date.now()
    });
    
    // Manter apenas últimas 100 entradas
    if (this.data.history.length > 100) {
      this.data.history = this.data.history.slice(-100);
    }
    
    this.save();
  }

  getHistory(limit = 10) {
    return this.data.history.slice(-limit);
  }

  // ============================================
  // TAREFAS
  // ============================================
  
  addTask(task) {
    this.data.tasks.push({
      id: Date.now(),
      task,
      createdAt: Date.now(),
      completed: false
    });
    this.save();
    return this.data.tasks[this.data.tasks.length - 1];
  }

  completeTask(id) {
    const task = this.data.tasks.find(t => t.id === id);
    if (task) {
      task.completed = true;
      task.completedAt = Date.now();
      this.save();
    }
    return task;
  }

  getTasks(includeCompleted = false) {
    if (includeCompleted) return this.data.tasks;
    return this.data.tasks.filter(t => !t.completed);
  }

  // ============================================
  // ATALHOS
  // ============================================
  
  setShortcut(name, command) {
    this.data.shortcuts[name] = command;
    this.save();
  }

  getShortcut(name) {
    return this.data.shortcuts[name];
  }

  getAllShortcuts() {
    return this.data.shortcuts;
  }

  // ============================================
  // NOTAS
  // ============================================
  
  addNote(content) {
    this.data.notes.push({
      id: Date.now(),
      content,
      createdAt: Date.now()
    });
    this.save();
    return this.data.notes[this.data.notes.length - 1];
  }

  getNotes(limit = 10) {
    return this.data.notes.slice(-limit);
  }

  deleteNote(id) {
    this.data.notes = this.data.notes.filter(n => n.id !== id);
    this.save();
  }

  // ============================================
  // LIMPAR
  // ============================================
  
  clear() {
    this.data = {
      facts: {},
      preferences: {},
      history: [],
      tasks: [],
      shortcuts: {},
      notes: []
    };
    this.save();
  }

  // ============================================
  // EXPORTAR COMO CONTEXTO
  // ============================================
  
  getContext() {
    const facts = this.getAllFacts();
    const tasks = this.getTasks();
    const shortcuts = this.getAllShortcuts();
    
    let context = '';
    
    if (facts.length > 0) {
      context += '\n📚 FATOS CONHECIDOS:\n';
      facts.forEach(f => {
        context += `- ${f.key}: ${f.value}\n`;
      });
    }
    
    if (tasks.length > 0) {
      context += '\n📋 TAREFAS PENDENTES:\n';
      tasks.forEach(t => {
        context += `- ${t.task}\n`;
      });
    }
    
    if (Object.keys(shortcuts).length > 0) {
      context += '\n⚡ ATALHOS CONFIGURADOS:\n';
      Object.entries(shortcuts).forEach(([name, cmd]) => {
        context += `- "${name}" → ${cmd}\n`;
      });
    }
    
    return context || 'Nenhum contexto adicional na memória.';
  }
}

module.exports = PersistentMemory;
