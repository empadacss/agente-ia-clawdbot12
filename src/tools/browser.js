/**
 * ============================================
 * BROWSER TOOL
 * ============================================
 * Navegação web via Puppeteer com auto-reconnect
 * ============================================
 */

const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

let puppeteer;
try { puppeteer = require('puppeteer'); } catch {}

let browser = null;
let page = null;

function findChromium() {
  const paths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/snap/bin/chromium'
  ];
  const fs = require('fs');
  for (const p of paths) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

async function ensureBrowser() {
  if (!puppeteer) throw new Error('Puppeteer não instalado. Execute: npm install puppeteer');

  // Reconectar se desconectou
  if (browser && !browser.connected) {
    browser = null;
    page = null;
  }

  if (!browser) {
    const execPath = findChromium();
    const launchOpts = {
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1280,720'
      ],
      defaultViewport: { width: 1280, height: 720 }
    };
    if (execPath) launchOpts.executablePath = execPath;

    browser = await puppeteer.launch(launchOpts);
    const pages = await browser.pages();
    page = pages[0] || await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
  }

  // Se a page foi fechada, criar nova
  if (!page || page.isClosed()) {
    page = await browser.newPage();
  }

  return page;
}

async function navigateTo(url) {
  const p = await ensureBrowser();
  let fullUrl = url;
  if (!/^https?:\/\//i.test(url)) fullUrl = 'https://' + url;
  await p.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  return { success: true, title: await p.title(), url: p.url() };
}

async function searchGoogle(query) {
  return navigateTo(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
}

async function searchYouTube(query) {
  return navigateTo(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
}

async function screenshotPage() {
  const p = await ensureBrowser();
  const data = await p.screenshot({ encoding: 'base64', fullPage: false });
  return { type: 'image', mediaType: 'image/png', data };
}

async function getPageContent() {
  const p = await ensureBrowser();
  const content = await p.evaluate(() => {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('script,style,noscript,svg,img').forEach(el => el.remove());
    return clone.innerText.slice(0, 30000);
  });
  return { success: true, title: await p.title(), url: p.url(), content };
}

async function clickElement(selector) {
  const p = await ensureBrowser();
  await p.waitForSelector(selector, { timeout: 5000 });
  await p.click(selector);
  return { success: true, clicked: selector };
}

async function typeInField(selector, text) {
  const p = await ensureBrowser();
  await p.waitForSelector(selector, { timeout: 5000 });
  await p.type(selector, text, { delay: 40 });
  return { success: true, typed: text.length };
}

async function executeJS(code) {
  const p = await ensureBrowser();
  // Wrap para suportar tanto expressões quanto statements
  const result = await p.evaluate(`(function(){ try { return eval(${JSON.stringify(code)}); } catch(e) { return e.message; } })()`);
  return { success: true, result: typeof result === 'object' ? JSON.stringify(result) : String(result) };
}

async function goBack() {
  const p = await ensureBrowser();
  await p.goBack({ waitUntil: 'domcontentloaded' });
  return { success: true, url: p.url() };
}

async function goForward() {
  const p = await ensureBrowser();
  await p.goForward({ waitUntil: 'domcontentloaded' });
  return { success: true, url: p.url() };
}

async function reloadPage() {
  const p = await ensureBrowser();
  await p.reload({ waitUntil: 'domcontentloaded' });
  return { success: true, url: p.url() };
}

async function closeBrowser() {
  if (browser) {
    try { await browser.close(); } catch {}
    browser = null;
    page = null;
  }
  return { success: true, message: 'Navegador fechado' };
}

async function openSystemBrowser(url) {
  let fullUrl = url;
  if (!/^https?:\/\//i.test(url)) fullUrl = 'https://' + url;
  exec(`xdg-open "${fullUrl}"`, { detached: true, env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' } });
  return { success: true, url: fullUrl };
}

async function browserHandler(input) {
  const { action, url, query, selector, text, script } = input;
  try {
    switch (action) {
      case 'navigate':   return url ? await navigateTo(url) : { error: 'url obrigatório' };
      case 'search':
      case 'google':     return query ? await searchGoogle(query) : { error: 'query obrigatório' };
      case 'youtube':    return query ? await searchYouTube(query) : { error: 'query obrigatório' };
      case 'screenshot': return await screenshotPage();
      case 'content':    return await getPageContent();
      case 'click':      return selector ? await clickElement(selector) : { error: 'selector obrigatório' };
      case 'type':       return (selector && text) ? await typeInField(selector, text) : { error: 'selector e text obrigatórios' };
      case 'execute':    return script ? await executeJS(script) : { error: 'script obrigatório' };
      case 'back':       return await goBack();
      case 'forward':    return await goForward();
      case 'reload':     return await reloadPage();
      case 'close':      return await closeBrowser();
      case 'open':       return url ? await openSystemBrowser(url) : { error: 'url obrigatório' };
      default:           return { error: `Ação desconhecida: ${action}` };
    }
  } catch (err) {
    return { error: err.message };
  }
}

const browserTool = {
  name: 'browser',
  description: `Navegador web para pesquisas e automação.

Ações:
- navigate: abre URL
- search/google: pesquisa no Google
- youtube: pesquisa no YouTube
- screenshot: captura screenshot da página
- content: extrai texto da página
- click: clica em elemento (CSS selector)
- type: digita em campo (selector + text)
- execute: executa JavaScript
- back/forward/reload: navegação
- close: fecha navegador
- open: abre URL no navegador do sistema`,

  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['navigate', 'search', 'google', 'youtube', 'screenshot', 'content',
               'click', 'type', 'execute', 'back', 'forward', 'reload', 'close', 'open']
      },
      url: { type: 'string' },
      query: { type: 'string' },
      selector: { type: 'string' },
      text: { type: 'string' },
      script: { type: 'string' }
    },
    required: ['action']
  },

  handler: browserHandler
};

module.exports = { browserTool, navigateTo, searchGoogle, searchYouTube, screenshotPage, getPageContent, closeBrowser, openSystemBrowser };
