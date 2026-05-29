// Phase 3: fetch articles from key categories
const https = require('https');
const fs = require('fs');

function get(url) {
  return new Promise((res, rej) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'ru,en;q=0.9'
      }
    }, r => {
      if ((r.statusCode === 301 || r.statusCode === 302) && r.headers.location) {
        return get(r.headers.location).then(res).catch(rej);
      }
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res({ status: r.statusCode, body: d }));
    });
    req.on('error', rej);
    req.setTimeout(15000, () => { req.destroy(); rej(new Error('timeout')); });
  });
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, l, c) => '\n' + '#'.repeat(+l) + ' ' + c.replace(/<[^>]+>/g, '').trim() + '\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, c) => '\n- ' + c.replace(/<[^>]+>/g, '').trim())
    .replace(/<td[^>]*>([\s\S]*?)<\/td>/gi, (_, c) => ' | ' + c.replace(/<[^>]+>/g, '').trim())
    .replace(/<tr[^>]*>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, c) => '**' + c.replace(/<[^>]+>/g, '') + '**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, (_, c) => '**' + c.replace(/<[^>]+>/g, '') + '**')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n').trim();
}

function extractTitle(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (m) return m[1].replace(/<[^>]+>/g, '').trim();
  const m2 = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m2 ? m2[1].replace(' | База знаний', '').trim() : '';
}

// Extract article content (main article body)
function extractArticleContent(html) {
  // Try to find article main content area
  let content = html;
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    || html.match(/class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section)>/i)
    || html.match(/class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (articleMatch) content = articleMatch[1];
  return htmlToText(content);
}

function extractArticleLinks(html) {
  const links = new Set();
  const re = /href="(\/article\/[^"#?]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    links.add('https://help.carrotquest.io' + m[1]);
  }
  return [...links];
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Key categories for admin panel entities
const KEY_CATEGORIES = [
  { id: 23, name: 'Автоматизация' },
  { id: 4836, name: 'Триггерные сообщения' },
  { id: 4839, name: 'Цепочки сообщений' },
  { id: 2668, name: 'Чат-боты' },
  { id: 21, name: 'Email-рассылки' },
  { id: 24, name: 'Сбор данных о пользователях' },
  { id: 25, name: 'Посетители' },
  { id: 26, name: 'Диалоги' },
  { id: 22, name: 'Часто настраиваемые сценарии' },
  { id: 56, name: 'База знаний' },
  { id: 29, name: 'Основы' },
];

async function main() {
  // Load categories data
  const cats = JSON.parse(fs.readFileSync('scripts/categories.json'));

  // Collect all article URLs from key categories
  const articlesByCategory = {};

  for (const cat of KEY_CATEGORIES) {
    const catData = cats[cat.id];
    if (!catData || catData.error) continue;
    articlesByCategory[cat.name] = catData.articles;
    console.log(`Category "${cat.name}": ${catData.articles.length} articles`);
  }

  // Fetch all unique articles
  const allUrls = new Set();
  for (const articles of Object.values(articlesByCategory)) {
    articles.forEach(a => allUrls.add(a));
  }

  console.log(`\nTotal unique articles to fetch: ${allUrls.size}`);

  const fetched = {};
  let i = 0;
  for (const url of allUrls) {
    i++;
    process.stdout.write(`[${i}/${allUrls.size}] ${url.split('/').pop()} ... `);
    try {
      const r = await get(url);
      const title = extractTitle(r.body);
      const content = extractArticleContent(r.body);
      fetched[url] = { title, content, url };
      process.stdout.write(`OK (${content.length} chars)\n`);
    } catch (e) {
      process.stdout.write(`ERROR: ${e.message}\n`);
      fetched[url] = { error: e.message, url };
    }
    await sleep(200);
  }

  // Save raw articles
  fs.writeFileSync('scripts/articles_raw.json', JSON.stringify(fetched, null, 2));

  // Build structured output by category
  const structured = {};
  for (const [catName, articleUrls] of Object.entries(articlesByCategory)) {
    structured[catName] = [];
    for (const url of articleUrls) {
      const art = fetched[url];
      if (art && !art.error) {
        structured[catName].push({ title: art.title, url: art.url, content: art.content.slice(0, 3000) });
      }
    }
  }

  fs.writeFileSync('scripts/articles_structured.json', JSON.stringify(structured, null, 2));
  console.log('\nSaved articles_raw.json and articles_structured.json');
}

main().catch(console.error);
