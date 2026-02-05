#!/usr/bin/env node

/**
 * ============================================
 * 🤖 OrangePi 6 Plus - CONTROLE TOTAL
 * ============================================
 * Bot avançado com controle completo:
 * - IA Local (Ollama)
 * - GPIO Control
 * - Rede e Firewall
 * - Serviços Systemd
 * - Docker
 * - Automação
 * - Monitoramento com Alertas
 * - Backup/Restore
 * ============================================
 */

const TelegramBot = require('node-telegram-bot-api');
const { exec, spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const util = require('util');

const execAsync = util.promisify(exec);

// ============================================
// CONFIGURAÇÃO
// ============================================

const CONFIG = {
  // Telegram
  telegramToken: process.env.TELEGRAM_TOKEN || '',
  allowedUsers: (process.env.ALLOWED_USERS || '').split(',').filter(Boolean),
  
  // Ollama
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.1:8b',
  
  // Alertas
  alertsEnabled: true,
  tempThreshold: 70, // Celsius
  cpuThreshold: 90,  // Porcentagem
  ramThreshold: 90,  // Porcentagem
  diskThreshold: 90, // Porcentagem
  
  // Comandos perigosos bloqueados
  blockedCommands: [
    'rm -rf /',
    'rm -rf /*',
    'mkfs',
    'dd if=/dev/zero of=/dev',
    'chmod -R 777 /',
    ':(){:|:&};:',
    '> /dev/sda',
    'mv /* /dev/null'
  ],
  
  // Comandos que precisam de confirmação
  confirmCommands: ['shutdown', 'reboot', 'halt', 'poweroff', 'rm -rf'],
  
  // GPIO
  gpioBasePath: '/sys/class/gpio',
  
  // Paths
  backupPath: '/home/backup',
  scriptsPath: '/home/scripts',
  logsPath: '/var/log'
};

// Estado global
const STATE = {
  pendingConfirmation: new Map(),
  alerts: [],
  gpioExported: new Set(),
  browser: null,
  page: null,
  monitoringInterval: null,
  conversationHistory: new Map()
};

// ============================================
// INICIALIZAR BOT
// ============================================

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  🤖 OrangePi 6 Plus - CONTROLE TOTAL                       ║');
console.log('║     Telegram + Ollama + GPIO + Docker + Automação          ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`📱 Usuários permitidos: ${CONFIG.allowedUsers.join(', ') || 'NENHUM (configure ALLOWED_USERS)'}`);
console.log(`🧠 Modelo IA: ${CONFIG.ollamaModel}`);
console.log(`🌐 Ollama: ${CONFIG.ollamaUrl}`);
console.log('');

const bot = new TelegramBot(CONFIG.telegramToken, { polling: true });

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function isAllowed(userId) {
  if (CONFIG.allowedUsers.includes('*')) return true;
  return CONFIG.allowedUsers.includes(userId.toString());
}

function isCommandSafe(cmd) {
  const lowerCmd = cmd.toLowerCase();
  for (const blocked of CONFIG.blockedCommands) {
    if (lowerCmd.includes(blocked.toLowerCase())) {
      return false;
    }
  }
  return true;
}

function needsConfirmation(cmd) {
  const lowerCmd = cmd.toLowerCase();
  return CONFIG.confirmCommands.some(c => lowerCmd.includes(c));
}

async function sendTyping(chatId) {
  try {
    await bot.sendChatAction(chatId, 'typing');
  } catch (e) {}
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeMarkdown(text) {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

// ============================================
// OLLAMA - IA LOCAL AVANÇADA
// ============================================

async function askOllama(prompt, chatId, systemPrompt = '') {
  return new Promise((resolve, reject) => {
    // Contexto de conversa
    let history = STATE.conversationHistory.get(chatId) || [];
    
    const fullPrompt = systemPrompt 
      ? `${systemPrompt}\n\nHistórico recente:\n${history.slice(-5).join('\n')}\n\nUsuário: ${prompt}\nAssistente:`
      : prompt;

    const data = JSON.stringify({
      model: CONFIG.ollamaModel,
      prompt: fullPrompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 4096,
        top_p: 0.9
      }
    });

    const url = new URL(CONFIG.ollamaUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 11434,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const response = json.response || 'Sem resposta do modelo';
          
          // Salvar no histórico
          history.push(`Usuário: ${prompt.slice(0, 100)}`);
          history.push(`IA: ${response.slice(0, 100)}`);
          if (history.length > 20) history = history.slice(-20);
          STATE.conversationHistory.set(chatId, history);
          
          resolve(response);
        } catch (e) {
          reject(new Error('Erro ao processar resposta do Ollama'));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`Ollama offline: ${e.message}`)));
    req.setTimeout(180000, () => reject(new Error('Timeout - resposta demorou muito')));
    req.write(data);
    req.end();
  });
}

// ============================================
// SISTEMA - MONITORAMENTO AVANÇADO
// ============================================

async function getFullSystemStatus() {
  const [cpu, mem, disk, temp, uptime, ip, load, processes] = await Promise.all([
    getCpuUsage(),
    getMemoryInfo(),
    getDiskInfo(),
    getTemperature(),
    getUptime(),
    getLocalIP(),
    getLoadAverage(),
    getTopProcesses(5)
  ]);

  return `📊 *STATUS COMPLETO - Orange Pi 6 Plus*

🖥️ *CPU*
├ Uso: ${cpu}%
├ Núcleos: ${os.cpus().length}
├ Modelo: ${os.cpus()[0]?.model || 'N/A'}
└ Load: ${load}

💾 *MEMÓRIA*
├ Usado: ${mem.used}MB / ${mem.total}MB
├ Livre: ${mem.free}MB
└ Uso: ${mem.percent}%

💿 *DISCO*
├ Usado: ${disk.used} / ${disk.total}
├ Livre: ${disk.available}
└ Uso: ${disk.percent}

🌡️ *TEMPERATURA*
└ CPU: ${temp}°C

⏱️ *SISTEMA*
├ Uptime: ${uptime}
├ Hostname: ${os.hostname()}
├ Kernel: ${os.release()}
└ Plataforma: ${os.platform()} ${os.arch()}

🌐 *REDE*
└ IP Local: ${ip}

🧠 *IA*
└ Modelo: ${CONFIG.ollamaModel}

📋 *TOP PROCESSOS (RAM)*
${processes}`;
}

async function getCpuUsage() {
  try {
    const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print int($2+$4)}'");
    return stdout.trim() || '0';
  } catch {
    return 'N/A';
  }
}

