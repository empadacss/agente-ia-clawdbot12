/**
 * ============================================
 * FILE EDITOR TOOL
 * ============================================
 * Criação, visualização e edição de arquivos
 * com undo e validações
 * ============================================
 */

const fs = require('fs');
const path = require('path');

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const undoHistory = new Map();

function resolve(filePath) {
  return path.resolve(filePath);
}

function readFile(filePath, options = {}) {
  try {
    const abs = resolve(filePath);
    if (!fs.existsSync(abs)) return { error: `Arquivo não encontrado: ${filePath}` };

    const stats = fs.statSync(abs);
    if (stats.size > MAX_FILE_SIZE) return { error: `Arquivo grande demais (max 2MB)` };

    let content = fs.readFileSync(abs, 'utf-8');
    const totalLines = content.split('\n').length;

    if (options.startLine || options.endLine) {
      const lines = content.split('\n');
      const start = Math.max(0, (options.startLine || 1) - 1);
      const end = Math.min(lines.length, options.endLine || lines.length);
      content = lines.slice(start, end).map((l, i) => `${start + i + 1}\t${l}`).join('\n');
    }

    return { success: true, path: abs, content, totalLines };
  } catch (e) {
    return { error: e.message };
  }
}

function writeFile(filePath, content) {
  try {
    const abs = resolve(filePath);
    const dir = path.dirname(abs);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(abs, content, 'utf-8');
    return { success: true, path: abs, lines: content.split('\n').length };
  } catch (e) {
    return { error: e.message };
  }
}

function insertText(filePath, line, text) {
  try {
    const abs = resolve(filePath);
    if (!fs.existsSync(abs)) return { error: `Não encontrado: ${filePath}` };
    const lines = fs.readFileSync(abs, 'utf-8').split('\n');
    const idx = Math.min(Math.max(0, line - 1), lines.length);
    lines.splice(idx, 0, text);
    fs.writeFileSync(abs, lines.join('\n'), 'utf-8');
    return { success: true, path: abs, insertedAt: line };
  } catch (e) {
    return { error: e.message };
  }
}

function replaceText(filePath, oldStr, newStr) {
  try {
    const abs = resolve(filePath);
    if (!fs.existsSync(abs)) return { error: `Não encontrado: ${filePath}` };
    let content = fs.readFileSync(abs, 'utf-8');
    if (!content.includes(oldStr)) return { error: 'Texto antigo não encontrado no arquivo' };
    content = content.replace(oldStr, newStr);
    fs.writeFileSync(abs, content, 'utf-8');
    return { success: true, path: abs };
  } catch (e) {
    return { error: e.message };
  }
}

function saveUndo(filePath) {
  const abs = resolve(filePath);
  if (fs.existsSync(abs)) undoHistory.set(abs, fs.readFileSync(abs, 'utf-8'));
}

function undoEdit(filePath) {
  const abs = resolve(filePath);
  const prev = undoHistory.get(abs);
  if (!prev) return { error: 'Nada para desfazer' };
  fs.writeFileSync(abs, prev, 'utf-8');
  undoHistory.delete(abs);
  return { success: true, message: 'Desfeito' };
}

async function editorHandler(input) {
  const { command, path: fp, file_text, insert_line, old_str, new_str, view_range } = input;

  switch (command) {
    case 'view': {
      if (!fp) return { error: 'path obrigatório' };
      const opts = {};
      if (view_range) { opts.startLine = view_range[0]; opts.endLine = view_range[1]; }
      return readFile(fp, opts);
    }
    case 'create':
      if (!fp || file_text === undefined) return { error: 'path e file_text obrigatórios' };
      saveUndo(fp);
      return writeFile(fp, file_text);
    case 'str_replace':
      if (!fp || !old_str || new_str === undefined) return { error: 'path, old_str e new_str obrigatórios' };
      saveUndo(fp);
      return replaceText(fp, old_str, new_str);
    case 'insert':
      if (!fp || !insert_line || new_str === undefined) return { error: 'path, insert_line e new_str obrigatórios' };
      saveUndo(fp);
      return insertText(fp, insert_line, new_str);
    case 'undo_edit':
      if (!fp) return { error: 'path obrigatório' };
      return undoEdit(fp);
    default:
      return { error: `Comando desconhecido: ${command}` };
  }
}

const editorTool = {
  name: 'str_replace_editor',
  description: `Editor de arquivos.

Comandos:
- view: ver conteúdo (view_range [start, end] opcional)
- create: criar/sobrescrever (file_text)
- str_replace: substituir old_str por new_str
- insert: inserir new_str na insert_line
- undo_edit: desfazer última edição`,

  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', enum: ['view', 'create', 'str_replace', 'insert', 'undo_edit'] },
      path: { type: 'string' },
      file_text: { type: 'string' },
      old_str: { type: 'string' },
      new_str: { type: 'string' },
      insert_line: { type: 'integer' },
      view_range: { type: 'array', items: { type: 'integer' } }
    },
    required: ['command', 'path']
  },

  handler: editorHandler
};

module.exports = { editorTool, readFile, writeFile, insertText, replaceText };
