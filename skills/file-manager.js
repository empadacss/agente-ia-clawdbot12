/**
 * ============================================
 * Skill: File Manager
 * Gerenciamento seguro de arquivos e diretórios
 * ============================================
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class FileManager {
  constructor(config = {}) {
    this.config = {
      allowedPaths: config.allowedPaths || ['/home', '/tmp', '/var/log'],
      blockedPaths: config.blockedPaths || [
        '/etc/shadow',
        '/etc/passwd',
        '/etc/sudoers',
        '/root/.ssh',
        '/boot',
        '/sys',
        '/proc'
      ],
      blockedExtensions: config.blockedExtensions || ['.key', '.pem', '.p12'],
      maxFileSize: config.maxFileSize || 50 * 1024 * 1024, // 50MB
      maxFilesToList: config.maxFilesToList || 100
    };
  }

  /**
   * Verifica se o caminho é permitido
   */
  isPathAllowed(targetPath) {
    const absolutePath = path.resolve(targetPath);

    // Verificar paths bloqueados
    for (const blocked of this.config.blockedPaths) {
      if (absolutePath.startsWith(blocked) || absolutePath === blocked) {
        return { allowed: false, reason: `Caminho bloqueado: ${blocked}` };
      }
    }

    // Verificar extensões bloqueadas
    const ext = path.extname(absolutePath).toLowerCase();
    if (this.config.blockedExtensions.includes(ext)) {
      return { allowed: false, reason: `Extensão bloqueada: ${ext}` };
    }

    // Verificar se está em um caminho permitido
    const isInAllowed = this.config.allowedPaths.some(allowed =>
      absolutePath.startsWith(allowed)
    );

    if (!isInAllowed) {
      return { 
        allowed: false, 
        reason: `Caminho fora das áreas permitidas. Use: ${this.config.allowedPaths.join(', ')}` 
      };
    }

    return { allowed: true };
  }

  /**
   * Lista arquivos em um diretório
   */
  async listDirectory(dirPath, options = {}) {
    const check = this.isPathAllowed(dirPath);
    if (!check.allowed) {
      return { error: check.reason };
    }

    try {
      const absolutePath = path.resolve(dirPath);
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });

      const files = [];
      const directories = [];

      for (const entry of entries.slice(0, this.config.maxFilesToList)) {
        const entryPath = path.join(absolutePath, entry.name);
        
        try {
          const stats = await fs.stat(entryPath);
          const info = {
            name: entry.name,
            path: entryPath,
            size: this.formatBytes(stats.size),
            sizeBytes: stats.size,
            modified: stats.mtime.toISOString(),
            permissions: this.formatPermissions(stats.mode)
          };

          if (entry.isDirectory()) {
            directories.push({ ...info, type: 'directory' });
          } else {
            files.push({ ...info, type: 'file' });
          }
        } catch (err) {
          // Ignorar arquivos inacessíveis
        }
      }

      // Ordenar: diretórios primeiro, depois arquivos
      directories.sort((a, b) => a.name.localeCompare(b.name));
      files.sort((a, b) => a.name.localeCompare(b.name));

      return {
        path: absolutePath,
        totalDirectories: directories.length,
        totalFiles: files.length,
        directories,
        files
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Lê conteúdo de um arquivo
   */
  async readFile(filePath, options = {}) {
    const check = this.isPathAllowed(filePath);
    if (!check.allowed) {
      return { error: check.reason };
    }

    try {
      const absolutePath = path.resolve(filePath);
      const stats = await fs.stat(absolutePath);

      if (stats.size > this.config.maxFileSize) {
        return { 
          error: `Arquivo muito grande: ${this.formatBytes(stats.size)}. Máximo: ${this.formatBytes(this.config.maxFileSize)}` 
        };
      }

      const content = await fs.readFile(absolutePath, 'utf8');
      
      return {
        path: absolutePath,
        size: this.formatBytes(stats.size),
        lines: content.split('\n').length,
        content: options.preview ? content.slice(0, 1000) : content,
        truncated: options.preview && content.length > 1000
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Escreve conteúdo em um arquivo
   */
  async writeFile(filePath, content, options = {}) {
    const check = this.isPathAllowed(filePath);
    if (!check.allowed) {
      return { error: check.reason };
    }

    try {
      const absolutePath = path.resolve(filePath);
      const dir = path.dirname(absolutePath);

      // Criar diretório se não existir
      if (!fsSync.existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }

      // Backup se arquivo existir e opção ativada
      if (options.backup && fsSync.existsSync(absolutePath)) {
        const backupPath = `${absolutePath}.backup.${Date.now()}`;
        await fs.copyFile(absolutePath, backupPath);
      }

      await fs.writeFile(absolutePath, content, 'utf8');

      const stats = await fs.stat(absolutePath);

      return {
        success: true,
        path: absolutePath,
        size: this.formatBytes(stats.size),
        created: !fsSync.existsSync(absolutePath)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Cria um diretório
   */
  async createDirectory(dirPath) {
    const check = this.isPathAllowed(dirPath);
    if (!check.allowed) {
      return { error: check.reason };
    }

    try {
      const absolutePath = path.resolve(dirPath);
      await fs.mkdir(absolutePath, { recursive: true });

      return {
        success: true,
        path: absolutePath,
        created: true
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Remove arquivo ou diretório
   */
  async remove(targetPath, options = {}) {
    const check = this.isPathAllowed(targetPath);
    if (!check.allowed) {
      return { error: check.reason };
    }

    try {
      const absolutePath = path.resolve(targetPath);
      const stats = await fs.stat(absolutePath);

      if (stats.isDirectory()) {
        if (!options.recursive) {
          return { error: 'Use recursive: true para remover diretórios' };
        }
        await fs.rm(absolutePath, { recursive: true, force: true });
      } else {
        await fs.unlink(absolutePath);
      }

      return {
        success: true,
        path: absolutePath,
        type: stats.isDirectory() ? 'directory' : 'file',
        removed: true
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Copia arquivo ou diretório
   */
  async copy(sourcePath, destPath, options = {}) {
    const sourceCheck = this.isPathAllowed(sourcePath);
    const destCheck = this.isPathAllowed(destPath);

    if (!sourceCheck.allowed) {
      return { error: `Origem: ${sourceCheck.reason}` };
    }
    if (!destCheck.allowed) {
      return { error: `Destino: ${destCheck.reason}` };
    }

    try {
      const absoluteSource = path.resolve(sourcePath);
      const absoluteDest = path.resolve(destPath);
      const stats = await fs.stat(absoluteSource);

      if (stats.isDirectory()) {
        await execAsync(`cp -r "${absoluteSource}" "${absoluteDest}"`);
      } else {
        await fs.copyFile(absoluteSource, absoluteDest);
      }

      return {
        success: true,
        source: absoluteSource,
        destination: absoluteDest,
        type: stats.isDirectory() ? 'directory' : 'file'
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Move/renomeia arquivo ou diretório
   */
  async move(sourcePath, destPath) {
    const sourceCheck = this.isPathAllowed(sourcePath);
    const destCheck = this.isPathAllowed(destPath);

    if (!sourceCheck.allowed) {
      return { error: `Origem: ${sourceCheck.reason}` };
    }
    if (!destCheck.allowed) {
      return { error: `Destino: ${destCheck.reason}` };
    }

    try {
      const absoluteSource = path.resolve(sourcePath);
      const absoluteDest = path.resolve(destPath);

      await fs.rename(absoluteSource, absoluteDest);

      return {
        success: true,
        source: absoluteSource,
        destination: absoluteDest
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Busca arquivos por nome ou conteúdo
   */
  async search(searchPath, pattern, options = {}) {
    const check = this.isPathAllowed(searchPath);
    if (!check.allowed) {
      return { error: check.reason };
    }

    try {
      const absolutePath = path.resolve(searchPath);
      let command;

      if (options.content) {
        // Buscar por conteúdo
        command = `grep -rl "${pattern}" "${absolutePath}" 2>/dev/null | head -50`;
      } else {
        // Buscar por nome
        command = `find "${absolutePath}" -name "*${pattern}*" 2>/dev/null | head -50`;
      }

      const { stdout } = await execAsync(command);
      const results = stdout.trim().split('\n').filter(Boolean);

      return {
        path: absolutePath,
        pattern,
        searchType: options.content ? 'content' : 'filename',
        count: results.length,
        results
      };
    } catch (error) {
      return { error: error.message, results: [] };
    }
  }

  /**
   * Obtém informações detalhadas de um arquivo
   */
  async getFileInfo(filePath) {
    const check = this.isPathAllowed(filePath);
    if (!check.allowed) {
      return { error: check.reason };
    }

    try {
      const absolutePath = path.resolve(filePath);
      const stats = await fs.stat(absolutePath);

      // Detectar tipo MIME
      let mimeType = 'unknown';
      try {
        const { stdout } = await execAsync(`file --mime-type -b "${absolutePath}"`);
        mimeType = stdout.trim();
      } catch {}

      return {
        path: absolutePath,
        name: path.basename(absolutePath),
        extension: path.extname(absolutePath),
        directory: path.dirname(absolutePath),
        type: stats.isDirectory() ? 'directory' : 'file',
        size: this.formatBytes(stats.size),
        sizeBytes: stats.size,
        mimeType,
        permissions: this.formatPermissions(stats.mode),
        owner: stats.uid,
        group: stats.gid,
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        accessed: stats.atime.toISOString()
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Formata bytes para leitura humana
   */
  formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
      bytes /= 1024;
      i++;
    }
    return `${bytes.toFixed(1)} ${units[i]}`;
  }

  /**
   * Formata permissões Unix
   */
  formatPermissions(mode) {
    const perms = (mode & parseInt('777', 8)).toString(8);
    return perms.padStart(3, '0');
  }
}

// Exportar para uso como módulo
module.exports = FileManager;

// Permitir execução direta para testes
if (require.main === module) {
  const fm = new FileManager();
  
  (async () => {
    console.log('📁 Testando File Manager...\n');
    
    // Listar diretório home
    const listing = await fm.listDirectory('/home');
    console.log('📂 Listagem de /home:');
    console.log(JSON.stringify(listing, null, 2));
  })();
}
