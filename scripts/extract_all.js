// Full extraction of CQ help articles via Nuxt SSR state
const https = require('https');
const vm = require('vm');
const fs = require('fs');

function get(url) {
  return new Promise((res, rej) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html', 'Accept-Language': 'ru' }
    }, r => {
      if ((r.statusCode === 301 || r.statusCode === 302) && r.headers.location) {
        return get(r.headers.location).then(res).catch(rej);
      }
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(d));
    });
    req.on('error', rej);
    req.setTimeout(15000, () => { req.destroy(); rej(new Error('timeout')); });
  });
}

function extractNuxtArticle(html) {
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = scriptRe.exec(html)) !== null) {
    if (!m[1].includes('__NUXT__')) continue;
    try {
      const ctx = { window: {} };
      vm.runInNewContext(m[1], ctx, { timeout: 5000 });
      const nuxt = ctx.window.__NUXT__;
      if (nuxt && nuxt.data && nuxt.data[0] && nuxt.data[0].article) {
        return nuxt.data[0].article;
      }
    } catch (e) {
      return null;
    }
  }
  return null;
}

function htmlToMarkdown(html) {
  if (!html) return '';
  return html
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, l, c) => '\n' + '#'.repeat(+l) + ' ' + c.replace(/<[^>]+>/g, '').trim() + '\n')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, c) => '**' + c.replace(/<[^>]+>/g, '') + '**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, (_, c) => '**' + c.replace(/<[^>]+>/g, '') + '**')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, c) => '\n- ' + c.replace(/<[^>]+>/g, '').trim())
    .replace(/<p[^>]*>/gi, '\n').replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n').trim();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const cats = JSON.parse(fs.readFileSync('scripts/categories.json'));

  const KEY_CATS = {
    23: 'Автоматизация',
    4836: 'Триггерные сообщения',
    4839: 'Цепочки сообщений',
    2668: 'Чат-боты',
    21: 'Email-рассылки',
    24: 'Сбор данных',
    25: 'Посетители',
    26: 'Диалоги',
    22: 'Сценарии',
    56: 'База знаний',
    29: 'Основы'
  };

  const articlesByCat = {};
  const allUrls = new Set();
  for (const [id, name] of Object.entries(KEY_CATS)) {
    const cat = cats[id];
    if (!cat || cat.error) continue;
    articlesByCat[name] = cat.articles || [];
    (cat.articles || []).forEach(u => allUrls.add(u));
  }

  console.log(`Fetching ${allUrls.size} articles...`);

  const articles = {};
  let i = 0;
  for (const url of allUrls) {
    i++;
    process.stdout.write(`[${i}/${allUrls.size}] ${url.split('/').pop().padEnd(6)} `);
    try {
      const html = await get(url);
      const art = extractNuxtArticle(html);
      if (art) {
        const content = htmlToMarkdown(art.content || '');
        articles[url] = {
          id: art.id,
          title: art.name || '',
          category: art.category ? art.category.name : '',
          content,
          url
        };
        process.stdout.write(`OK "${articles[url].title.slice(0, 50)}" (${content.length})\n`);
      } else {
        process.stdout.write(`NO_ART\n`);
        articles[url] = { error: 'no_article', url };
      }
    } catch (e) {
      process.stdout.write(`ERR: ${e.message}\n`);
      articles[url] = { error: e.message, url };
    }
    await sleep(150);
  }

  // Build structured KB
  const kb = {};
  for (const [catName, urls] of Object.entries(articlesByCat)) {
    kb[catName] = urls
      .map(u => articles[u])
      .filter(a => a && a.content && a.content.length > 50);
  }

  fs.writeFileSync('scripts/articles_content.json', JSON.stringify(articles, null, 2));
  fs.writeFileSync('scripts/kb_structured.json', JSON.stringify(kb, null, 2));

  // Print summary
  console.log('\n=== SUMMARY ===');
  for (const [cat, arts] of Object.entries(kb)) {
    console.log(`  ${cat}: ${arts.length} articles`);
    arts.forEach(a => console.log(`    - ${a.title}`));
  }
  const ok = Object.values(articles).filter(a => a.content).length;
  const fail = Object.values(articles).filter(a => a.error).length;
  console.log(`\nTotal: ${ok} OK, ${fail} failed`);
}

main().catch(console.error);
