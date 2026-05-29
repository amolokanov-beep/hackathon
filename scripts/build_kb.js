// Build structured knowledge base from extracted articles
const fs = require('fs');

const kb = JSON.parse(fs.readFileSync('scripts/kb_structured.json'));

// Categories relevant for "entities you can create"
const ENTITY_CATS = [
  'Триггерные сообщения',
  'Цепочки сообщений',
  'Чат-боты',
  'Email-рассылки',
  'Автоматизация',
  'Сбор данных',
  'Посетители',
  'Диалоги',
  'Сценарии',
  'База знаний',
  'Основы',
];

let md = `# База знаний Carrot Quest — Сущности и инструменты администратора

Источник: https://help.carrotquest.io/
Дата парсинга: ${new Date().toISOString().slice(0, 10)}
Статей: 121 (11 разделов)

---

`;

for (const catName of ENTITY_CATS) {
  const articles = kb[catName];
  if (!articles || articles.length === 0) continue;

  md += `## ${catName}\n\n`;

  for (const art of articles) {
    md += `### ${art.title}\n`;
    md += `URL: ${art.url}\n\n`;
    // Truncate very long articles to ~2000 chars to keep file manageable
    const content = art.content.length > 2500
      ? art.content.slice(0, 2500) + '\n\n[...статья продолжается...]'
      : art.content;
    md += content + '\n\n---\n\n';
  }
}

fs.writeFileSync('knowledge/cq_help_kb.md', md);
console.log('Written knowledge/cq_help_kb.md:', md.length, 'chars');

// Also write a compact summary version (just titles + first 400 chars per article)
let summary = `# CQ Admin Panel — Краткий справочник сущностей\n\n`;

// Entity map: what can you CREATE in CQ admin panel
summary += `## Что можно создать в admin-панели Carrot Quest\n\n`;

const ENTITY_MAP = {
  'Триггерные сообщения': ['поп-ап', 'триггерный email', 'триггерный webhook', 'JS-сообщение', 'web push уведомление', 'A/B-тест'],
  'Цепочки сообщений': ['цепочка сообщений', 'логические блоки (условие/действие/задержка/цель)'],
  'Чат-боты': ['лид-бот', 'welcome-бот', 'Facebook Messenger бот', 'A/B-тест для лид-ботов'],
  'Email-рассылки': ['ручная email-рассылка', 'конструктор писем'],
  'Автоматизация': ['воронка', 'шаблон сообщения', 'цель', 'связанный сценарий'],
  'Сбор данных': ['событие', 'свойство пользователя', 'CSS-селектор', 'форма сбора данных'],
  'Посетители': ['сегмент', 'тег', 'импорт пользователей'],
  'Диалоги': ['настройка чата', 'сохранённый ответ', 'шаблон WhatsApp', 'правило распределения'],
  'База знаний': ['статья базы знаний', 'раздел базы знаний'],
};

for (const [cat, entities] of Object.entries(ENTITY_MAP)) {
  summary += `**${cat}:** ${entities.join(', ')}\n\n`;
}

summary += '\n---\n\n';
summary += `## Детали по категориям\n\n`;

for (const catName of ENTITY_CATS) {
  const articles = kb[catName];
  if (!articles || articles.length === 0) continue;

  summary += `### ${catName}\n\n`;
  for (const art of articles) {
    const preview = art.content.replace(/\n+/g, ' ').slice(0, 350).trim();
    summary += `**${art.title}**\n${preview}...\n\n`;
  }
  summary += '---\n\n';
}

fs.writeFileSync('knowledge/cq_entities_summary.md', summary);
console.log('Written knowledge/cq_entities_summary.md:', summary.length, 'chars');
