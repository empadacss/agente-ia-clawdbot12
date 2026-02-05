/**
 * ============================================
 * 📝 FILE EDITOR TOOL
 * ============================================
 * Criação e edição de arquivos
 * ============================================
 */

const fs = require('fs');
const path = require('path');

const MAX_FILE_SIZE = 1024 * 1024; // 1MB max

/**
 * Ler conteúdo de arquivo
 */
function readFile(filePath, options = {}) {
  const { startLine, endLine } = options;
  
  try {
    const absolutePath = path.resolve(filePath);
    
    if (!fs.existsSync(absolutePath)) {
      return { error: `Arquivo não encontrado: ${filePath}` };
    }
    
    const stats = fs.statSync(absolutePath);
    
    if (stats.size > MAX_FILE_SIZE) {
      return { error: `Arquivo muito grande (max ${MAX_FILE_SIZE / 1024}KB)` };
    }
    
    let content = fs.readFileSync(absolutePath, 'utf-8');
    
    // Se especificou linhas, filtrar
    if (startLine !== undefined || endLine !== undefined) {
      const lines = content.split('\n');
      const start = (startLine || 1) - 1;
      const end = endLine || lines.length;
      content = lines.slice(start, end).join('\n');
    }
    
    return {
      success: true,
      path: absolutePath,
      content,
      lines: content.split('\n').length
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Escrever/criar arquivo
 */
function writeFile(filePath, content) {
  try {
    const absolutePath = path.resolve(filePath);
    const dir = path.dirname(absolutePath);
    
    // Criar diretório se não existir
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(absolutePath, content, 'utf-8');
    
    return {
      success: true,
      path: absolutePath,
      message: 'Arquivo salvo',
      lines: content.split('\n').length
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Inserir texto em posição específica
 */
function insertText(filePath, insertLine, text) {
  try {
    const absolutePath = path.resolve(filePath);
    
    if (!fs.existsSync(absolutePath)) {
      return { error: `Arquivo não encontrado: ${filePath}` };
    }
    
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const lines = content.split('\n');
    
    // Inserir na linha especificada
    const lineIndex = Math.min(insertLine - 1, lines.length);
    lines.splice(lineIndex, 0, text);
    
    fs.writeFileSync(absolutePath, lines.join('\n'), 'utf-8');
    
    return {
      success: true,
      path: absolutePath,
      message: `Texto inserido na linha ${insertLine}`,
      newLines: lines.length
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Substituir texto
 */
function replaceText(filePath, oldText, newText, replaceAll = false) {
  try {
    const absolutePath = path.resolve(filePath);
    
    if (!fs.existsSync(absolutePath)) {
      return { error: `Arquivo não encontrado: ${filePath}` };
    }
    
    let content = fs.readFileSync(absolutePath, 'utf-8');
    
    let count = 0;
    if (replaceAll) {
      const regex = new RegExp(escapeRegex(oldText), 'g');
      content = content.replace(regex, () => { count++; return newText; });
    } else {
      if (content.includes(oldText)) {
        content = content.replace(oldText, newText);
        count = 1;
      }
    }
    
    if (count === 0) {
      return { error: 'Texto não encontrado' };
    }
    
    fs.writeFileSync(absolutePath, content, 'utf-8');
    
    return {
      success: true,
      path: absolutePath,
      message: `${count} substituição(ões) realizada(s)`
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Escapar caracteres de regex
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Desfazer última edição (simples - apenas guarda última versão)
 */
const undoHistory = new Map();

function saveUndo(filePath) {
  if (fs.existsSync(filePath)) {
    undoHistory.set(filePath, fs.readFileSync(filePath, 'utf-8'));
  }
}

function undoEdit(filePath) {
  const absolutePath = path.resolve(filePath);
  const previousContent = undoHistory.get(absolutePath);
  
  if (!previousContent) {
    return { error: 'Nenhuma edição para desfazer' };
  }
  
  fs.writeFileSync(absolutePath, previousContent, 'utf-8');
  undoHistory.delete(absolutePath);
  
  return { success: true, message: 'Edição desfeita' };
}

/**
 * Handler da ferramenta
 */
async function editorHandler(input) {
  const { command, path: filePath, file_text, insert_line, old_str, new_str, view_range } = input;
  
  switch (command) {
    case 'view':
      if (!filePath) return { error: 'path é obrigatório' };
      const viewOptions = {};
      if (view_range) {
        viewOptions.startLine = view_range[0];
        viewOptions.endLine = view_range[1];
      }
      return readFile(filePath, viewOptions);
    
    case 'create':
      if (!filePath || file_text === undefined) {
        return { error: 'path e file_text são obrigatórios' };
      }
      saveUndo(filePath);
      return writeFile(filePath, file_text);
    
    case 'str_replace':
      if (!filePath || !old_str || new_str === undefined) {
        return { error: 'path, old_str e new_str são obrigatórios' };
      }
      saveUndo(filePath);
      return replaceText(filePath, old_str, new_str);
    
    case 'insert':
      if (!filePath || !insert_line || !new_str) {
        return { error: 'path, insert_line e new_str são obrigatórios' };
      }
      saveUndo(filePath);
      return insertText(filePath, insert_line, new_str);
    
    case 'undo_edit':
      if (!filePath) return { error: 'path é obrigatório' };
      return undoEdit(filePath);
    
    default:
      return { error: `Comando desconhecido: ${command}` };
  }
}

/**
 * Definição da ferramenta para o Claude
 */
const editorTool = {
  name: 'str_replace_editor',
  description: `Editor de arquivos com capacidade de criar, visualizar e editar.

Comandos:
- view: Visualiza conteúdo do arquivo (opcionalmente um range de linhas)
- create: Cria ou sobrescreve arquivo com novo conteúdo
- str_replace: Substitui old_str por new_str no arquivo
- insert: Insere texto em uma linha específica
- undo_edit: Desfaz a última edição do arquivo`,
  
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['view', 'create', 'str_replace', 'insert', 'undo_edit'],
        description: 'O comando a executar'
      },
      path: {
        type: 'string',
        description: 'Caminho do arquivo'
      },
      file_text: {
        type: 'string',
        description: 'Conteúdo completo para criar arquivo (comando create)'
      },
      old_str: {
        type: 'string',
        description: 'Texto a ser substituído (comando str_replace)'
      },
      new_str: {
        type: 'string',
        description: 'Novo texto (comandos str_replace e insert)'
      },
      insert_line: {
        type: 'integer',
        description: 'Linha onde inserir (comando insert)'
      },
      view_range: {
        type: 'array',
        items: { type: 'integer' },
        description: 'Range de linhas [inicio, fim] (comando view)'
      }
    },
    required: ['command', 'path']
  },
  
  handler: editorHandler
};

module.exports = {
  editorTool,
  readFile,
  writeFile,
  insertText,
  replaceText
};
