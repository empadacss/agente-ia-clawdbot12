/**
 * 🌐 WEB AUTOMATION SKILL
 * Pesquisar na internet e automação de navegador
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const execAsync = util.promisify(exec);

let browser = null;
let page = null;

// Inicializar Puppeteer dinamicamente
async function initBrowser() {
  if (browser) return;
  
  const puppeteer = require('puppeteer');
  browser = await puppeteer.launch({
    headless: false,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ],
    defaultViewport: { width: 1280, height: 720 }
  });
}

module.exports = {
  name: 'web-automation',
  description: 'Pesquisar na internet e automação de navegador',
  
  actions: {
    // ============ PESQUISA ============
    
    search: {
      description: 'Pesquisar algo no Google',
      parameters: {
        query: { type: 'string', required: true, description: 'O que pesquisar' }
      },
      async handler({ query }) {
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        exec(`xdg-open "${url}" &`, { detached: true });
        return `🔍 Pesquisando: ${query}`;
      }
    },
    
    searchYoutube: {
      description: 'Pesquisar no YouTube',
      parameters: {
        query: { type: 'string', required: true }
      },
      async handler({ query }) {
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        exec(`xdg-open "${url}" &`, { detached: true });
        return `📺 Pesquisando no YouTube: ${query}`;
      }
    },
    
    searchWikipedia: {
      description: 'Pesquisar na Wikipedia',
      parameters: {
        query: { type: 'string', required: true }
      },
      async handler({ query }) {
        const url = `https://pt.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`;
        exec(`xdg-open "${url}" &`, { detached: true });
        return `📚 Pesquisando na Wikipedia: ${query}`;
      }
    },
    
    searchMaps: {
      description: 'Pesquisar no Google Maps',
      parameters: {
        query: { type: 'string', required: true }
      },
      async handler({ query }) {
        const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
        exec(`xdg-open "${url}" &`, { detached: true });
        return `🗺️ Pesquisando no Maps: ${query}`;
      }
    },
    
    searchImages: {
      description: 'Pesquisar imagens no Google',
      parameters: {
        query: { type: 'string', required: true }
      },
      async handler({ query }) {
        const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
        exec(`xdg-open "${url}" &`, { detached: true });
        return `🖼️ Pesquisando imagens: ${query}`;
      }
    },
    
    // ============ NAVEGADOR PUPPETEER ============
    
    openBrowser: {
      description: 'Abrir navegador controlável e navegar para uma URL',
      parameters: {
        url: { type: 'string', required: true, description: 'URL para abrir' }
      },
      async handler({ url }) {
        try {
          await initBrowser();
          
          let fullUrl = url;
          if (!url.startsWith('http')) fullUrl = 'https://' + url;
          
          page = await browser.newPage();
          await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          
          const title = await page.title();
          return `🌐 Navegador aberto\n📄 Título: ${title}\n🔗 URL: ${fullUrl}`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    navigateTo: {
      description: 'Navegar para uma URL no navegador aberto',
      parameters: {
        url: { type: 'string', required: true }
      },
      async handler({ url }) {
        try {
          if (!page) return '❌ Navegador não aberto. Use openBrowser primeiro.';
          
          let fullUrl = url;
          if (!url.startsWith('http')) fullUrl = 'https://' + url;
          
          await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          const title = await page.title();
          return `🌐 Navegado para: ${title}`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    screenshot: {
      description: 'Capturar screenshot da página atual',
      async handler() {
        try {
          if (!page) {
            // Screenshot do desktop se não há página aberta
            const filepath = `/tmp/screenshot-${Date.now()}.png`;
            await execAsync(`scrot ${filepath}`);
            return { type: 'photo', path: filepath };
          }
          
          const filepath = `/tmp/screenshot-${Date.now()}.png`;
          await page.screenshot({ path: filepath, fullPage: false });
          return { type: 'photo', path: filepath };
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    screenshotDesktop: {
      description: 'Capturar screenshot do desktop',
      async handler() {
        try {
          const filepath = `/tmp/screenshot-${Date.now()}.png`;
          await execAsync(`scrot ${filepath}`);
          return { type: 'photo', path: filepath };
        } catch (error) {
          return `❌ Erro ao capturar tela: ${error.message}`;
        }
      }
    },
    
    clickElement: {
      description: 'Clicar em um elemento da página por seletor CSS',
      parameters: {
        selector: { type: 'string', required: true, description: 'Seletor CSS do elemento' }
      },
      async handler({ selector }) {
        try {
          if (!page) return '❌ Navegador não aberto';
          
          await page.click(selector);
          return `🖱️ Clicado: ${selector}`;
        } catch (error) {
          return `❌ Elemento não encontrado: ${selector}`;
        }
      }
    },
    
    typeInElement: {
      description: 'Digitar texto em um campo da página',
      parameters: {
        selector: { type: 'string', required: true, description: 'Seletor CSS do campo' },
        text: { type: 'string', required: true, description: 'Texto para digitar' }
      },
      async handler({ selector, text }) {
        try {
          if (!page) return '❌ Navegador não aberto';
          
          await page.type(selector, text);
          return `⌨️ Digitado em ${selector}`;
        } catch (error) {
          return `❌ Elemento não encontrado: ${selector}`;
        }
      }
    },
    
    fillForm: {
      description: 'Preencher um formulário de busca e submeter',
      parameters: {
        searchText: { type: 'string', required: true }
      },
      async handler({ searchText }) {
        try {
          if (!page) return '❌ Navegador não aberto';
          
          // Tentar encontrar campo de busca comum
          const searchSelectors = [
            'input[name="q"]',
            'input[name="search"]',
            'input[type="search"]',
            'input[name="query"]',
            '#search',
            '.search-input'
          ];
          
          for (const sel of searchSelectors) {
            try {
              await page.waitForSelector(sel, { timeout: 2000 });
              await page.type(sel, searchText);
              await page.keyboard.press('Enter');
              await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
              return `🔍 Pesquisado: ${searchText}`;
            } catch {
              continue;
            }
          }
          
          return '❌ Campo de busca não encontrado';
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    getPageContent: {
      description: 'Obter o texto visível da página atual',
      async handler() {
        try {
          if (!page) return '❌ Navegador não aberto';
          
          const text = await page.evaluate(() => {
            return document.body.innerText.slice(0, 3000);
          });
          
          return `📄 Conteúdo da página:\n\n${text}`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    getPageTitle: {
      description: 'Obter o título da página atual',
      async handler() {
        try {
          if (!page) return '❌ Navegador não aberto';
          
          const title = await page.title();
          const url = page.url();
          return `📄 Título: ${title}\n🔗 URL: ${url}`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    goBack: {
      description: 'Voltar para a página anterior',
      async handler() {
        try {
          if (!page) return '❌ Navegador não aberto';
          
          await page.goBack();
          const title = await page.title();
          return `⬅️ Voltou para: ${title}`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    goForward: {
      description: 'Avançar para a próxima página',
      async handler() {
        try {
          if (!page) return '❌ Navegador não aberto';
          
          await page.goForward();
          const title = await page.title();
          return `➡️ Avançou para: ${title}`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    refreshPage: {
      description: 'Atualizar a página atual',
      async handler() {
        try {
          if (!page) return '❌ Navegador não aberto';
          
          await page.reload({ waitUntil: 'networkidle2' });
          return `🔄 Página atualizada`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    closeBrowser: {
      description: 'Fechar o navegador controlável',
      async handler() {
        try {
          if (browser) {
            await browser.close();
            browser = null;
            page = null;
            return '✅ Navegador fechado';
          }
          return 'ℹ️ Navegador não estava aberto';
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    },
    
    scrollPage: {
      description: 'Rolar a página',
      parameters: {
        direction: { type: 'string', required: true, description: 'up ou down' },
        amount: { type: 'number', default: 500 }
      },
      async handler({ direction, amount = 500 }) {
        try {
          if (!page) return '❌ Navegador não aberto';
          
          const scrollAmount = direction === 'up' ? -amount : amount;
          await page.evaluate((y) => window.scrollBy(0, y), scrollAmount);
          return `📜 Página rolada ${direction}`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
      }
    }
  }
};
