require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

if (!process.env.GROQ_API_KEY) {
  console.error('✗ GROQ_API_KEY не задан. Добавь его в .env (см. .env.example)');
  process.exit(1);
}

const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// ─── Промпты грузятся из prompts/ ────────────────────────────────────────────
const PROMPTS_DIR = path.join(__dirname, 'prompts');

function loadPrompt(filename) {
  const filePath = path.join(PROMPTS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`✗ Промпт не найден: ${filePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, 'utf-8').trim();
}

const SYSTEM_PROMPT_SITE_ANALYSIS = loadPrompt('site_analysis.md');
const SYSTEM_PROMPT_RECOMMENDATIONS = loadPrompt('recommendations.md');

// ─── Утилиты ─────────────────────────────────────────────────────────────────

async function fetchSiteText(url) {
  if (!url) return '';
  let target = url.trim();
  if (!/^https?:\/\//i.test(target)) target = 'https://' + target;
  try {
    const response = await fetch(target, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CQAdvisor/1.0)' },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });
    if (!response.ok) {
      console.warn(`Site fetch ${target} → HTTP ${response.status}`);
      return '';
    }
    const html = await response.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.slice(0, 5000);
  } catch (err) {
    console.warn('Site fetch failed:', err.message);
    return '';
  }
}

async function parsePdfBuffer(buffer) {
  try {
    const data = await pdfParse(buffer);
    return (data.text || '').slice(0, 6000);
  } catch (err) {
    console.warn('PDF parse failed:', err.message);
    return '';
  }
}

function cleanJsonString(raw) {
  return raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
}

async function callOpenAI(systemPrompt, userContent, { label } = {}) {
  const t0 = Date.now();
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  });
  console.log(`✓ LLM ${label || ''} (${MODEL}) → ${Date.now() - t0}ms`);
  return JSON.parse(cleanJsonString(completion.choices[0].message.content));
}

async function callLLM(systemPrompt, userPayload, opts = {}) {
  const userContent = typeof userPayload === 'string'
    ? userPayload
    : JSON.stringify(userPayload, null, 2);
  return callOpenAI(systemPrompt, userContent, opts);
}

// ─── 1. Активные цепочки из CQ API ───────────────────────────────────────────
app.get('/api/cq/chains', async (req, res) => {
  const { app_id, user_id, token } = req.query;

  if (!app_id || !user_id || !token) {
    return res.status(400).json({ error: 'Нужны параметры: app_id, user_id, token' });
  }

  try {
    const url = `https://api-panel.carrotquest.io/v3/trigger_chains?active=true&app=${app_id}&id_as_string=true&request_app=${app_id}&request_django_user=${user_id}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (!response.ok) {
      return res.status(response.status).json({ error: `CQ API вернул ${response.status}` });
    }

    const data = await response.json();
    const chains = (data.data || []).map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      active: c.active,
      created: c.created,
      stats: {
        sent: c.stats?.messages_sent ?? 0,
        conversions: c.stats?.conversions ?? 0,
        conversion_rate: c.stats?.conversion_rate ?? 0,
      },
    }));

    res.json({ chains, total: chains.length });
  } catch (err) {
    console.error('CQ fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── 2. Двухэтапный анализ ───────────────────────────────────────────────────
const analyzeFields = upload.fields([
  { name: 'metrika_pdf', maxCount: 1 },
  { name: 'transcript_txt', maxCount: 1 },
]);

// Только этап 1 — анализ сайта. Удобно для отладки промпта.
app.post('/api/analyze-site', async (req, res) => {
  try {
    const { site_url = '' } = req.body;
    if (!site_url) return res.status(400).json({ success: false, error: 'site_url обязателен' });

    const site_content = await fetchSiteText(site_url);
    const siteAnalysis = await callLLM(
      SYSTEM_PROMPT_SITE_ANALYSIS,
      { site_url, site_content },
      { label: 'site-analysis' },
    );

    res.json({ success: true, data: siteAnalysis });
  } catch (err) {
    console.error('Site analysis error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Полный пайплайн: этап 1 (анализ сайта) → этап 2 (рекомендации).
app.post('/api/analyze', analyzeFields, async (req, res) => {
  try {
    const { site_url = '', goal = '', crm = '', team_size = '' } = req.body;

    const metrikaFile = req.files?.metrika_pdf?.[0];
    const transcriptFile = req.files?.transcript_txt?.[0];

    const [site_content, metrikaText] = await Promise.all([
      fetchSiteText(site_url),
      metrikaFile ? parsePdfBuffer(metrikaFile.buffer) : Promise.resolve(''),
    ]);

    const transcriptText = transcriptFile
      ? transcriptFile.buffer.toString('utf-8').slice(0, 6000)
      : '';

    // ── Этап 1: анализ сайта ──
    const siteAnalysis = await callLLM(
      SYSTEM_PROMPT_SITE_ANALYSIS,
      { site_url, site_content },
      { label: 'site-analysis' },
    );

    // ── Этап 2: рекомендации ──
    const userPayloadStage2 = {
      site_analysis: siteAnalysis,
      meeting_notes: {
        goal: goal || null,
        crm: crm || null,
        team_size: team_size || null,
        transcript: transcriptText || null,
      },
      yandex_metrika_pdf_text: metrikaText || null,
    };

    const recommendations = await callLLM(
      SYSTEM_PROMPT_RECOMMENDATIONS,
      userPayloadStage2,
      { label: 'recommendations' },
    );

    // Алиас для фронта: новый промпт возвращает top_scenarios, фронт ждёт scenarios.
    if (recommendations.top_scenarios && !recommendations.scenarios) {
      recommendations.scenarios = recommendations.top_scenarios;
    }

    res.json({ success: true, data: recommendations, site_analysis: siteAnalysis });
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── 3. Healthcheck ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ─── 4. Корень ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ─── Listen с fallback по порту ──────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);

function start(port, attemptsLeft = 10) {
  const server = app.listen(port, () => {
    console.log(`✓ CQ Advisor запущен: http://localhost:${port}  (model: ${MODEL})`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.warn(`⚠ Порт ${port} занят — пробую ${port + 1}`);
      start(port + 1, attemptsLeft - 1);
    } else {
      console.error(err);
      process.exit(1);
    }
  });
}

// Локально — запускаем сервер; на Vercel — экспортируем app как serverless handler
if (require.main === module) {
  start(PORT);
}

module.exports = app;
