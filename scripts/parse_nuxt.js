// Extract content from Nuxt SSR state (window.__NUXT__)
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

function extractNuxtState(html) {
  // Find window.__NUXT__=(...)
  const match = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
  if (!match) return null;
  try {
    // The state uses undefined literals which JSON.parse can't handle - use eval-safe approach
    const raw = match[1];
    // Replace undefined with null for parsing
    const cleaned = raw.replace(/\bundefined\b/g, 'null');
    return JSON.parse(cleaned);
  } catch (e) {
    // Try to extract just the data portion
    return { raw: match[1].slice(0, 5000) };
  }
}

function htmlToText(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ').trim();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  // Test with a few articles first
  const testUrls = [
    'https://help.carrotquest.io/article/195',
    'https://help.carrotquest.io/article/196',
    'https://help.carrotquest.io/article/185',
  ];

  for (const url of testUrls) {
    console.log('\n=== Fetching:', url);
    const r = await get(url);
    console.log('HTML length:', r.body.length);

    // Extract title
    const titleMatch = r.body.match(/<title[^>]*>([^<]+)<\/title>/i);
    console.log('Title:', titleMatch ? titleMatch[1] : 'none');

    // Try __NUXT__ state
    const state = extractNuxtState(r.body);
    if (state) {
      console.log('NUXT state keys:', state ? Object.keys(state).join(', ') : 'none');
      // Look for article content in state
      const stateStr = JSON.stringify(state);
      // Find content field
      const contentMatch = stateStr.match(/"content"\s*:\s*"([^"]{100,})/);
      if (contentMatch) console.log('Content found! Length:', contentMatch[1].length, 'Preview:', contentMatch[1].slice(0, 200));
      // Look for body/text fields
      const bodyMatch = stateStr.match(/"body"\s*:\s*"([^"]{100,})/);
      if (bodyMatch) console.log('Body found! Length:', bodyMatch[1].length, 'Preview:', bodyMatch[1].slice(0, 200));
      // Find all string values > 200 chars
      const longStrings = stateStr.match(/"[^"]{200,}"/g);
      if (longStrings) {
        console.log('Long strings count:', longStrings.length);
        longStrings.slice(0, 3).forEach(s => console.log(' - ', s.slice(0, 300)));
      }
    } else {
      console.log('No __NUXT__ state found');
      // Look for content in raw HTML
      // Find the main content div
      const mainContent = r.body.match(/class="[^"]*article-content[^"]*"[^>]*>([\s\S]{200,}?)<\/div>/i);
      if (mainContent) console.log('Found article-content class!');
    }

    // Look for JSON data embedded differently
    const jsonMatches = r.body.match(/\{[^{}]{500,}\}/g);
    if (jsonMatches) console.log('Large JSON blocks:', jsonMatches.length);

    await sleep(500);
  }
}

main().catch(console.error);
