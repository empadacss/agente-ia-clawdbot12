/**
 * ============================================
 * 🌐 BROWSER TOOL
 * ============================================
 * Navegação e automação web avançada
 * ============================================
 */

const { exec } = require('child_process');
const util = require('util');
const puppeteer = require('puppeteer');

const execAsync = util.promisify(exec);

// Estado do navegador
let browser = null;
let page = null;

/**
 * Inicializar navegador
 */
async function initBrowser() {
  if (browser) return;
  
  browser = await puppeteer.launch({
    headless: false, // Visível para o usuário
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080'
    ],
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  page = await browser.newPage();
  
  // Configurar user agent
  await page.setUserAgent('Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
}

/**
 * Navegar para URL
 */
async function navigateTo(url) {
  try {
    await initBrowser();
    
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = 'https://' + url;
    }
    
    await page.goto(fullUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    const title = await page.title();
    const currentUrl = page.url();
    
    return {
      success: true,
      title,
      url: currentUrl
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Pesquisar no Google
 */
async function searchGoogle(query) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  return await navigateTo(url);
}

/**
 * Pesquisar no YouTube
 */
async function searchYouTube(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  return await navigateTo(url);
}

/**
 * Capturar screenshot da página
 */
async function screenshotPage() {
  try {
    if (!page) {
      return { error: 'Navegador não aberto' };
    }
    
    const screenshot = await page.screenshot({ 
      encoding: 'base64',
      fullPage: false 
    });
    
    return {
      type: 'image',
      mediaType: 'image/png',
      data: screenshot
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Obter conteúdo da página
 */
async function getPageContent() {
  try {
    if (!page) {
      return { error: 'Navegador não aberto' };
    }
    
    const content = await page.evaluate(() => {
      // Remover scripts e styles
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
      return clone.innerText.slice(0, 50000);
    });
    
    return {
      success: true,
      title: await page.title(),
      url: page.url(),
      content
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Clicar em elemento
 */
async function clickElement(selector) {
  try {
    if (!page) return { error: 'Navegador não aberto' };
    
    await page.waitForSelector(selector, { timeout: 5000 });
    await page.click(selector);
    
    return { success: true, message: `Clicado: ${selector}` };
  } catch (error) {
    return { error: `Elemento não encontrado: ${selector}` };
  }
}

/**
 * Digitar em campo
 */
async function typeInField(selector, text) {
  try {
    if (!page) return { error: 'Navegador não aberto' };
    
    await page.waitForSelector(selector, { timeout: 5000 });
    await page.type(selector, text, { delay: 50 });
    
    return { success: true, message: `Digitado em ${selector}` };
  } catch (error) {
    return { error: `Campo não encontrado: ${selector}` };
  }
}

/**
 * Executar JavaScript na página
 */
async function executeScript(script) {
  try {
    if (!page) return { error: 'Navegador não aberto' };
    
    const result = await page.evaluate(script);
    return { success: true, result };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Voltar página
 */
async function goBack() {
  try {
    if (!page) return { error: 'Navegador não aberto' };
    
    await page.goBack();
    return { success: true, url: page.url() };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Avançar página
 */
async function goForward() {
  try {
    if (!page) return { error: 'Navegador não aberto' };
    
    await page.goForward();
    return { success: true, url: page.url() };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Recarregar página
 */
async function reload() {
  try {
    if (!page) return { error: 'Navegador não aberto' };
    
    await page.reload({ waitUntil: 'networkidle2' });
    return { success: true, url: page.url() };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Fechar navegador
 */
async function closeBrowser() {
  try {
    if (browser) {
      await browser.close();
      browser = null;
      page = null;
    }
    return { success: true, message: 'Navegador fechado' };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Abrir URL no navegador do sistema
 */
async function openInSystemBrowser(url) {
  try {
    let fullUrl = url;
    if (!url.startsWith('http')) fullUrl = 'https://' + url;
    
    exec(`xdg-open "${fullUrl}" &`, { detached: true });
    return { success: true, message: `Abrindo: ${fullUrl}` };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Handler da ferramenta
 */
async function browserHandler(input) {
  const { action, url, query, selector, text, script } = input;
  
  switch (action) {
    case 'navigate':
      if (!url) return { error: 'url é obrigatório' };
      return await navigateTo(url);
    
    case 'search':
    case 'google':
      if (!query) return { error: 'query é obrigatório' };
      return await searchGoogle(query);
    
    case 'youtube':
      if (!query) return { error: 'query é obrigatório' };
      return await searchYouTube(query);
    
    case 'screenshot':
      return await screenshotPage();
    
    case 'content':
      return await getPageContent();
    
    case 'click':
      if (!selector) return { error: 'selector é obrigatório' };
      return await clickElement(selector);
    
    case 'type':
      if (!selector || !text) return { error: 'selector e text são obrigatórios' };
      return await typeInField(selector, text);
    
    case 'execute':
      if (!script) return { error: 'script é obrigatório' };
      return await executeScript(script);
    
    case 'back':
      return await goBack();
    
    case 'forward':
      return await goForward();
    
    case 'reload':
      return await reload();
    
    case 'close':
      return await closeBrowser();
    
    case 'open':
      if (!url) return { error: 'url é obrigatório' };
      return await openInSystemBrowser(url);
    
    default:
      return { error: `Ação desconhecida: ${action}` };
  }
}

/**
 * Definição da ferramenta para o Claude
 */
const browserTool = {
  name: 'browser',
  description: `Navegador web controlável para pesquisas e automação.

Ações:
- navigate: Navega para uma URL
- search/google: Pesquisa no Google
- youtube: Pesquisa no YouTube
- screenshot: Captura screenshot da página
- content: Obtém conteúdo textual da página
- click: Clica em elemento (por seletor CSS)
- type: Digita em campo (seletor + texto)
- execute: Executa JavaScript na página
- back/forward: Navegação
- reload: Recarrega página
- close: Fecha navegador
- open: Abre URL no navegador do sistema`,
  
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['navigate', 'search', 'google', 'youtube', 'screenshot', 'content', 
               'click', 'type', 'execute', 'back', 'forward', 'reload', 'close', 'open'],
        description: 'A ação a executar'
      },
      url: {
        type: 'string',
        description: 'URL para navegar ou abrir'
      },
      query: {
        type: 'string',
        description: 'Termo de pesquisa'
      },
      selector: {
        type: 'string',
        description: 'Seletor CSS do elemento'
      },
      text: {
        type: 'string',
        description: 'Texto para digitar'
      },
      script: {
        type: 'string',
        description: 'JavaScript para executar'
      }
    },
    required: ['action']
  },
  
  handler: browserHandler
};

module.exports = {
  browserTool,
  navigateTo,
  searchGoogle,
  searchYouTube,
  screenshotPage,
  getPageContent,
  closeBrowser,
  openInSystemBrowser
};
