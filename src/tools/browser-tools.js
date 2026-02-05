/**
 * ============================================
 * 🌐 BROWSER TOOLS - Automação Web Avançada
 * ============================================
 * Ferramentas de navegação usando Puppeteer
 * ============================================
 */

let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch {
  console.log('⚠️ Puppeteer não instalado - ferramentas de browser desabilitadas');
}

// Browser compartilhado
let browser = null;
let page = null;

async function ensureBrowser() {
  if (!puppeteer) {
    throw new Error('Puppeteer não instalado');
  }
  
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--start-maximized'
      ]
    });
    
    const pages = await browser.pages();
    page = pages[0] || await browser.newPage();
    
    console.log('🌐 Browser iniciado');
  }
  
  return { browser, page };
}

const browserTools = [
  {
    name: 'browser_open',
    description: 'Abre o navegador controlado (headless=false para ver)',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL inicial (opcional)' }
      },
      required: []
    },
    async handler({ url }) {
      const { page } = await ensureBrowser();
      if (url) {
        await page.goto(url.startsWith('http') ? url : `https://${url}`, { waitUntil: 'domcontentloaded' });
      }
      return { success: true, message: 'Browser aberto', url: url || 'about:blank' };
    }
  },
  
  {
    name: 'browser_navigate',
    description: 'Navega para uma URL',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL para navegar' }
      },
      required: ['url']
    },
    async handler({ url }) {
      const { page } = await ensureBrowser();
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const title = await page.title();
      return { success: true, url: fullUrl, title };
    }
  },
  
  {
    name: 'browser_click',
    description: 'Clica em um elemento pelo seletor CSS ou texto',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Seletor CSS do elemento' },
        text: { type: 'string', description: 'Texto do elemento (alternativo ao seletor)' }
      },
      required: []
    },
    async handler({ selector, text }) {
      const { page } = await ensureBrowser();
      
      if (text) {
        // Clicar por texto
        const element = await page.evaluateHandle((searchText) => {
          const elements = document.querySelectorAll('a, button, input, [role="button"]');
          return Array.from(elements).find(el => 
            el.textContent?.toLowerCase().includes(searchText.toLowerCase()) ||
            el.value?.toLowerCase().includes(searchText.toLowerCase())
          );
        }, text);
        
        if (element) {
          await element.click();
          return { success: true, clicked: `element with text "${text}"` };
        }
        return { error: `Elemento com texto "${text}" não encontrado` };
      }
      
      if (selector) {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector);
        return { success: true, clicked: selector };
      }
      
      return { error: 'Forneça selector ou text' };
    }
  },
  
  {
    name: 'browser_type',
    description: 'Digita texto em um campo de input',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Seletor CSS do input' },
        text: { type: 'string', description: 'Texto para digitar' },
        clear: { type: 'boolean', description: 'Limpar campo antes de digitar', default: true }
      },
      required: ['text']
    },
    async handler({ selector, text, clear = true }) {
      const { page } = await ensureBrowser();
      
      // Se não passar seletor, procurar input focado ou visível
      const sel = selector || 'input:not([type="hidden"]):not([type="submit"]), textarea, [contenteditable="true"]';
      
      await page.waitForSelector(sel, { timeout: 5000 });
      
      if (clear) {
        await page.click(sel, { clickCount: 3 }); // Selecionar tudo
      }
      
      await page.type(sel, text, { delay: 30 });
      return { success: true, typed: text.length + ' caracteres' };
    }
  },
  
  {
    name: 'browser_screenshot',
    description: 'Captura screenshot da página no browser',
    parameters: {
      type: 'object',
      properties: {
        fullPage: { type: 'boolean', description: 'Capturar página inteira', default: false }
      },
      required: []
    },
    async handler({ fullPage = false }) {
      const { page } = await ensureBrowser();
      const filepath = `/tmp/browser-screenshot-${Date.now()}.png`;
      await page.screenshot({ path: filepath, fullPage });
      
      const fs = require('fs');
      const base64 = fs.readFileSync(filepath).toString('base64');
      
      return { 
        success: true, 
        path: filepath,
        base64,
        message: 'Screenshot do browser capturada'
      };
    }
  },
  
  {
    name: 'browser_get_text',
    description: 'Obtém o texto de um elemento ou da página',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Seletor CSS (opcional, padrão: body)' }
      },
      required: []
    },
    async handler({ selector = 'body' }) {
      const { page } = await ensureBrowser();
      const text = await page.$eval(selector, el => el.textContent?.slice(0, 5000));
      return { text: text?.trim() };
    }
  },
  
  {
    name: 'browser_get_html',
    description: 'Obtém o HTML de um elemento',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Seletor CSS' }
      },
      required: ['selector']
    },
    async handler({ selector }) {
      const { page } = await ensureBrowser();
      const html = await page.$eval(selector, el => el.outerHTML?.slice(0, 5000));
      return { html };
    }
  },
  
  {
    name: 'browser_get_links',
    description: 'Lista todos os links da página',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      const { page } = await ensureBrowser();
      const links = await page.$$eval('a[href]', anchors => 
        anchors.slice(0, 50).map(a => ({ text: a.textContent?.trim()?.slice(0, 50), href: a.href }))
      );
      return { links };
    }
  },
  
  {
    name: 'browser_scroll',
    description: 'Rola a página',
    parameters: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['up', 'down', 'top', 'bottom'] },
        amount: { type: 'integer', description: 'Pixels para rolar (para up/down)', default: 500 }
      },
      required: ['direction']
    },
    async handler({ direction, amount = 500 }) {
      const { page } = await ensureBrowser();
      
      switch (direction) {
        case 'down':
          await page.evaluate((px) => window.scrollBy(0, px), amount);
          break;
        case 'up':
          await page.evaluate((px) => window.scrollBy(0, -px), amount);
          break;
        case 'top':
          await page.evaluate(() => window.scrollTo(0, 0));
          break;
        case 'bottom':
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          break;
      }
      
      return { success: true, direction, amount };
    }
  },
  
  {
    name: 'browser_press_key',
    description: 'Pressiona uma tecla no browser',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Tecla (Enter, Escape, Tab, ArrowDown, etc)' }
      },
      required: ['key']
    },
    async handler({ key }) {
      const { page } = await ensureBrowser();
      await page.keyboard.press(key);
      return { success: true, key };
    }
  },
  
  {
    name: 'browser_wait',
    description: 'Aguarda um elemento aparecer ou tempo específico',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Seletor CSS para aguardar' },
        timeout: { type: 'integer', description: 'Tempo máximo em ms', default: 5000 }
      },
      required: []
    },
    async handler({ selector, timeout = 5000 }) {
      const { page } = await ensureBrowser();
      
      if (selector) {
        await page.waitForSelector(selector, { timeout });
        return { success: true, found: selector };
      } else {
        await new Promise(r => setTimeout(r, timeout));
        return { success: true, waited: timeout + 'ms' };
      }
    }
  },
  
  {
    name: 'browser_back',
    description: 'Volta para a página anterior',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      const { page } = await ensureBrowser();
      await page.goBack();
      const title = await page.title();
      return { success: true, title };
    }
  },
  
  {
    name: 'browser_forward',
    description: 'Avança para a próxima página',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      const { page } = await ensureBrowser();
      await page.goForward();
      const title = await page.title();
      return { success: true, title };
    }
  },
  
  {
    name: 'browser_refresh',
    description: 'Atualiza a página atual',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      const { page } = await ensureBrowser();
      await page.reload({ waitUntil: 'domcontentloaded' });
      const title = await page.title();
      return { success: true, title };
    }
  },
  
  {
    name: 'browser_close',
    description: 'Fecha o navegador',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      if (browser) {
        await browser.close();
        browser = null;
        page = null;
      }
      return { success: true, message: 'Browser fechado' };
    }
  },
  
  {
    name: 'browser_new_tab',
    description: 'Abre uma nova aba',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL da nova aba' }
      },
      required: []
    },
    async handler({ url }) {
      const { browser } = await ensureBrowser();
      page = await browser.newPage();
      if (url) {
        await page.goto(url.startsWith('http') ? url : `https://${url}`, { waitUntil: 'domcontentloaded' });
      }
      return { success: true, message: 'Nova aba aberta', url: url || 'about:blank' };
    }
  },
  
  {
    name: 'browser_list_tabs',
    description: 'Lista todas as abas abertas',
    parameters: { type: 'object', properties: {}, required: [] },
    async handler() {
      const { browser } = await ensureBrowser();
      const pages = await browser.pages();
      const tabs = await Promise.all(pages.map(async (p, i) => ({
        index: i,
        url: p.url(),
        title: await p.title()
      })));
      return { tabs };
    }
  },
  
  {
    name: 'browser_switch_tab',
    description: 'Muda para uma aba específica pelo índice',
    parameters: {
      type: 'object',
      properties: {
        index: { type: 'integer', description: 'Índice da aba' }
      },
      required: ['index']
    },
    async handler({ index }) {
      const { browser } = await ensureBrowser();
      const pages = await browser.pages();
      if (index >= 0 && index < pages.length) {
        page = pages[index];
        await page.bringToFront();
        return { success: true, switched: index, title: await page.title() };
      }
      return { error: `Índice ${index} inválido. Abas: 0-${pages.length - 1}` };
    }
  },
  
  {
    name: 'browser_evaluate',
    description: 'Executa JavaScript na página',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Código JavaScript para executar' }
      },
      required: ['code']
    },
    async handler({ code }) {
      const { page } = await ensureBrowser();
      try {
        const result = await page.evaluate(new Function('return ' + code));
        return { success: true, result: JSON.stringify(result)?.slice(0, 2000) };
      } catch (error) {
        return { error: error.message };
      }
    }
  }
];

module.exports = { browserTools };
