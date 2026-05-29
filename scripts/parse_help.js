// Script to parse help.carrotquest.io and extract CQ entity documentation
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
      if (r.statusCode === 301 || r.statusCode === 302) {
        return get(r.headers.location).then(res).catch(rej);
      }
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res({ status: r.statusCode, body: d }));
    });
    req.on('error', rej);
    req.setTimeout(10000, () => { req.destroy(); rej(new Error('timeout')); });
  });
}

function extractLinks(html, base) {
  const links = new Set();
  const re = /href="(https?:\/\/help\.carrotquest\.io[^"#?]*)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    links.add(m[1]);
  }
  // Also relative links
  const re2 = /href="(\/[^"#?]+)"/g;
  while ((m = re2.exec(html)) !== null) {
    links.add('https://help.carrotquest.io' + m[1]);
  }
  return [...links];
}

function extractText(html) {
  // Remove scripts, styles, nav, header, footer
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '');
  // Convert block elements to newlines
  text = text
    .replace(/<h[1-6][^>]*>/gi, '\n### ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
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
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : 'No title';
}

async function main() {
  console.log('Step 1: Fetching main page...');
  const main = await get('https://help.carrotquest.io/');
  const allLinks = extractLinks(main.body, 'https://help.carrotquest.io');
  console.log('Found links on main page:', allLinks.length);

  // Keywords to find entity-related pages
  const entityKeywords = [
    'avtosoobshchen', 'trigger', 'tsepochk', 'bot', 'pop', 'email', 'push',
    'segment', 'lead', 'baza-znanii', 'chat', 'trigg', 'welcome',
    'sozdanie', 'nastrojk', 'instrument', 'kanal', 'soobshchen',
    'avtomati', 'rassylk', 'stsenary', 'sozdanie', 'formy',
    'sozdaniye', 'webhook', 'integr', 'api'
  ];

  const relevantLinks = allLinks.filter(l => {
    const lc = l.toLowerCase();
    return entityKeywords.some(kw => lc.includes(kw));
  });

  console.log('Relevant entity links:', relevantLinks.length);
  console.log(relevantLinks.slice(0, 30));

  // Also get sitemap or navigation structure
  fs.writeFileSync('scripts/all_links.json', JSON.stringify(allLinks, null, 2));
  fs.writeFileSync('scripts/relevant_links.json', JSON.stringify(relevantLinks, null, 2));

  console.log('\nSaved links to scripts/');
}

main().catch(console.error);
