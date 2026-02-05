/**
 * ============================================
 * Skill: System Monitor
 * Monitoramento completo do sistema Orange Pi
 * ============================================
 */

const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const util = require('util');

const execAsync = util.promisify(exec);

class SystemMonitor {
  constructor(config = {}) {
    this.config = {
      refreshInterval: config.refreshInterval || 30,
      alertsEnabled: config.alertsEnabled || true,
      thresholds: {
        cpu: config.cpuThreshold || 80,
        memory: config.memoryThreshold || 85,
        disk: config.diskThreshold || 90,
        temperature: config.temperatureThreshold || 70
      }
    };
  }

  /**
   * Obtém informações completas do sistema
   */
  async getSystemInfo() {
    const [cpu, memory, disk, temperature, uptime, load] = await Promise.all([
      this.getCpuUsage(),
      this.getMemoryUsage(),
      this.getDiskUsage(),
      this.getTemperature(),
      this.getUptime(),
      this.getLoadAverage()
    ]);

    return {
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpu,
      memory,
      disk,
      temperature,
      uptime,
      load
    };
  }

  /**
   * Obtém uso da CPU
   */
  async getCpuUsage() {
    try {
      const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}'");
      const usage = parseFloat(stdout.trim()) || 0;
      
      const cpuInfo = os.cpus();
      
      return {
        usage: usage.toFixed(1),
        usagePercent: usage,
        cores: cpuInfo.length,
        model: cpuInfo[0]?.model || 'Unknown',
        speed: cpuInfo[0]?.speed || 0,
        alert: usage > this.config.thresholds.cpu
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Obtém uso de memória
   */
  async getMemoryUsage() {
    try {
      const total = os.totalmem();
      const free = os.freemem();
      const used = total - free;
      const usagePercent = (used / total) * 100;

      // Obter informações detalhadas via /proc/meminfo
      const { stdout } = await execAsync("free -m | awk 'NR==2{print $2,$3,$4,$6,$7}'");
      const [totalMB, usedMB, freeMB, buffersMB, availableMB] = stdout.trim().split(' ').map(Number);

      return {
        total: this.formatBytes(total),
        totalMB,
        used: this.formatBytes(used),
        usedMB,
        free: this.formatBytes(free),
        freeMB,
        available: `${availableMB}MB`,
        availableMB,
        usagePercent: usagePercent.toFixed(1),
        alert: usagePercent > this.config.thresholds.memory
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Obtém uso do disco
   */
  async getDiskUsage() {
    try {
      const { stdout } = await execAsync("df -h / | awk 'NR==2{print $2,$3,$4,$5}'");
      const [total, used, available, usageStr] = stdout.trim().split(' ');
      const usagePercent = parseInt(usageStr);

      return {
        total,
        used,
        available,
        usagePercent,
        usageStr,
        alert: usagePercent > this.config.thresholds.disk
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Obtém temperatura da CPU (Orange Pi / ARM)
   */
  async getTemperature() {
    try {
      // Tentar ler do sensor térmico do sistema
      const thermalPaths = [
        '/sys/class/thermal/thermal_zone0/temp',
        '/sys/class/hwmon/hwmon0/temp1_input',
        '/sys/devices/virtual/thermal/thermal_zone0/temp'
      ];

      for (const path of thermalPaths) {
        if (fs.existsSync(path)) {
          const temp = parseInt(fs.readFileSync(path, 'utf8').trim());
          const tempCelsius = temp / 1000;
          
          return {
            celsius: tempCelsius.toFixed(1),
            fahrenheit: ((tempCelsius * 9/5) + 32).toFixed(1),
            source: path,
            alert: tempCelsius > this.config.thresholds.temperature
          };
        }
      }

      // Fallback: usar vcgencmd se disponível (Raspberry Pi compatível)
      try {
        const { stdout } = await execAsync("vcgencmd measure_temp 2>/dev/null");
        const match = stdout.match(/temp=([0-9.]+)/);
        if (match) {
          const tempCelsius = parseFloat(match[1]);
          return {
            celsius: tempCelsius.toFixed(1),
            fahrenheit: ((tempCelsius * 9/5) + 32).toFixed(1),
            source: 'vcgencmd',
            alert: tempCelsius > this.config.thresholds.temperature
          };
        }
      } catch {}

      return { celsius: 'N/A', available: false };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Obtém tempo de atividade
   */
  async getUptime() {
    try {
      const uptimeSeconds = os.uptime();
      const days = Math.floor(uptimeSeconds / 86400);
      const hours = Math.floor((uptimeSeconds % 86400) / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);

      return {
        seconds: uptimeSeconds,
        formatted: `${days}d ${hours}h ${minutes}m`,
        days,
        hours,
        minutes
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Obtém média de carga
   */
  async getLoadAverage() {
    try {
      const loadAvg = os.loadavg();
      const cpuCount = os.cpus().length;

      return {
        '1min': loadAvg[0].toFixed(2),
        '5min': loadAvg[1].toFixed(2),
        '15min': loadAvg[2].toFixed(2),
        cpuCount,
        normalized: {
          '1min': (loadAvg[0] / cpuCount * 100).toFixed(1),
          '5min': (loadAvg[1] / cpuCount * 100).toFixed(1),
          '15min': (loadAvg[2] / cpuCount * 100).toFixed(1)
        }
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Obtém lista de processos mais pesados
   */
  async getTopProcesses(limit = 10) {
    try {
      const { stdout } = await execAsync(`ps aux --sort=-%mem | head -${limit + 1}`);
      const lines = stdout.trim().split('\n');
      const header = lines[0];
      const processes = lines.slice(1).map(line => {
        const parts = line.split(/\s+/);
        return {
          user: parts[0],
          pid: parts[1],
          cpu: parts[2],
          mem: parts[3],
          command: parts.slice(10).join(' ')
        };
      });

      return { header, processes };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Obtém informações de rede
   */
  async getNetworkInfo() {
    try {
      const interfaces = os.networkInterfaces();
      const result = {};

      for (const [name, addrs] of Object.entries(interfaces)) {
        result[name] = addrs.map(addr => ({
          address: addr.address,
          family: addr.family,
          internal: addr.internal,
          mac: addr.mac
        }));
      }

      // Obter IP público
      try {
        const { stdout } = await execAsync('curl -s ifconfig.me 2>/dev/null');
        result.publicIP = stdout.trim();
      } catch {
        result.publicIP = 'N/A';
      }

      return result;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Verifica status de serviços
   */
  async getServicesStatus(services = ['clawdbot', 'ollama', 'nginx', 'docker']) {
    const results = {};

    for (const service of services) {
      try {
        const { stdout } = await execAsync(`systemctl is-active ${service} 2>/dev/null`);
        results[service] = {
          status: stdout.trim(),
          active: stdout.trim() === 'active'
        };
      } catch {
        results[service] = {
          status: 'not-found',
          active: false
        };
      }
    }

    return results;
  }

  /**
   * Gera relatório de saúde
   */
  async getHealthReport() {
    const info = await this.getSystemInfo();
    const services = await this.getServicesStatus();
    const processes = await this.getTopProcesses(5);

    const alerts = [];

    if (info.cpu?.alert) {
      alerts.push(`⚠️ CPU alta: ${info.cpu.usage}%`);
    }
    if (info.memory?.alert) {
      alerts.push(`⚠️ Memória alta: ${info.memory.usagePercent}%`);
    }
    if (info.disk?.alert) {
      alerts.push(`⚠️ Disco quase cheio: ${info.disk.usageStr}`);
    }
    if (info.temperature?.alert) {
      alerts.push(`🌡️ Temperatura alta: ${info.temperature.celsius}°C`);
    }

    return {
      status: alerts.length === 0 ? 'healthy' : 'warning',
      alerts,
      system: info,
      services,
      topProcesses: processes
    };
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
}

// Exportar para uso como módulo
module.exports = SystemMonitor;

// Permitir execução direta para testes
if (require.main === module) {
  const monitor = new SystemMonitor();
  
  (async () => {
    console.log('🔍 Obtendo informações do sistema...\n');
    
    const health = await monitor.getHealthReport();
    console.log('📊 Relatório de Saúde:');
    console.log(JSON.stringify(health, null, 2));
  })();
}
