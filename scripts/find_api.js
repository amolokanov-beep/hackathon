// Find API endpoints in Nuxt bundles
const https = require('https');

function get(url) {
  return new Promise((res, rej) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
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

async function main() {
  // Fetch main page HTML
  console.log('Fetching main page...');
  const main = await get('https://help.carrotquest.io/');
  console.log('Main HTML length:', main.body.length);
  console.log('\n--- Raw HTML (first 3000) ---');
  console.log(main.body.slice(0, 3000));

  // Look for API URLs, data endpoints, state
  const apiPatterns = [
    /api[a-z0-9._-]*\.[a-z]{2,}\/[a-z0-9_/-]*/gi,
    /\/api\/[a-z0-9/_-]+/gi,
    /"(https?:\/\/[^"]+\/articles?[^"]*?)"/gi,
    /window\.__[A-Z_]+\s*=/g,
    /nuxtState/g,
    /__NUXT__/g,
    /fetch\(['"`]([^'"`]+)['"`]/g
  ];

  apiPatterns.forEach((re, i) => {
    const matches = [];
    let m;
    const src = main.body;
    re.lastIndex = 0;
    while ((m = re.exec(src)) !== null) {
      matches.push(m[0].slice(0, 100));
      if (matches.length > 5) break;
    }
    if (matches.length > 0) console.log(`Pattern ${i}:`, matches);
  });

  // Check for sitemap
  console.log('\n--- Checking sitemap.xml ---');
  try {
    const sm = await get('https://help.carrotquest.io/sitemap.xml');
    console.log('Sitemap status:', sm.status, 'length:', sm.body.length);
    if (sm.status === 200) console.log(sm.body.slice(0, 2000));
  } catch (e) { console.log('No sitemap:', e.message); }

  // Check one article URL directly - look at raw HTML
  console.log('\n--- Article HTML (195) ---');
  const art = await get('https://help.carrotquest.io/article/195');
  console.log('Article HTML length:', art.body.length);
  console.log(art.body.slice(0, 2000));
}

main().catch(console.error);
