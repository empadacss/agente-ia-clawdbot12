/**
 * ============================================
 * Script de Teste para Todas as Skills
 * ============================================
 */

const SystemMonitor = require('./system-monitor');
const FileManager = require('./file-manager');
const NetworkTools = require('./network-tools');
const GPIOControl = require('./gpio-control');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const log = {
  header: (msg) => console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}\n${colors.blue}${msg}${colors.reset}\n${colors.blue}${'='.repeat(50)}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  json: (obj) => console.log(JSON.stringify(obj, null, 2))
};

async function testSystemMonitor() {
  log.header('🖥️  Testando System Monitor');
  
  const monitor = new SystemMonitor();
  
  try {
    // Teste 1: Informações do sistema
    log.info('Obtendo informações do sistema...');
    const sysInfo = await monitor.getSystemInfo();
    log.success('Informações do sistema obtidas');
    console.log(`  - Hostname: ${sysInfo.hostname}`);
    console.log(`  - CPU: ${sysInfo.cpu?.usage || 'N/A'}%`);
    console.log(`  - RAM: ${sysInfo.memory?.usagePercent || 'N/A'}%`);
    console.log(`  - Disco: ${sysInfo.disk?.usageStr || 'N/A'}`);
    console.log(`  - Temp: ${sysInfo.temperature?.celsius || 'N/A'}°C`);
    
    // Teste 2: Top processos
    log.info('Obtendo top processos...');
    const procs = await monitor.getTopProcesses(3);
    if (!procs.error) {
      log.success(`${procs.processes?.length || 0} processos obtidos`);
    }
    
    // Teste 3: Status de serviços
    log.info('Verificando serviços...');
    const services = await monitor.getServicesStatus(['clawdbot', 'ollama', 'ssh']);
    log.success('Status de serviços obtido');
    
    return true;
  } catch (error) {
    log.error(`System Monitor: ${error.message}`);
    return false;
  }
}

async function testFileManager() {
  log.header('📁 Testando File Manager');
  
  const fm = new FileManager();
  
  try {
    // Teste 1: Listar diretório
    log.info('Listando /tmp...');
    const listing = await fm.listDirectory('/tmp');
    if (!listing.error) {
      log.success(`${listing.totalFiles} arquivos, ${listing.totalDirectories} diretórios encontrados`);
    } else {
      log.warning(listing.error);
    }
    
    // Teste 2: Verificar permissões
    log.info('Testando verificação de permissões...');
    const allowed = fm.isPathAllowed('/home/test');
    const blocked = fm.isPathAllowed('/etc/shadow');
    log.success(`/home/test: ${allowed.allowed ? 'permitido' : 'bloqueado'}`);
    log.success(`/etc/shadow: ${blocked.allowed ? 'permitido' : 'bloqueado (correto)'}`);
    
    // Teste 3: Criar e remover arquivo de teste
    log.info('Testando escrita de arquivo...');
    const testFile = `/tmp/clawdbot-test-${Date.now()}.txt`;
    const writeResult = await fm.writeFile(testFile, 'Teste ClawdBot');
    if (!writeResult.error) {
      log.success('Arquivo de teste criado');
      
      // Ler arquivo
      const readResult = await fm.readFile(testFile);
      if (!readResult.error) {
        log.success('Arquivo lido com sucesso');
      }
      
      // Remover arquivo
      const removeResult = await fm.remove(testFile);
      if (!removeResult.error) {
        log.success('Arquivo removido');
      }
    } else {
      log.warning(`Não foi possível criar arquivo: ${writeResult.error}`);
    }
    
    return true;
  } catch (error) {
    log.error(`File Manager: ${error.message}`);
    return false;
  }
}

async function testNetworkTools() {
  log.header('🌐 Testando Network Tools');
  
  const net = new NetworkTools();
  
  try {
    // Teste 1: IP Local
    log.info('Obtendo IP local...');
    const localIP = await net.getLocalIP();
    if (!localIP.error) {
      log.success(`IP Local: ${localIP.ip}`);
    } else {
      log.warning(localIP.error);
    }
    
    // Teste 2: IP Público
    log.info('Obtendo IP público...');
    const publicIP = await net.getPublicIP();
    if (!publicIP.error) {
      log.success(`IP Público: ${publicIP.ip}`);
    } else {
      log.warning(publicIP.error);
    }
    
    // Teste 3: Ping
    log.info('Testando ping para 8.8.8.8...');
    const ping = await net.ping('8.8.8.8', 2);
    if (ping.success) {
      log.success(`Ping: ${ping.stats?.rtt?.avg || 'N/A'}ms`);
    } else {
      log.warning('Ping falhou');
    }
    
    // Teste 4: DNS Lookup
    log.info('Testando DNS lookup para google.com...');
    const dns = await net.dnsLookup('google.com');
    if (!dns.error) {
      log.success(`DNS: ${dns.ipv4?.length || 0} endereços IPv4`);
    }
    
    // Teste 5: Portas abertas
    log.info('Listando portas abertas...');
    const ports = await net.getOpenPorts();
    if (!ports.error) {
      log.success(`${ports.ports?.length || 0} portas encontradas`);
    }
    
    return true;
  } catch (error) {
    log.error(`Network Tools: ${error.message}`);
    return false;
  }
}

async function testGPIOControl() {
  log.header('🔌 Testando GPIO Control');
  
  const gpio = new GPIOControl();
  
  try {
    // Teste 1: Verificar disponibilidade
    log.info('Verificando disponibilidade do GPIO...');
    const status = await gpio.getStatus();
    
    if (status.available) {
      log.success(`GPIO disponível via ${status.method}`);
      log.info(`Pinos disponíveis: ${status.availablePins.join(', ')}`);
    } else {
      log.warning('GPIO não disponível neste sistema');
      log.info('Isso é normal se não estiver rodando em Orange Pi');
    }
    
    // Teste 2: Listar pinos
    const pins = gpio.getPinList();
    log.success(`${pins.physicalPins.length} pinos configurados`);
    
    return true;
  } catch (error) {
    log.error(`GPIO Control: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════════╗
║     🧪 TESTE DE SKILLS - AGENTE DE IA CLAWDBOT     ║
║              Orange Pi 5 Plus 32GB                  ║
╚════════════════════════════════════════════════════╝${colors.reset}
  `);
  
  const results = {
    systemMonitor: await testSystemMonitor(),
    fileManager: await testFileManager(),
    networkTools: await testNetworkTools(),
    gpioControl: await testGPIOControl()
  };
  
  // Resumo
  log.header('📊 RESUMO DOS TESTES');
  
  let passed = 0;
  let failed = 0;
  
  for (const [skill, result] of Object.entries(results)) {
    if (result) {
      log.success(`${skill}: OK`);
      passed++;
    } else {
      log.error(`${skill}: FALHOU`);
      failed++;
    }
  }
  
  console.log(`
${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
${colors.green}✅ Passou: ${passed}${colors.reset}
${colors.red}❌ Falhou: ${failed}${colors.reset}
${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
  `);
  
  if (failed === 0) {
    console.log(`${colors.green}🎉 Todos os testes passaram!${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}⚠️  Alguns testes falharam. Verifique os logs acima.${colors.reset}\n`);
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

// Executar testes
runAllTests().catch(error => {
  log.error(`Erro fatal: ${error.message}`);
  process.exit(1);
});
