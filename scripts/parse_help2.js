// Phase 2: fetch all categories and their articles
const https = require('https');
const fs = require('fs');

function get(url) {
  return new Promise((res, rej) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
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
    req.setTimeout(15000, () => { req.destroy(); rej(new Error('timeout: ' + url)); });
  });
}

function extractText(html) {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, l, c) => '\n' + '#'.repeat(+l) + ' ' + c.replace(/<[^>]+>/g, '') + '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    || html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}

function extractArticleLinks(html) {
  const links = new Set();
  // article links like /article/NNN
  const re = /href="(\/article\/[^"#?]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    links.add('https://help.carrotquest.io' + m[1]);
  }
  return [...links];
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const CATEGORIES = [
  { id: 29, name: 'unknown' }, { id: 25, name: 'unknown' }, { id: 26, name: 'unknown' },
  { id: 24, name: 'unknown' }, { id: 23, name: 'unknown' }, { id: 2668, name: 'unknown' },
  { id: 4836, name: 'unknown' }, { id: 4839, name: 'unknown' }, { id: 21, name: 'unknown' },
  { id: 5402, name: 'unknown' }, { id: 22, name: 'unknown' }, { id: 17, name: 'unknown' },
  { id: 18, name: 'unknown' }, { id: 56, name: 'unknown' }, { id: 20, name: 'unknown' },
  { id: 19, name: 'unknown' }, { id: 2973, name: 'unknown' }
];

async function main() {
  const result = {};

  for (const cat of CATEGORIES) {
    const url = `https://help.carrotquest.io/category/${cat.id}`;
    console.log('Fetching category', cat.id, '...');
    try {
      const r = await get(url);
      const title = extractTitle(r.body);
      const articles = extractArticleLinks(r.body);
      const text = extractText(r.body);
      result[cat.id] = { title, articleCount: articles.length, articles, preview: text.slice(0, 500) };
      console.log(`  -> "${title}" | ${articles.length} articles`);
      await sleep(300);
    } catch (e) {
      console.log(`  -> ERROR: ${e.message}`);
      result[cat.id] = { error: e.message };
    }
  }

  fs.writeFileSync('scripts/categories.json', JSON.stringify(result, null, 2));
  console.log('\nSaved to scripts/categories.json');

  // Print summary
  console.log('\n=== CATEGORY SUMMARY ===');
  for (const [id, data] of Object.entries(result)) {
    if (!data.error) {
      console.log(`[${id}] "${data.title}" - ${data.articleCount} articles`);
    }
  }
}

main().catch(console.error);
