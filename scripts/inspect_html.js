// Inspect the actual HTML structure to find content
const https = require('https');

function get(url) {
  return new Promise((res, rej) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' }
    }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(d));
    });
    req.on('error', rej);
    req.setTimeout(15000, () => { req.destroy(); rej(new Error('timeout')); });
  });
}

async function main() {
  const html = await get('https://help.carrotquest.io/article/196');

  // Find all script tags content
  const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  console.log('Script tags found:', scripts.length);

  // Find the large JSON block (the one > 500 chars)
  scripts.forEach((s, i) => {
    if (s.length > 1000) {
      console.log(`\n--- Script ${i} (${s.length} chars) ---`);
      console.log(s.slice(0, 2000));
    }
  });

  // Also look for data-* attributes with content
  const dataAttrs = html.match(/data-[a-z-]+=["'][^"']{50,}["']/g) || [];
  if (dataAttrs.length > 0) {
    console.log('\nData attributes with content:');
    dataAttrs.slice(0, 5).forEach(a => console.log(a.slice(0, 200)));
  }

  // Find text content in specific divs
  const divContent = html.match(/<div[^>]+>([\s\S]{500,}?)<\/div>/g) || [];
  console.log('\nLarge div blocks:', divContent.length);
  divContent.slice(0, 3).forEach(d => {
    const textOnly = d.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (textOnly.length > 200) console.log('DIV TEXT:', textOnly.slice(0, 400));
  });
}

main().catch(console.error);
