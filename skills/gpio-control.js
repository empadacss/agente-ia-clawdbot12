/**
 * ============================================
 * Skill: GPIO Control
 * Controle de pinos GPIO da Orange Pi
 * ============================================
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class GPIOControl {
  constructor(config = {}) {
    this.config = {
      // Pinos disponíveis na Orange Pi 5 Plus (WiringPi numbering)
      availablePins: config.availablePins || [
        3, 5, 7, 8, 10, 11, 12, 13, 15, 16, 18, 19, 21, 22, 23, 24, 26
      ],
      defaultMode: config.defaultMode || 'output',
      gpioPath: '/sys/class/gpio',
      useWiringPi: config.useWiringPi !== false
    };

    // Mapeamento de pinos físicos para GPIO (Orange Pi 5 Plus)
    this.pinMapping = {
      3: 47,   // GPIO1_B7
      5: 48,   // GPIO1_C0
      7: 50,   // GPIO1_C2
      8: 63,   // GPIO1_D7
      10: 62,  // GPIO1_D6
      11: 139, // GPIO4_B3
      12: 138, // GPIO4_B2
      13: 140, // GPIO4_B4
      15: 141, // GPIO4_B5
      16: 28,  // GPIO0_D4
      18: 29,  // GPIO0_D5
      19: 42,  // GPIO1_B2
      21: 41,  // GPIO1_B1
      22: 142, // GPIO4_B6
      23: 43,  // GPIO1_B3
      24: 44,  // GPIO1_B4
      26: 45   // GPIO1_B5
    };

    this.exportedPins = new Set();
  }

  /**
   * Verifica se GPIO está disponível
   */
  async isAvailable() {
    try {
      // Verificar se o diretório GPIO existe
      if (fs.existsSync(this.config.gpioPath)) {
        return { available: true, method: 'sysfs' };
      }

      // Verificar se gpio (WiringPi) está instalado
      try {
        await execAsync('which gpio');
        return { available: true, method: 'wiringpi' };
      } catch {}

      return { available: false, reason: 'GPIO não disponível' };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  /**
   * Lista pinos disponíveis
   */
  getPinList() {
    return {
      physicalPins: this.config.availablePins,
      mapping: this.pinMapping,
      info: 'Use os números dos pinos físicos do header de 40 pinos'
    };
  }

  /**
   * Exporta um pino GPIO (sysfs)
   */
  async exportPin(physicalPin) {
    if (!this.config.availablePins.includes(physicalPin)) {
      return { error: `Pino ${physicalPin} não está disponível` };
    }

    const gpioNumber = this.pinMapping[physicalPin];
    if (!gpioNumber) {
      return { error: `Mapeamento não encontrado para pino ${physicalPin}` };
    }

    try {
      const gpioDir = path.join(this.config.gpioPath, `gpio${gpioNumber}`);

      if (!fs.existsSync(gpioDir)) {
        fs.writeFileSync(
          path.join(this.config.gpioPath, 'export'),
          gpioNumber.toString()
        );
        
        // Aguardar o sysfs criar os arquivos
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.exportedPins.add(gpioNumber);

      return {
        success: true,
        physicalPin,
        gpioNumber,
        path: gpioDir
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Libera um pino GPIO (sysfs)
   */
  async unexportPin(physicalPin) {
    const gpioNumber = this.pinMapping[physicalPin];
    if (!gpioNumber) {
      return { error: `Mapeamento não encontrado para pino ${physicalPin}` };
    }

    try {
      const gpioDir = path.join(this.config.gpioPath, `gpio${gpioNumber}`);

      if (fs.existsSync(gpioDir)) {
        fs.writeFileSync(
          path.join(this.config.gpioPath, 'unexport'),
          gpioNumber.toString()
        );
      }

      this.exportedPins.delete(gpioNumber);

      return {
        success: true,
        physicalPin,
        gpioNumber
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Define direção do pino (input/output)
   */
  async setDirection(physicalPin, direction) {
    const gpioNumber = this.pinMapping[physicalPin];
    if (!gpioNumber) {
      return { error: `Mapeamento não encontrado para pino ${physicalPin}` };
    }

    if (!['in', 'out', 'input', 'output'].includes(direction.toLowerCase())) {
      return { error: 'Direção deve ser "in" ou "out"' };
    }

    const dir = direction.toLowerCase().startsWith('in') ? 'in' : 'out';

    try {
      // Garantir que o pino está exportado
      await this.exportPin(physicalPin);

      const directionPath = path.join(
        this.config.gpioPath,
        `gpio${gpioNumber}`,
        'direction'
      );

      fs.writeFileSync(directionPath, dir);

      return {
        success: true,
        physicalPin,
        gpioNumber,
        direction: dir
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Lê valor de um pino
   */
  async readPin(physicalPin) {
    const gpioNumber = this.pinMapping[physicalPin];
    if (!gpioNumber) {
      return { error: `Mapeamento não encontrado para pino ${physicalPin}` };
    }

    try {
      // Garantir que o pino está exportado
      await this.exportPin(physicalPin);

      const valuePath = path.join(
        this.config.gpioPath,
        `gpio${gpioNumber}`,
        'value'
      );

      const value = parseInt(fs.readFileSync(valuePath, 'utf8').trim());

      return {
        physicalPin,
        gpioNumber,
        value,
        state: value === 1 ? 'HIGH' : 'LOW'
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Escreve valor em um pino
   */
  async writePin(physicalPin, value) {
    const gpioNumber = this.pinMapping[physicalPin];
    if (!gpioNumber) {
      return { error: `Mapeamento não encontrado para pino ${physicalPin}` };
    }

    // Normalizar valor
    let pinValue;
    if (typeof value === 'string') {
      pinValue = ['1', 'high', 'on', 'true'].includes(value.toLowerCase()) ? 1 : 0;
    } else {
      pinValue = value ? 1 : 0;
    }

    try {
      // Garantir que o pino está exportado e como output
      await this.setDirection(physicalPin, 'out');

      const valuePath = path.join(
        this.config.gpioPath,
        `gpio${gpioNumber}`,
        'value'
      );

      fs.writeFileSync(valuePath, pinValue.toString());

      return {
        success: true,
        physicalPin,
        gpioNumber,
        value: pinValue,
        state: pinValue === 1 ? 'HIGH' : 'LOW'
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Alterna valor de um pino
   */
  async togglePin(physicalPin) {
    try {
      const current = await this.readPin(physicalPin);
      if (current.error) {
        return current;
      }

      const newValue = current.value === 1 ? 0 : 1;
      return await this.writePin(physicalPin, newValue);
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Gera pulso em um pino
   */
  async pulsePin(physicalPin, durationMs = 100) {
    try {
      await this.writePin(physicalPin, 1);
      await new Promise(resolve => setTimeout(resolve, durationMs));
      await this.writePin(physicalPin, 0);

      return {
        success: true,
        physicalPin,
        duration: durationMs,
        action: 'pulse'
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Pisca um LED conectado ao pino
   */
  async blinkPin(physicalPin, times = 3, intervalMs = 500) {
    try {
      for (let i = 0; i < times; i++) {
        await this.writePin(physicalPin, 1);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        await this.writePin(physicalPin, 0);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }

      return {
        success: true,
        physicalPin,
        times,
        interval: intervalMs,
        action: 'blink'
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Lê todos os pinos exportados
   */
  async readAllPins() {
    const results = {};

    for (const pin of this.config.availablePins) {
      const gpioNumber = this.pinMapping[pin];
      const gpioDir = path.join(this.config.gpioPath, `gpio${gpioNumber}`);

      if (fs.existsSync(gpioDir)) {
        const reading = await this.readPin(pin);
        results[pin] = reading;
      }
    }

    return results;
  }

  /**
   * Limpa todos os pinos (unexport)
   */
  async cleanup() {
    const results = [];

    for (const gpioNumber of this.exportedPins) {
      try {
        fs.writeFileSync(
          path.join(this.config.gpioPath, 'unexport'),
          gpioNumber.toString()
        );
        results.push({ gpio: gpioNumber, unexported: true });
      } catch (error) {
        results.push({ gpio: gpioNumber, error: error.message });
      }
    }

    this.exportedPins.clear();

    return {
      success: true,
      results
    };
  }

  /**
   * Obtém status do subsistema GPIO
   */
  async getStatus() {
    const availability = await this.isAvailable();
    const exportedList = [];

    // Listar GPIOs exportados
    try {
      const entries = fs.readdirSync(this.config.gpioPath);
      for (const entry of entries) {
        if (entry.startsWith('gpio') && !entry.includes('chip')) {
          exportedList.push(entry);
        }
      }
    } catch {}

    return {
      available: availability.available,
      method: availability.method,
      exportedGPIOs: exportedList,
      availablePins: this.config.availablePins,
      totalAvailable: this.config.availablePins.length
    };
  }
}

// Exportar para uso como módulo
module.exports = GPIOControl;

// Permitir execução direta para testes
if (require.main === module) {
  const gpio = new GPIOControl();
  
  (async () => {
    console.log('🔌 Testando GPIO Control...\n');
    
    const status = await gpio.getStatus();
    console.log('📊 Status do GPIO:');
    console.log(JSON.stringify(status, null, 2));
    
    console.log('\n📌 Pinos disponíveis:');
    console.log(gpio.getPinList());
  })();
}
