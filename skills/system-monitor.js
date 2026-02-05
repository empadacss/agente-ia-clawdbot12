/**
 * 📊 SYSTEM MONITOR SKILL
 * Monitoramento completo do sistema
 */

const { exec } = require('child_process');
const util = require('util');
const os = require('os');
const fs = require('fs');
const execAsync = util.promisify(exec);

module.exports = {
  name: 'system-monitor',
  description: 'Monitoramento do sistema',
  
  actions: {
    status: {
      description: 'Status completo do sistema',
      async handler() {
        const cpu = await this.getCpuUsage();
        const mem = this.getMemoryInfo();
        const disk = await this.getDiskInfo();
        const temp = await this.getTemperature();
        const uptime = this.getUptime();
        const ip = this.getLocalIP();
        const load = os.loadavg();
        
        return `📊 *STATUS - Orange Pi 6 Plus*

🖥️ *CPU*
├ Uso: ${cpu}%
├ Núcleos: ${os.cpus().length}
├ Load: ${load.map(l => l.toFixed(2)).join(', ')}
└ Modelo: ${os.cpus()[0]?.model || 'N/A'}

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
└ IP: ${ip}`;
      },
      
      async getCpuUsage() {
        try {
          const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print int($2+$4)}'");
          return stdout.trim() || '0';
        } catch { return 'N/A'; }
      },
      
      getMemoryInfo() {
        const total = Math.round(os.totalmem() / 1024 / 1024);
        const free = Math.round(os.freemem() / 1024 / 1024);
        const used = total - free;
        return { total, used, free, percent: Math.round((used / total) * 100) };
      },
      
      async getDiskInfo() {
        try {
          const { stdout } = await execAsync("df -h / | awk 'NR==2{print $3,$2,$4,$5}'");
          const [used, total, available, percent] = stdout.trim().split(' ');
          return { used, total, available, percent };
        } catch {
          return { used: 'N/A', total: 'N/A', available: 'N/A', percent: 'N/A' };
        }
      },
      
      async getTemperature() {
        try {
          const paths = [
            '/sys/class/thermal/thermal_zone0/temp',
            '/sys/class/thermal/thermal_zone1/temp'
          ];
          for (const p of paths) {
            if (fs.existsSync(p)) {
              return (parseInt(fs.readFileSync(p, 'utf8')) / 1000).toFixed(1);
            }
          }
        } catch {}
        return 'N/A';
      },
      
      getUptime() {
        const sec = os.uptime();
        const d = Math.floor(sec / 86400);
        const h = Math.floor((sec % 86400) / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return `${d}d ${h}h ${m}m`;
      },
      
      getLocalIP() {
        for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
          for (const addr of addrs) {
            if (addr.family === 'IPv4' && !addr.internal) return addr.address;
          }
        }
        return 'N/A';
      }
    },
    
    cpu: {
      description: 'Uso da CPU',
      async handler() {
        try {
          const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)'");
          const load = os.loadavg();
          return `🖥️ CPU:\n${stdout}\n📊 Load: ${load.map(l => l.toFixed(2)).join(', ')}`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    memory: {
      description: 'Uso de memória',
      async handler() {
        const total = Math.round(os.totalmem() / 1024 / 1024);
        const free = Math.round(os.freemem() / 1024 / 1024);
        const used = total - free;
        const percent = Math.round((used / total) * 100);
        
        return `💾 Memória:
├ Total: ${total}MB
├ Usado: ${used}MB
├ Livre: ${free}MB
└ Uso: ${percent}%`;
      }
    },
    
    disk: {
      description: 'Uso de disco',
      async handler() {
        try {
          const { stdout } = await execAsync("df -h");
          return `💿 Disco:\n\`\`\`\n${stdout}\`\`\``;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    temperature: {
      description: 'Temperatura do sistema',
      async handler() {
        try {
          const paths = [
            '/sys/class/thermal/thermal_zone0/temp',
            '/sys/class/thermal/thermal_zone1/temp'
          ];
          
          let result = '🌡️ Temperaturas:\n';
          for (let i = 0; i < paths.length; i++) {
            if (fs.existsSync(paths[i])) {
              const temp = (parseInt(fs.readFileSync(paths[i], 'utf8')) / 1000).toFixed(1);
              result += `├ Zone ${i}: ${temp}°C\n`;
            }
          }
          return result || '❌ Sensores não encontrados';
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    processes: {
      description: 'Top processos',
      parameters: {
        count: { type: 'number', default: 10 }
      },
      async handler({ count = 10 }) {
        try {
          const { stdout } = await execAsync(`ps aux --sort=-%mem | head -${count + 1}`);
          return `📋 Top ${count} processos:\n\`\`\`\n${stdout}\`\`\``;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    uptime: {
      description: 'Tempo de atividade',
      async handler() {
        try {
          const { stdout } = await execAsync("uptime -p");
          return `⏱️ ${stdout.trim()}`;
        } catch (error) {
          const sec = os.uptime();
          const d = Math.floor(sec / 86400);
          const h = Math.floor((sec % 86400) / 3600);
          const m = Math.floor((sec % 3600) / 60);
          return `⏱️ Uptime: ${d}d ${h}h ${m}m`;
        }
      }
    },
    
    network: {
      description: 'Informações de rede',
      async handler() {
        try {
          const { stdout: interfaces } = await execAsync("ip -br addr");
          const { stdout: publicIP } = await execAsync("curl -s ifconfig.me").catch(() => ({ stdout: 'N/A' }));
          
          return `🌐 Rede:

📡 Interfaces:
\`\`\`
${interfaces.trim()}
\`\`\`

🌍 IP Público: ${publicIP.trim()}`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    services: {
      description: 'Listar serviços ativos',
      async handler() {
        try {
          const { stdout } = await execAsync("systemctl list-units --type=service --state=running | head -20");
          return `⚙️ Serviços ativos:\n\`\`\`\n${stdout}\`\`\``;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    serviceControl: {
      description: 'Controlar um serviço (start, stop, restart, status)',
      parameters: {
        service: { type: 'string', required: true },
        action: { type: 'string', required: true }
      },
      async handler({ service, action }) {
        const validActions = ['start', 'stop', 'restart', 'status', 'enable', 'disable'];
        if (!validActions.includes(action)) {
          return `❌ Ação inválida. Use: ${validActions.join(', ')}`;
        }
        
        try {
          const { stdout, stderr } = await execAsync(`sudo systemctl ${action} ${service}`);
          if (action === 'status') {
            return `⚙️ ${service}:\n\`\`\`\n${stdout || stderr}\`\`\``;
          }
          return `✅ ${service}: ${action} executado`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    shutdown: {
      description: 'Desligar o sistema (requer confirmação)',
      async handler() {
        return '⚠️ Para desligar, use: sudo shutdown -h now';
      }
    },
    
    reboot: {
      description: 'Reiniciar o sistema (requer confirmação)',
      async handler() {
        return '⚠️ Para reiniciar, use: sudo reboot';
      }
    }
  }
};