function getMemoryInfo() {
  const total = Math.round(os.totalmem() / 1024 / 1024);
  const free = Math.round(os.freemem() / 1024 / 1024);
  const used = total - free;
  const percent = Math.round((used / total) * 100);
  return { total, used, free, percent };
}

async function getDiskInfo() {
  try {
    const { stdout } = await execAsync("df -h / | awk 'NR==2{print $3,$2,$4,$5}'");
    const [used, total, available, percent] = stdout.trim().split(' ');
    return { used, total, available, percent };
  } catch {
    return { used: 'N/A', total: 'N/A', available: 'N/A', percent: 'N/A' };
  }
}

async function getTemperature() {
  try {
    // Tentar diferentes caminhos de temperatura
    const paths = [
      '/sys/class/thermal/thermal_zone0/temp',
      '/sys/class/thermal/thermal_zone1/temp',
      '/sys/class/hwmon/hwmon0/temp1_input'
    ];
    
    for (const p of paths) {
      if (fs.existsSync(p)) {
        const temp = fs.readFileSync(p, 'utf8');
        return (parseInt(temp) / 1000).toFixed(1);
      }
    }
  } catch {}
  return 'N/A';
}

function getUptime() {
  const sec = os.uptime();
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return `${addr.address} (${name})`;
      }
    }
  }
  return 'N/A';
}

function getLoadAverage() {
  const load = os.loadavg();
  return `${load[0].toFixed(2)}, ${load[1].toFixed(2)}, ${load[2].toFixed(2)}`;
}

async function getTopProcesses(n = 5) {
  try {
    const { stdout } = await execAsync(`ps aux --sort=-%mem | head -${n + 1} | tail -${n} | awk '{printf "%-10s %5s%% %5s%%\\n", substr($11,1,15), $3, $4}'`);
    return '```\n' + stdout + '```';
  } catch {
    return 'Erro ao listar';
  }
}

// ============================================
// GPIO - CONTROLE DE PINOS
// ============================================

async function exportGpio(pin) {
  try {
    if (!fs.existsSync(`${CONFIG.gpioBasePath}/gpio${pin}`)) {
      fs.writeFileSync(`${CONFIG.gpioBasePath}/export`, pin.toString());
      await new Promise(r => setTimeout(r, 100)); // Aguardar export
    }
    STATE.gpioExported.add(pin);
    return true;
  } catch (error) {
    return false;
  }
}

