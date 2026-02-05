/**
 * ============================================
 * 🧠 MEMORY - Sistema de Memória Persistente
 * ============================================
 * Armazena histórico de interações e contexto
 * para melhorar respostas futuras
 * ============================================
 */

const fs = require('fs');
const path = require('path');

const MEMORY_FILE = path.join(__dirname, '..', 'data', 'memory.json');
const MAX_MEMORIES = 1000;

// Garantir que diretório existe
const dataDir = path.dirname(MEMORY_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Carregar memórias existentes
function loadMemories() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Erro ao carregar memórias:', error.message);
  }
  return { interactions: [], summaries: {} };
}

// Salvar memórias
function saveMemories(memories) {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar memórias:', error.message);
  }
}

// Salvar nova interação
async function save(interaction) {
  const memories = loadMemories();
  
  memories.interactions.push({
    ...interaction,
    id: Date.now()
  });
  
  // Limitar quantidade de memórias
  if (memories.interactions.length > MAX_MEMORIES) {
    memories.interactions = memories.interactions.slice(-MAX_MEMORIES);
  }
  
  saveMemories(memories);
}

// Buscar memórias relevantes
async function getRelevant(query, chatId, limit = 5) {
  const memories = loadMemories();
  
  // Filtrar por chatId se fornecido
  let relevant = memories.interactions;
  if (chatId) {
    relevant = relevant.filter(m => m.chatId === chatId);
  }
  
  // Pegar as últimas interações
  const recent = relevant.slice(-limit);
  
  if (recent.length === 0) return '';
  
  return recent.map(m => 
    `[${new Date(m.timestamp).toLocaleString('pt-BR')}]\nUsuário: ${m.userMessage}\nAgente: ${m.response?.slice(0, 200)}...`
  ).join('\n\n');
}

// Limpar memória
async function clear(chatId = null) {
  if (chatId) {
    const memories = loadMemories();
    memories.interactions = memories.interactions.filter(m => m.chatId !== chatId);
    saveMemories(memories);
  } else {
    saveMemories({ interactions: [], summaries: {} });
  }
}

// Obter estatísticas
function getStats() {
  const memories = loadMemories();
  return {
    totalInteractions: memories.interactions.length,
    uniqueChats: new Set(memories.interactions.map(m => m.chatId)).size,
    oldestMemory: memories.interactions[0]?.timestamp,
    newestMemory: memories.interactions[memories.interactions.length - 1]?.timestamp
  };
}

module.exports = {
  save,
  getRelevant,
  clear,
  getStats,
  loadMemories
};
