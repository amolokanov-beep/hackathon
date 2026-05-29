// Extract article content by evaluating window.__NUXT__ IIFE
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
    req.setTimeout(15000, () => { req.destroy(); rej(new Error('timeout: ' + url)); });
  });
}

function extractNuxtData(html) {
  // Extract the IIFE: window.__NUXT__=(function(...){return {...}})(...);
  const match = html.match(/window\.__NUXT__\s*=\s*(\(function[\s\S]+?\)\s*\([^)]+\));?\s*<\/script>/);
  if (!match) return null;
  try {
    const ctx = { result: null };
    vm.runInNewContext(`result = ${match[1]}`, ctx, { timeout: 3000 });
    return ctx.result;
  } catch (e) {
    return { parseError: e.message, raw: match[1].slice(0, 500) };
  }
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

  // Key categories for admin panel entities
  const KEY_CAT_IDS = [23, 4836, 4839, 2668, 21, 24, 25, 26, 22, 56, 29];
  const KEY_CAT_NAMES = {
    23: 'Автоматизация', 4836: 'Триггерные сообщения', 4839: 'Цепочки сообщений',
    2668: 'Чат-боты', 21: 'Email-рассылки', 24: 'Сбор данных',
    25: 'Посетители', 26: 'Диалоги', 22: 'Сценарии', 56: 'База знаний', 29: 'Основы'
  };

  // Collect all article URLs
  const articlesByCat = {};
  const allUrls = new Set();
  for (const id of KEY_CAT_IDS) {
    const cat = cats[id];
    if (!cat || cat.error) continue;
    articlesByCat[KEY_CAT_NAMES[id]] = cat.articles || [];
    (cat.articles || []).forEach(u => allUrls.add(u));
  }

  console.log(`Total unique articles: ${allUrls.size}`);

  // Fetch and extract all articles
  const articles = {};
  let i = 0;
  for (const url of allUrls) {
    i++;
    process.stdout.write(`[${i}/${allUrls.size}] ${url.split('/').pop()} ... `);
    try {
      const html = await get(url);
      const data = extractNuxtData(html);
      if (data && data.data && data.data[0] && data.data[0].article) {
        const art = data.data[0].article;
        const content = htmlToMarkdown(art.content || '');
        articles[url] = {
          id: art.id,
          title: art.name || art.title || '',
          category: art.category ? art.category.name : '',
          content,
          url
        };
        process.stdout.write(`OK "${articles[url].title}" (${content.length} chars)\n`);
      } else if (data && data.parseError) {
        // Try to extract directly from HTML title + content
        const titleM = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        process.stdout.write(`PARSE_ERR: ${data.parseError.slice(0, 60)}\n`);
        articles[url] = { error: data.parseError, url, title: titleM ? titleM[1] : '' };
      } else {
        process.stdout.write(`NO DATA\n`);
        articles[url] = { error: 'no_data', url };
      }
    } catch (e) {
      process.stdout.write(`ERROR: ${e.message}\n`);
      articles[url] = { error: e.message, url };
    }
    await sleep(150);
  }

  // Save raw
  fs.writeFileSync('scripts/articles_content.json', JSON.stringify(articles, null, 2));

  // Build structured knowledge base grouped by category
  const kb = {};
  for (const [catName, urls] of Object.entries(articlesByCat)) {
    kb[catName] = urls.map(u => articles[u]).filter(a => a && a.content && a.content.length > 50);
  }

  fs.writeFileSync('scripts/kb_structured.json', JSON.stringify(kb, null, 2));

  // Print summary
  console.log('\n=== SUMMARY ===');
  let totalOk = 0, totalFail = 0;
  for (const [cat, arts] of Object.entries(kb)) {
    console.log(`${cat}: ${arts.length} articles with content`);
    totalOk += arts.length;
  }
  const failed = Object.values(articles).filter(a => a.error).length;
  console.log(`\nTotal OK: ${totalOk}, Failed/empty: ${failed}`);
}

main().catch(console.error);