async function setGpioDirection(pin, direction) {
  try {
    await exportGpio(pin);
    fs.writeFileSync(`${CONFIG.gpioBasePath}/gpio${pin}/direction`, direction);
    return true;
  } catch {
    return false;
  }
}

async function writeGpio(pin, value) {
  try {
    await setGpioDirection(pin, 'out');
    fs.writeFileSync(`${CONFIG.gpioBasePath}/gpio${pin}/value`, value.toString());
    return `✅ GPIO ${pin} = ${value}`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function readGpio(pin) {
  try {
    await setGpioDirection(pin, 'in');
    const value = fs.readFileSync(`${CONFIG.gpioBasePath}/gpio${pin}/value`, 'utf8').trim();
    return `📍 GPIO ${pin} = ${value}`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function listGpioStatus() {
  const exported = Array.from(STATE.gpioExported);
  if (exported.length === 0) {
    return '📍 Nenhum GPIO exportado ainda.\n\nUse:\n/gpio <pin> out <0|1> - Definir saída\n/gpio <pin> in - Ler entrada';
  }
  
  let status = '📍 *Status dos GPIOs:*\n\n';
  for (const pin of exported) {
    try {
      const dir = fs.readFileSync(`${CONFIG.gpioBasePath}/gpio${pin}/direction`, 'utf8').trim();
      const val = fs.readFileSync(`${CONFIG.gpioBasePath}/gpio${pin}/value`, 'utf8').trim();
      status += `GPIO ${pin}: ${dir.toUpperCase()} = ${val}\n`;
    } catch {
      status += `GPIO ${pin}: erro\n`;
    }
  }
  return status;
}

// ============================================
// REDE - CONTROLE COMPLETO
// ============================================

async function getNetworkInfo() {
  try {
    const [interfaces, wifi, connections, dns] = await Promise.all([
      execAsync("ip -br addr"),
      execAsync("iwconfig 2>/dev/null | head -10").catch(() => ({ stdout: 'WiFi não disponível' })),
      execAsync("ss -tuln | head -20"),
      execAsync("cat /etc/resolv.conf | grep nameserver")
    ]);

    return `🌐 *REDE - Orange Pi 6 Plus*

📡 *Interfaces:*
\`\`\`
${interfaces.stdout.trim()}
\`\`\`

📶 *WiFi:*
\`\`\`
${wifi.stdout.trim().slice(0, 500)}
\`\`\`

🔌 *Conexões Ativas:*
\`\`\`
${connections.stdout.trim().slice(0, 800)}
\`\`\`

🌍 *DNS:*
\`\`\`
${dns.stdout.trim()}
\`\`\``;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function setWifi(ssid, password) {
  try {
    const cmd = `nmcli device wifi connect "${ssid}" password "${password}"`;
    const { stdout } = await execAsync(cmd);
    return `✅ Conectado ao WiFi: ${ssid}\n${stdout}`;
  } catch (error) {
    return `❌ Erro ao conectar: ${error.message}`;
  }
}

async function scanWifi() {
  try {
    const { stdout } = await execAsync("nmcli device wifi list");
    return `📶 *Redes WiFi Disponíveis:*\n\`\`\`\n${stdout.slice(0, 3000)}\`\`\``;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function getPublicIP() {
  try {
    const { stdout } = await execAsync("curl -s ifconfig.me");
    return `🌍 IP Público: ${stdout.trim()}`;
  } catch {
    return '❌ Não foi possível obter IP público';
  }
}

// ============================================
// SERVIÇOS SYSTEMD
// ============================================

async function listServices(filter = '') {
  try {
    const cmd = filter 
      ? `systemctl list-units --type=service --state=running | grep -i "${filter}"`
      : "systemctl list-units --type=service --state=running | head -30";
    const { stdout } = await execAsync(cmd);
    return `⚙️ *Serviços Ativos:*\n\`\`\`\n${stdout.slice(0, 3500)}\`\`\``;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function serviceAction(service, action) {
  const validActions = ['start', 'stop', 'restart', 'status', 'enable', 'disable'];
  if (!validActions.includes(action)) {
    return `❌ Ação inválida. Use: ${validActions.join(', ')}`;
  }
  
  try {
    const { stdout, stderr } = await execAsync(`sudo systemctl ${action} ${service}`);
    if (action === 'status') {
      return `⚙️ *${service}:*\n\`\`\`\n${stdout.slice(0, 3000)}\`\`\``;
    }
    return `✅ ${service}: ${action} executado`;
  } catch (error) {
    if (action === 'status') {
      return `⚙️ *${service}:*\n\`\`\`\n${error.stdout || error.message}\`\`\``;
    }
    return `❌ Erro: ${error.message}`;
  }
}

// ============================================
// DOCKER
// ============================================

async function dockerPs() {
  try {
    const { stdout } = await execAsync("docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'");
    return `🐳 *Containers Docker:*\n\`\`\`\n${stdout.slice(0, 3500)}\`\`\``;
  } catch (error) {
    if (error.message.includes('not found')) {
      return '🐳 Docker não instalado.\n\nInstalar: `curl -fsSL https://get.docker.com | sh`';
    }
    return `❌ Erro: ${error.message}`;
  }
}

async function dockerImages() {
  try {
    const { stdout } = await execAsync("docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}'");
    return `🐳 *Imagens Docker:*\n\`\`\`\n${stdout.slice(0, 3500)}\`\`\``;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function dockerAction(container, action) {
  const validActions = ['start', 'stop', 'restart', 'logs', 'rm'];
  if (!validActions.includes(action)) {
    return `❌ Ação inválida. Use: ${validActions.join(', ')}`;
  }
  
  try {
    if (action === 'logs') {
      const { stdout } = await execAsync(`docker logs --tail 50 ${container}`);
      return `🐳 *Logs ${container}:*\n\`\`\`\n${stdout.slice(0, 3500)}\`\`\``;
    }
    await execAsync(`docker ${action} ${container}`);
    return `✅ Container ${container}: ${action}`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function dockerRun(image, name = '', ports = '') {
  try {
    let cmd = 'docker run -d';
    if (name) cmd += ` --name ${name}`;
    if (ports) cmd += ` -p ${ports}`;
    cmd += ` ${image}`;
    
    const { stdout } = await execAsync(cmd);
    return `✅ Container criado: ${stdout.slice(0, 12)}`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

// ============================================
// AUTOMAÇÃO - CRON
// ============================================

async function listCronJobs() {
  try {
    const { stdout } = await execAsync("crontab -l 2>/dev/null || echo 'Nenhum cron configurado'");
    return `⏰ *Cron Jobs:*\n\`\`\`\n${stdout}\`\`\``;
  } catch {
    return '⏰ Nenhum cron configurado';
  }
}

async function addCronJob(schedule, command) {
  try {
    const current = await execAsync("crontab -l 2>/dev/null || echo ''");
    const newCron = current.stdout.trim() + `\n${schedule} ${command}`;
    await execAsync(`echo "${newCron}" | crontab -`);
    return `✅ Cron adicionado: ${schedule} ${command}`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

// ============================================
// CONTROLE DE ENERGIA
// ============================================

async function powerAction(action, chatId) {
  const key = `power_${chatId}`;
  
  if (!STATE.pendingConfirmation.has(key)) {
    STATE.pendingConfirmation.set(key, { action, expires: Date.now() + 30000 });
    return `⚠️ *CONFIRMAÇÃO NECESSÁRIA*\n\nVocê quer ${action} a Orange Pi?\n\nEnvie /confirmar para confirmar ou /cancelar`;
  }
  
  return null;
}

async function executeConfirmedPower(action) {
  switch (action) {
    case 'shutdown':
      await execAsync('sudo shutdown -h now');
      return '🔌 Desligando...';
    case 'reboot':
      await execAsync('sudo reboot');
      return '🔄 Reiniciando...';
    case 'suspend':
      await execAsync('sudo systemctl suspend');
      return '💤 Suspendendo...';
    default:
      return '❌ Ação desconhecida';
  }
}

// ============================================
// BACKUP E RESTORE
// ============================================

async function createBackup(directory) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}.tar.gz`;
    const backupPath = path.join(CONFIG.backupPath, backupName);
    
    // Criar diretório de backup se não existir
    await execAsync(`mkdir -p ${CONFIG.backupPath}`);
    
    await execAsync(`tar -czf ${backupPath} -C ${path.dirname(directory)} ${path.basename(directory)}`);
    
    const { stdout } = await execAsync(`ls -lh ${backupPath}`);
    return `✅ *Backup criado:*\n📁 ${backupPath}\n📊 ${stdout.split(/\s+/)[4]}`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function listBackups() {
  try {
    await execAsync(`mkdir -p ${CONFIG.backupPath}`);
    const { stdout } = await execAsync(`ls -lht ${CONFIG.backupPath} | head -20`);
    return `📦 *Backups Disponíveis:*\n\`\`\`\n${stdout || 'Nenhum backup encontrado'}\`\`\``;
  } catch {
    return '📦 Nenhum backup encontrado';
  }
}

// ============================================
// TERMINAL AVANÇADO
// ============================================

async function executeCommand(cmd, timeout = 60000) {
  if (!isCommandSafe(cmd)) {
    return '❌ Comando bloqueado por segurança!';
  }

  try {
    const { stdout, stderr } = await execAsync(cmd, { 
      timeout,
      maxBuffer: 5 * 1024 * 1024 // 5MB
    });
    const output = stdout || stderr || '✅ Executado (sem saída)';
    return output.slice(0, 4000);
  } catch (error) {
    if (error.killed) {
      return '⏱️ Timeout - comando demorou muito';
    }
    return `❌ Erro: ${error.message}`;
  }
}

// ============================================
// ARQUIVOS
// ============================================

async function listDirectory(dirPath) {
  try {
    const absolutePath = path.resolve(dirPath);
    const { stdout } = await execAsync(`ls -lahF "${absolutePath}" | head -50`);
    return `📁 *${absolutePath}*\n\`\`\`\n${stdout}\`\`\``;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function readFile(filePath, lines = 100) {
  try {
    const absolutePath = path.resolve(filePath);
    const stats = fs.statSync(absolutePath);
    
    if (stats.size > 100000) {
      const { stdout } = await execAsync(`head -${lines} "${absolutePath}"`);
      return `📄 *${path.basename(filePath)}* (primeiras ${lines} linhas)\n\`\`\`\n${stdout.slice(0, 3500)}\`\`\``;
    }
    
    const content = fs.readFileSync(absolutePath, 'utf8');
    return `📄 *${path.basename(filePath)}*\n\`\`\`\n${content.slice(0, 3500)}\`\`\``;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function tailFile(filePath, lines = 50) {
  try {
    const { stdout } = await execAsync(`tail -${lines} "${filePath}"`);
    return `📄 *${path.basename(filePath)}* (últimas ${lines} linhas)\n\`\`\`\n${stdout.slice(0, 3500)}\`\`\``;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function findFiles(pattern, directory = '/home') {
  try {
    const { stdout } = await execAsync(`find "${directory}" -name "${pattern}" -type f 2>/dev/null | head -30`);
    return `🔍 *Arquivos encontrados:*\n\`\`\`\n${stdout || 'Nenhum arquivo encontrado'}\`\`\``;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

// ============================================
// NAVEGADOR - PUPPETEER
// ============================================

async function openBrowser(url) {
  try {
    const puppeteer = require('puppeteer');
    
    if (!STATE.browser) {
      STATE.browser = await puppeteer.launch({
        headless: false,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
    }
    
    STATE.page = await STATE.browser.newPage();
    await STATE.page.setViewport({ width: 1280, height: 720 });
    await STATE.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    const title = await STATE.page.title();
    return `🌐 *Navegador aberto*\n📄 Título: ${title}\n🔗 URL: ${url}`;
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function screenshotPage() {
  try {
    if (!STATE.page) {
      return '❌ Nenhuma página aberta. Use /abrir <url>';
    }
    
    const screenshotPath = `/tmp/screenshot-${Date.now()}.png`;
    await STATE.page.screenshot({ path: screenshotPath, fullPage: false });
    
    return { type: 'photo', path: screenshotPath };
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

async function closeBrowser() {
  try {
    if (STATE.browser) {
      await STATE.browser.close();
      STATE.browser = null;
      STATE.page = null;
      return '✅ Navegador fechado';
    }
    return 'ℹ️ Navegador não estava aberto';
  } catch (error) {
    return `❌ Erro: ${error.message}`;
  }
}

// ============================================
// SISTEMA DE ALERTAS
// ============================================

async function checkAlerts() {
  if (!CONFIG.alertsEnabled) return;
  
  const alerts = [];
  
  // Temperatura
  const temp = parseFloat(await getTemperature());
  if (!isNaN(temp) && temp > CONFIG.tempThreshold) {
    alerts.push(`🌡️ Temperatura alta: ${temp}°C (limite: ${CONFIG.tempThreshold}°C)`);
  }
  
  // CPU
  const cpu = parseInt(await getCpuUsage());
  if (!isNaN(cpu) && cpu > CONFIG.cpuThreshold) {
    alerts.push(`🖥️ CPU alta: ${cpu}% (limite: ${CONFIG.cpuThreshold}%)`);
  }
  
  // RAM
  const mem = getMemoryInfo();
  if (mem.percent > CONFIG.ramThreshold) {
    alerts.push(`💾 RAM alta: ${mem.percent}% (limite: ${CONFIG.ramThreshold}%)`);
  }
  
  // Disco
  const disk = await getDiskInfo();
  const diskPercent = parseInt(disk.percent);
  if (!isNaN(diskPercent) && diskPercent > CONFIG.diskThreshold) {
    alerts.push(`💿 Disco cheio: ${disk.percent} (limite: ${CONFIG.diskThreshold}%)`);
  }
  
  if (alerts.length > 0) {
    const alertMsg = `⚠️ *ALERTAS DO SISTEMA*\n\n${alerts.join('\n')}`;
    
    // Enviar para todos os usuários permitidos
    for (const userId of CONFIG.allowedUsers) {
      if (userId !== '*') {
        try {
          await bot.sendMessage(userId, alertMsg, { parse_mode: 'Markdown' });
        } catch (e) {}
      }
    }
  }
}

// Verificar alertas a cada 5 minutos
setInterval(checkAlerts, 5 * 60 * 1000);

// ============================================
// PROMPT DO SISTEMA AVANÇADO
// ============================================

const SYSTEM_PROMPT = `Você é o assistente de IA da Orange Pi 6 Plus com 32GB de RAM, rodando localmente via Ollama.

Você tem CONTROLE TOTAL do sistema e pode:
- Executar comandos no terminal
- Controlar pinos GPIO
- Gerenciar rede e WiFi
- Controlar serviços systemd
- Gerenciar containers Docker
- Fazer backup de arquivos
- Monitorar temperatura, CPU, RAM, disco
- Abrir navegador e capturar telas
- Agendar tarefas com cron

Quando o usuário pedir para fazer algo no sistema, sugira o comando apropriado.
Por exemplo:
- "instale o docker" → Sugira: /exec curl -fsSL https://get.docker.com | sh
- "veja os processos" → Sugira: /processos ou /exec htop
- "ligue o pino 17" → Sugira: /gpio 17 out 1

Responda sempre em português brasileiro, de forma clara e técnica.
Seja proativo em sugerir comandos e soluções.`;

// ============================================
// HANDLERS DE COMANDOS
// ============================================

// /start e /help
bot.onText(/\/(start|help|ajuda)/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) {
    return bot.sendMessage(chatId, '❌ Acesso negado. Seu ID: ' + msg.from.id);
  }
  
  const help = `🤖 *OrangePi 6 Plus - CONTROLE TOTAL*

━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *SISTEMA*
/status - Status completo
/cpu, /ram, /temp, /disco
/processos - Top processos
/uptime - Tempo ligado

💻 *TERMINAL*
/exec <cmd> - Executar comando
/ping <host> - Testar rede

📁 *ARQUIVOS*
/ls <pasta> - Listar
/cat <arquivo> - Ver conteúdo
/tail <arquivo> - Últimas linhas
/find <padrão> - Buscar arquivos

📍 *GPIO*
/gpio - Status dos pinos
/gpio <pin> out <0|1> - Saída
/gpio <pin> in - Ler entrada

🌐 *REDE*
/rede - Info completa
/wifi - Redes disponíveis
/wificonnect <ssid> <senha>
/ip - IP público

⚙️ *SERVIÇOS*
/servicos - Listar ativos
/servico <nome> <ação>
  ações: start|stop|restart|status

🐳 *DOCKER*
/docker - Containers
/dockerimg - Imagens
/dockerctl <nome> <ação>
/dockerrun <imagem>

⏰ *AUTOMAÇÃO*
/cron - Listar agendamentos
/addcron "<schedule>" "<cmd>"

📦 *BACKUP*
/backups - Listar
/backup <pasta> - Criar

🔌 *ENERGIA*
/shutdown - Desligar
/reboot - Reiniciar

🌐 *NAVEGADOR*
/abrir <url>
/screenshot
/fechar

💬 *IA*
Envie qualquer mensagem!

━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  await bot.sendMessage(chatId, help, { parse_mode: 'Markdown' });
});

// /status
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  await sendTyping(chatId);
  const status = await getFullSystemStatus();
  await bot.sendMessage(chatId, status, { parse_mode: 'Markdown' });
});

// /cpu, /ram, /temp, /disco, /uptime
bot.onText(/\/cpu/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const cpu = await getCpuUsage();
  const load = getLoadAverage();
  await bot.sendMessage(msg.chat.id, `🖥️ *CPU:* ${cpu}%\n📊 *Load:* ${load}`, { parse_mode: 'Markdown' });
});

bot.onText(/\/ram/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const mem = getMemoryInfo();
  await bot.sendMessage(msg.chat.id, `💾 *RAM:* ${mem.used}MB / ${mem.total}MB (${mem.percent}%)`, { parse_mode: 'Markdown' });
});

bot.onText(/\/temp/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const temp = await getTemperature();
  await bot.sendMessage(msg.chat.id, `🌡️ *Temperatura:* ${temp}°C`, { parse_mode: 'Markdown' });
});

bot.onText(/\/disco/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const disk = await getDiskInfo();
  await bot.sendMessage(msg.chat.id, `💿 *Disco:* ${disk.used} / ${disk.total} (${disk.percent})`, { parse_mode: 'Markdown' });
});

bot.onText(/\/uptime/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await bot.sendMessage(msg.chat.id, `⏱️ *Uptime:* ${getUptime()}`, { parse_mode: 'Markdown' });
});

bot.onText(/\/processos/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const procs = await getTopProcesses(10);
  await bot.sendMessage(msg.chat.id, `📋 *Top Processos:*\n${procs}`, { parse_mode: 'Markdown' });
});

// /exec
bot.onText(/\/exec (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  const cmd = match[1];
  
  if (needsConfirmation(cmd)) {
    STATE.pendingConfirmation.set(`exec_${chatId}`, { cmd, expires: Date.now() + 30000 });
    return bot.sendMessage(chatId, `⚠️ *Comando perigoso:* \`${cmd}\`\n\nEnvie /confirmar para executar ou /cancelar`, { parse_mode: 'Markdown' });
  }
  
  await sendTyping(chatId);
  const result = await executeCommand(cmd);
  await bot.sendMessage(chatId, `⚡ \`${cmd}\`\n\n\`\`\`\n${result}\n\`\`\``, { parse_mode: 'Markdown' });
});

// /confirmar e /cancelar
bot.onText(/\/confirmar/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;
  
  // Verificar pendências
  for (const [key, value] of STATE.pendingConfirmation.entries()) {
    if (key.endsWith(`_${chatId}`) && value.expires > Date.now()) {
      STATE.pendingConfirmation.delete(key);
      
      if (key.startsWith('power_')) {
        const result = await executeConfirmedPower(value.action);
        return bot.sendMessage(chatId, result);
      }
      
      if (key.startsWith('exec_')) {
        await sendTyping(chatId);
        const result = await executeCommand(value.cmd, 120000);
        return bot.sendMessage(chatId, `⚡ Executado:\n\`\`\`\n${result}\n\`\`\``, { parse_mode: 'Markdown' });
      }
    }
  }
  
  await bot.sendMessage(chatId, 'ℹ️ Nenhuma ação pendente');
});

bot.onText(/\/cancelar/, async (msg) => {
  const chatId = msg.chat.id;
  for (const key of STATE.pendingConfirmation.keys()) {
    if (key.endsWith(`_${chatId}`)) {
      STATE.pendingConfirmation.delete(key);
    }
  }
  await bot.sendMessage(chatId, '❌ Ação cancelada');
});

// /ping
bot.onText(/\/ping (.+)/, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const result = await executeCommand(`ping -c 4 ${match[1]}`);
  await bot.sendMessage(msg.chat.id, `🏓 *Ping ${match[1]}:*\n\`\`\`\n${result}\n\`\`\``, { parse_mode: 'Markdown' });
});

// ARQUIVOS
bot.onText(/\/ls(.*)/, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const result = await listDirectory(match[1]?.trim() || '.');
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

bot.onText(/\/cat (.+)/, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const result = await readFile(match[1]);
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

bot.onText(/\/tail (.+)/, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const result = await tailFile(match[1]);
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

bot.onText(/\/find (.+)/, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const result = await findFiles(match[1]);
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

bot.onText(/\/pwd/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await bot.sendMessage(msg.chat.id, `📍 *Diretório:* \`${process.cwd()}\``, { parse_mode: 'Markdown' });
});

// GPIO
bot.onText(/\/gpio$/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const status = await listGpioStatus();
  await bot.sendMessage(msg.chat.id, status, { parse_mode: 'Markdown' });
});

bot.onText(/\/gpio (\d+) out ([01])/, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await writeGpio(parseInt(match[1]), parseInt(match[2]));
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/\/gpio (\d+) in/, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await readGpio(parseInt(match[1]));
  await bot.sendMessage(msg.chat.id, result);
});

// REDE
bot.onText(/\/rede/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const result = await getNetworkInfo();
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

bot.onText(/\/wifi$/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const result = await scanWifi();
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

bot.onText(/\/wificonnect (.+) (.+)/, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const result = await setWifi(match[1], match[2]);
  await bot.sendMessage(msg.chat.id, result);
});

bot.onText(/\/ip$/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await getPublicIP();
  await bot.sendMessage(msg.chat.id, result);
});

// SERVIÇOS
bot.onText(/\/servicos(.*)/, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const result = await listServices(match[1]?.trim());
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

bot.onText(/\/servico (\S+) (\S+)/, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const result = await serviceAction(match[1], match[2]);
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

// DOCKER
bot.onText(/\/docker$/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const result = await dockerPs();
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

bot.onText(/\/dockerimg/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const result = await dockerImages();
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

bot.onText(/\/dockerctl (\S+) (\S+)/, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const result = await dockerAction(match[1], match[2]);
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

bot.onText(/\/dockerrun (\S+)(.*)/, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const result = await dockerRun(match[1], match[2]?.trim());
  await bot.sendMessage(msg.chat.id, result);
});

// CRON
bot.onText(/\/cron$/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await listCronJobs();
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

bot.onText(/\/addcron "(.+)" "(.+)"/, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await addCronJob(match[1], match[2]);
  await bot.sendMessage(msg.chat.id, result);
});

// BACKUP
bot.onText(/\/backups/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await listBackups();
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

bot.onText(/\/backup (.+)/, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const result = await createBackup(match[1]);
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

// ENERGIA
bot.onText(/\/shutdown/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await powerAction('shutdown', msg.chat.id);
  if (result) await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

bot.onText(/\/reboot/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await powerAction('reboot', msg.chat.id);
  if (result) await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

// NAVEGADOR
bot.onText(/\/abrir (.+)/, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  let url = match[1];
  if (!url.startsWith('http')) url = 'https://' + url;
  
  await sendTyping(msg.chat.id);
  const result = await openBrowser(url);
  await bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
});

bot.onText(/\/screenshot/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await sendTyping(msg.chat.id);
  const result = await screenshotPage();
  
  if (typeof result === 'object' && result.type === 'photo') {
    await bot.sendPhoto(msg.chat.id, result.path);
    fs.unlinkSync(result.path);
  } else {
    await bot.sendMessage(msg.chat.id, result);
  }
});

bot.onText(/\/fechar/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const result = await closeBrowser();
  await bot.sendMessage(msg.chat.id, result);
});

// /modelo
bot.onText(/\/modelo/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  await bot.sendMessage(msg.chat.id, `🧠 *Modelo:* ${CONFIG.ollamaModel}\n🌐 *URL:* ${CONFIG.ollamaUrl}`, { parse_mode: 'Markdown' });
});

// /limpar - Limpar histórico de conversa
bot.onText(/\/limpar/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  STATE.conversationHistory.delete(msg.chat.id);
  await bot.sendMessage(msg.chat.id, '🗑️ Histórico de conversa limpo');
});

// MENSAGENS GERAIS - IA
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  
  if (text.startsWith('/')) return;
  if (!isAllowed(msg.from.id)) return;
  if (!text.trim()) return;
  
  console.log(`📩 [${msg.from.id}] ${text.slice(0, 50)}...`);
  
  await sendTyping(chatId);
  
  try {
    const response = await askOllama(text, chatId, SYSTEM_PROMPT);
    
    // Dividir resposta se for muito longa
    if (response.length > 4000) {
      const parts = response.match(/.{1,4000}/gs) || [];
      for (const part of parts) {
        await bot.sendMessage(chatId, part);
      }
    } else {
      await bot.sendMessage(chatId, response);
    }
    
    console.log('📤 Resposta enviada');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await bot.sendMessage(chatId, `❌ ${error.message}\n\nVerifique se o Ollama está rodando: \`systemctl status ollama\``, { parse_mode: 'Markdown' });
  }
});

// ============================================
// INICIALIZAÇÃO
// ============================================

console.log('✅ Bot iniciado! Aguardando mensagens...');
console.log(`📱 Fale com o bot no Telegram`);
console.log('');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Encerrando...');
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 Encerrando...');
  await closeBrowser();
  process.exit(0);
});

// Limpeza de confirmações expiradas
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of STATE.pendingConfirmation.entries()) {
    if (value.expires < now) {
      STATE.pendingConfirmation.delete(key);
    }
  }
}, 60000);
