const https = require('https');
const vm = require('vm');

function get(url) {
  return new Promise((res, rej) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' } }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(d));
    });
    req.on('error', rej);
    req.setTimeout(15000, () => { req.destroy(); rej(new Error('timeout')); });
  });
}

async function main() {
  const html = await get('https://help.carrotquest.io/article/196');

  // Find script blocks
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  let nuxtScript = '';
  while ((m = scriptRe.exec(html)) !== null) {
    if (m[1].includes('__NUXT__')) {
      nuxtScript = m[1];
      break;
    }
  }

  console.log('NUXT script found:', nuxtScript.length > 0);
  console.log('First 500 chars:', nuxtScript.slice(0, 500));
  console.log('---');

  // Try to evaluate it
  if (nuxtScript) {
    try {
      const ctx = { window: {} };
      vm.runInNewContext(nuxtScript, ctx, { timeout: 5000 });
      const nuxt = ctx.window.__NUXT__;
      console.log('Eval success! Keys:', Object.keys(nuxt));
      if (nuxt.data) {
        console.log('data[0] keys:', Object.keys(nuxt.data[0] || {}));
        const article = nuxt.data[0] && nuxt.data[0].article;
        if (article) {
          console.log('Article title:', article.name);
          console.log('Content length:', (article.content || '').length);
          console.log('Content preview:', (article.content || '').slice(0, 300));
        }
      }
    } catch (e) {
      console.log('Eval error:', e.message);
      // Try direct extraction from the script text
      const contentMatch = nuxtScript.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (contentMatch) {
        console.log('Content via regex, length:', contentMatch[1].length);
        console.log('Preview:', contentMatch[1].slice(0, 300));
      }

      // Try the full content extraction from HTML title
      const nameMatch = nuxtScript.match(/"name"\s*:\s*"([^"]+)"/);
      console.log('Name via regex:', nameMatch ? nameMatch[1] : 'not found');
    }
  }
}

main().catch(console.error);
