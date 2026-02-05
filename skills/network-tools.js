/**
 * ============================================
 * Skill: Network Tools
 * Ferramentas de diagnóstico e informações de rede
 * ============================================
 */

const { exec } = require('child_process');
const os = require('os');
const util = require('util');
const dns = require('dns').promises;

const execAsync = util.promisify(exec);

class NetworkTools {
  constructor(config = {}) {
    this.config = {
      allowExternalRequests: config.allowExternalRequests !== false,
      timeout: config.timeout || 10000,
      maxPingCount: config.maxPingCount || 10
    };
  }

  /**
   * Obtém todas as interfaces de rede
   */
  async getInterfaces() {
    try {
      const interfaces = os.networkInterfaces();
      const result = {};

      for (const [name, addrs] of Object.entries(interfaces)) {
        result[name] = {
          addresses: addrs.map(addr => ({
            address: addr.address,
            family: addr.family,
            netmask: addr.netmask,
            internal: addr.internal,
            mac: addr.mac,
            cidr: addr.cidr
          }))
        };
      }

      return result;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Obtém endereço IP local principal
   */
  async getLocalIP() {
    try {
      const interfaces = os.networkInterfaces();
      
      for (const [name, addrs] of Object.entries(interfaces)) {
        for (const addr of addrs) {
          if (addr.family === 'IPv4' && !addr.internal) {
            return {
              interface: name,
              ip: addr.address,
              netmask: addr.netmask,
              mac: addr.mac
            };
          }
        }
      }

      return { error: 'Nenhum IP local encontrado' };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Obtém endereço IP público
   */
  async getPublicIP() {
    if (!this.config.allowExternalRequests) {
      return { error: 'Requisições externas não permitidas' };
    }

    try {
      // Tentar múltiplos serviços
      const services = [
        'curl -s ifconfig.me',
        'curl -s icanhazip.com',
        'curl -s ipecho.net/plain'
      ];

      for (const cmd of services) {
        try {
          const { stdout } = await execAsync(cmd, { timeout: this.config.timeout });
          const ip = stdout.trim();
          if (ip && /^[\d.]+$/.test(ip)) {
            return { ip, source: cmd.split(' ')[2] };
          }
        } catch {}
      }

      return { error: 'Não foi possível obter IP público' };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Executa ping para um host
   */
  async ping(host, count = 4) {
    try {
      const pingCount = Math.min(count, this.config.maxPingCount);
      const { stdout, stderr } = await execAsync(
        `ping -c ${pingCount} ${host}`,
        { timeout: this.config.timeout * pingCount }
      );

      // Parse resultado
      const lines = stdout.split('\n');
      const statsLine = lines.find(l => l.includes('packets transmitted'));
      const rttLine = lines.find(l => l.includes('rtt') || l.includes('round-trip'));

      let stats = {};
      if (statsLine) {
        const match = statsLine.match(/(\d+) packets transmitted, (\d+) (?:packets )?received/);
        if (match) {
          stats.transmitted = parseInt(match[1]);
          stats.received = parseInt(match[2]);
          stats.loss = ((stats.transmitted - stats.received) / stats.transmitted * 100).toFixed(1);
        }
      }

      if (rttLine) {
        const match = rttLine.match(/= ([\d.]+)\/([\d.]+)\/([\d.]+)/);
        if (match) {
          stats.rtt = {
            min: parseFloat(match[1]),
            avg: parseFloat(match[2]),
            max: parseFloat(match[3])
          };
        }
      }

      return {
        host,
        success: stats.received > 0,
        stats,
        raw: stdout
      };
    } catch (error) {
      return { 
        host, 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Resolve DNS de um hostname
   */
  async dnsLookup(hostname) {
    try {
      const [ipv4, ipv6, mx, txt] = await Promise.allSettled([
        dns.resolve4(hostname),
        dns.resolve6(hostname),
        dns.resolveMx(hostname),
        dns.resolveTxt(hostname)
      ]);

      return {
        hostname,
        ipv4: ipv4.status === 'fulfilled' ? ipv4.value : [],
        ipv6: ipv6.status === 'fulfilled' ? ipv6.value : [],
        mx: mx.status === 'fulfilled' ? mx.value : [],
        txt: txt.status === 'fulfilled' ? txt.value.flat() : []
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Executa traceroute para um host
   */
  async traceroute(host, maxHops = 15) {
    try {
      const { stdout } = await execAsync(
        `traceroute -m ${maxHops} ${host}`,
        { timeout: this.config.timeout * maxHops }
      );

      const lines = stdout.split('\n').slice(1).filter(Boolean);
      const hops = lines.map((line, index) => {
        const parts = line.trim().split(/\s+/);
        return {
          hop: index + 1,
          raw: line.trim()
        };
      });

      return {
        host,
        hops,
        raw: stdout
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Verifica se uma porta está aberta
   */
  async checkPort(host, port, protocol = 'tcp') {
    try {
      const { stdout } = await execAsync(
        `nc -z -v -w 5 ${host} ${port} 2>&1`,
        { timeout: this.config.timeout }
      );

      return {
        host,
        port,
        protocol,
        open: true,
        message: stdout.trim()
      };
    } catch (error) {
      return {
        host,
        port,
        protocol,
        open: false,
        message: error.message
      };
    }
  }

  /**
   * Lista portas abertas no sistema
   */
  async getOpenPorts() {
    try {
      // Tentar netstat primeiro, depois ss
      let command = 'ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null';
      const { stdout } = await execAsync(command);

      const lines = stdout.split('\n').slice(1).filter(Boolean);
      const ports = [];

      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 4) {
          const localAddr = parts[3] || parts[4];
          const match = localAddr.match(/:(\d+)$/);
          if (match) {
            ports.push({
              port: parseInt(match[1]),
              address: localAddr.replace(`:${match[1]}`, ''),
              state: parts[0],
              raw: line
            });
          }
        }
      }

      // Remover duplicatas e ordenar
      const uniquePorts = [...new Map(ports.map(p => [p.port, p])).values()];
      uniquePorts.sort((a, b) => a.port - b.port);

      return { ports: uniquePorts };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Obtém estatísticas de uso de rede
   */
  async getNetworkStats() {
    try {
      const { stdout } = await execAsync('cat /proc/net/dev');
      const lines = stdout.split('\n').slice(2).filter(Boolean);
      
      const stats = {};
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const iface = parts[0].replace(':', '');
        
        stats[iface] = {
          rx: {
            bytes: parseInt(parts[1]),
            packets: parseInt(parts[2]),
            errors: parseInt(parts[3]),
            dropped: parseInt(parts[4])
          },
          tx: {
            bytes: parseInt(parts[9]),
            packets: parseInt(parts[10]),
            errors: parseInt(parts[11]),
            dropped: parseInt(parts[12])
          }
        };

        // Formatar bytes
        stats[iface].rx.formatted = this.formatBytes(stats[iface].rx.bytes);
        stats[iface].tx.formatted = this.formatBytes(stats[iface].tx.bytes);
      }

      return stats;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Testa velocidade de download
   */
  async speedTest() {
    if (!this.config.allowExternalRequests) {
      return { error: 'Requisições externas não permitidas' };
    }

    try {
      const testUrl = 'http://speedtest.tele2.net/1MB.zip';
      const startTime = Date.now();
      
      const { stdout } = await execAsync(
        `curl -o /dev/null -w '%{speed_download}' -s ${testUrl}`,
        { timeout: 60000 }
      );

      const speedBps = parseFloat(stdout);
      const speedMbps = (speedBps * 8 / 1000000).toFixed(2);

      return {
        downloadSpeed: `${speedMbps} Mbps`,
        bytesPerSecond: speedBps.toFixed(0),
        testFile: '1MB',
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Obtém conexões ativas
   */
  async getConnections() {
    try {
      const { stdout } = await execAsync('ss -tna 2>/dev/null | tail -20');
      const lines = stdout.split('\n').filter(Boolean);
      
      return {
        count: lines.length - 1,
        connections: lines.slice(1).map(line => {
          const parts = line.split(/\s+/);
          return {
            state: parts[0],
            local: parts[3],
            remote: parts[4]
          };
        })
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Obtém resumo completo de rede
   */
  async getNetworkSummary() {
    const [localIP, publicIP, interfaces, openPorts, stats] = await Promise.all([
      this.getLocalIP(),
      this.getPublicIP(),
      this.getInterfaces(),
      this.getOpenPorts(),
      this.getNetworkStats()
    ]);

    return {
      timestamp: new Date().toISOString(),
      localIP,
      publicIP,
      interfaces,
      openPorts,
      stats
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
module.exports = NetworkTools;

// Permitir execução direta para testes
if (require.main === module) {
  const net = new NetworkTools();
  
  (async () => {
    console.log('🌐 Testando Network Tools...\n');
    
    const summary = await net.getNetworkSummary();
    console.log('📊 Resumo de Rede:');
    console.log(JSON.stringify(summary, null, 2));
  })();
}
