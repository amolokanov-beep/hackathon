// screens.jsx — Rail (left stepper) + the five onboarding screens

const RAIL_STEPS = [
  { t: "Сайт", d: "Адрес вашего проекта" },
  { t: "Цель", d: "Главная задача" },
  { t: "Метрика", d: "Данные о трафике" },
  { t: "Готово", d: "AI-рекомендации" },
];
// content screen index → rail node index (analysis(3) maps onto "Готово" running)
const RAIL_MAP = [0, 1, 2, 3, 3];

function Rail({ step, progress }) {
  const railIdx = RAIL_MAP[step];
  const total = RAIL_STEPS.length;
  const pct = Math.round(((railIdx + (step === 3 ? 0 : 1)) / total) * 100);

  let progressNode;
  if (progress === "bar") {
    progressNode = (
      <div className="ob-railbar">
        <div className="track"><div className="fill" style={{ width: pct + "%" }}></div></div>
        <div className="pct"><b>{pct}%</b> готово · шаг {Math.min(railIdx + 1, total)} из {total}</div>
      </div>
    );
  } else if (progress === "dots") {
    progressNode = (
      <React.Fragment>
        <div className="ob-raildots">
          {RAIL_STEPS.map((s, i) => (
            <div key={i} className={"dot" + (i < railIdx ? " done" : i === railIdx ? " active" : "")}></div>
          ))}
        </div>
        <div className="ob-raildots-lbl">{RAIL_STEPS[railIdx].t} <span>· {RAIL_STEPS[railIdx].d}</span></div>
      </React.Fragment>
    );
  } else {
    progressNode = (
      <div className="ob-steps">
        {RAIL_STEPS.map((s, i) => {
          const state = i < railIdx ? "done" : i === railIdx ? "active" : "todo";
          return (
            <div key={i} className={"ob-step " + state}>
              <div className="line"></div>
              <div className="num">{state === "done" ? <Icon name="check" size={15} stroke={2.6} /> : i + 1}</div>
              <div className="stxt">
                <div className="stitle">{s.t}</div>
                <div className="sdesc">{s.d}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <aside className="ob-rail">
      <div className="ob-rail-bg"></div>
      <div className="ob-rail-logo"><img src={(window.__resources && window.__resources.logo) || "../assets/logo-white.svg"} alt="Carrot quest" /></div>
      <div className={"ob-rail-kicker" + (step >= 3 ? " muted" : "")}>{step >= 3 ? "Почти готово" : "Настройка под вас"}</div>
      <div className="ob-rail-head">Подберём сценарии под ваш бизнес за пару минут</div>
      {progressNode}
      <div className="ob-rail-foot">
        <div className="ob-rail-quote">«Запустили первый сценарий в день регистрации — он принёс лиды уже к вечеру».</div>
        <div className="ob-rail-by">
          <div className="av">М</div>
          <div className="nm"><b>Марина Котова</b> · рост в Authentica</div>
        </div>
      </div>
    </aside>
  );
}

/* ── Screen 0: site ── */
function ScreenSite({ site, setSite, next }) {
  const valid = site.trim().length > 2 && site.includes(".");
  return (
    <div className="ob-content ob-anim" key="s0">
      <div className="ob-eyebrow">Шаг 1 · Сайт</div>
      <h1 className="ob-h">Укажите адрес вашего сайта</h1>
      <p className="ob-sub">Мы изучим его и подберём сценарии именно под ваш бизнес — без шаблонных советов.</p>
      <div style={{ marginTop: 28 }}>
        <div className="ob-field-lbl">Адрес сайта</div>
        <div className="ob-input">
          <Icon name="globe" size={19} style={{ color: "var(--accent)" }} />
          <span className="pre">https://</span>
          <input
            value={site} onChange={(e) => setSite(e.target.value)}
            placeholder="myshop.ru" autoFocus spellCheck="false"
            onKeyDown={(e) => { if (e.key === "Enter" && valid) next(); }}
          />
        </div>
        <div className="ob-hint">Введите домен без https:// — например, myshop.ru</div>
      </div>
      <div className="ob-actions">
        <button className="ob-btn ob-btn--p" disabled={!valid} onClick={next}>
          Продолжить <Icon name="arrow" size={18} />
        </button>
        <button className="ob-btn ob-btn--ghost" onClick={next}>Пропустить этот шаг</button>
      </div>
    </div>
  );
}

/* ── Screen 1: goal ── */
const GOALS = [
  { id: "leads", icon: "target", t: "Собирать больше лидов с сайта", d: "Поп-апы, лид-боты и формы захвата контактов" },
  { id: "support", icon: "message", t: "Поддерживать клиентов в чате", d: "Быстрые ответы, AI-агент и база знаний" },
  { id: "retention", icon: "repeat", t: "Возвращать и удерживать клиентов", d: "Рассылки в email, Telegram и реактивация" },
  { id: "sales", icon: "zap", t: "Автоматизировать продажи", d: "Цепочки, квалификация лидов и CRM" },
];

function ScreenGoal({ goal, setGoal, next }) {
  return (
    <div className="ob-content ob-anim" key="s1">
      <div className="ob-eyebrow">Шаг 2 · Цель</div>
      <h1 className="ob-h">С чего хотите начать?</h1>
      <p className="ob-sub">Выберите главную задачу — с неё и начнём. Остальное подключим позже.</p>
      <div className="ob-opts">
        {GOALS.map((g) => (
          <button key={g.id} className={"ob-opt" + (goal === g.id ? " sel" : "")} onClick={() => setGoal(g.id)}>
            <div className="ob-opt-ico"><Icon name={g.icon} size={20} /></div>
            <div>
              <div className="ob-opt-t">{g.t}</div>
              <div className="ob-opt-d">{g.d}</div>
            </div>
            <div className="ob-opt-check"><Icon name="check" size={13} stroke={3} /></div>
          </button>
        ))}
      </div>
      <div className="ob-actions">
        <button className="ob-btn ob-btn--p" disabled={!goal} onClick={next}>
          Продолжить <Icon name="arrow" size={18} />
        </button>
      </div>
    </div>
  );
}

/* ── Screen 2: Yandex Metrica (PDF upload) ── */
function ScreenMetrica({ file, setFile, next }) {
  const inputRef = React.useRef(null);
  const onPick = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) setFile(f);
  };
  const fileLabel = file ? file.name : null;

  return (
    <div className="ob-content ob-anim" key="s2">
      <div className="ob-eyebrow">Шаг 3 · Данные</div>
      <h1 className="ob-h">Загрузите выгрузку из Яндекс Метрики</h1>
      <p className="ob-sub">PDF-отчёт «Обзор» из кабинета Метрики. С реальными данными рекомендации будут точнее. Можно пропустить — AI обойдётся без них.</p>

      <div className="ob-mk">
        <div className="ob-mk-head">
          <div className="ob-mk-logo">Я</div>
          <div style={{ minWidth: 0 }}>
            <div className="ob-mk-name">Яндекс Метрика</div>
            <div className="ob-mk-note">{fileLabel || "PDF-отчёт «Обзор»: источники, устройства, топ-страницы"}</div>
          </div>
          {file && (
            <div className="ob-mk-status"><span className="dot"></span> Загружен</div>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={onPick}
        style={{ display: "none" }}
      />

      <div className="ob-actions">
        {!file ? (
          <React.Fragment>
            <button className="ob-btn ob-btn--p" onClick={() => inputRef.current && inputRef.current.click()}>
              <Icon name="link" size={18} />
              Выбрать PDF из Метрики
            </button>
            <button className="ob-btn ob-btn--ghost" onClick={next}>Пропустить — у меня нет PDF</button>
          </React.Fragment>
        ) : (
          <div className="ob-row">
            <button className="ob-btn ob-btn--p" onClick={next}>
              Продолжить <Icon name="arrow" size={18} />
            </button>
            <button className="ob-btn ob-btn--out" onClick={() => inputRef.current && inputRef.current.click()}>
              Заменить файл
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Screen 3: real analysis ── */
const ANALYZE_STEPS = [
  { ico: "search",   t: (s) => `Сканируем ${s}`,            s: "Извлекаем содержимое страницы" },
  { ico: "chart",    t: ()  => "Читаем данные Метрики",     s: "Парсим PDF, если он приложен" },
  { ico: "sparkles", t: ()  => "Подбираем сценарии",        s: "Сопоставляем с кейсами из вашей ниши" },
  { ico: "eye",      t: ()  => "Готовим рекомендации",      s: "Формируем итоговый отчёт" },
];

function ScreenAnalyze({ site, runAnalyze, error, next, retry }) {
  const [active, setActive] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const [localErr, setLocalErr] = React.useState(null);
  const startedRef = React.useRef(false);

  React.useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let alive = true;
    const tick = setInterval(() => {
      setActive((a) => (a < ANALYZE_STEPS.length - 1 ? a + 1 : a));
    }, 2200);

    runAnalyze()
      .then(() => {
        if (!alive) return;
        clearInterval(tick);
        setActive(ANALYZE_STEPS.length);
        setDone(true);
        setTimeout(() => alive && next(), 600);
      })
      .catch((e) => {
        if (!alive) return;
        clearInterval(tick);
        setLocalErr(e.message || String(e));
      });

    return () => { alive = false; clearInterval(tick); };
  }, []);

  const errMsg = localErr || error;

  return (
    <div className="ob-content ob-anim" key="s3">
      <div className="ob-analyze">
        <div className="ob-analyze-ico">
          {errMsg
            ? <Icon name="x" size={28} />
            : done
              ? <Icon name="check" size={28} stroke={3} />
              : <Icon name="sparkles" size={28} />}
        </div>
        <h1 className="ob-h" style={{ fontSize: "calc(var(--fz) * 1.7)" }}>
          {errMsg ? "Не получилось получить ответ" : done ? "Готово!" : "Анализируем ваш бизнес"}
        </h1>
        <p className="ob-sub" style={{ margin: "10px auto 0" }}>
          {errMsg
            ? errMsg
            : done
              ? "Сейчас покажем рекомендации."
              : "Это займёт 20–30 секунд. Подбираем сценарии, которые сработают первыми."}
        </p>
      </div>
      <div className="ob-rows">
        {ANALYZE_STEPS.map((st, i) => {
          const state = i < active ? "done" : i === active && !errMsg ? "run" : i < ANALYZE_STEPS.length && done ? "done" : "wait";
          return (
            <div key={i} className={"ob-arow " + state}>
              <div className="ob-arow-ico">
                {state === "done" ? <Icon name="check" size={17} stroke={2.6} />
                  : state === "run" ? <Icon name="loader" size={17} className="ob-spin" />
                  : <Icon name={st.ico} size={16} />}
              </div>
              <div>
                <div className="ob-arow-t">{st.t(site)}</div>
                <div className="ob-arow-s">{st.s}</div>
              </div>
            </div>
          );
        })}
      </div>
      {errMsg && (
        <div className="ob-actions">
          <button className="ob-btn ob-btn--p" onClick={retry}>
            Попробовать снова <Icon name="arrow" size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Screen 4: result rendered from real API response ── */
const GOAL_LABEL = { leads: "больше лидов", support: "поддержка в чате", retention: "удержание клиентов", sales: "автоматизация продаж" };

const TOOL_INSTRUCTIONS = {
  'лид-бот': {
    steps: [
      'Перейдите в раздел «Чат-боты» → «Лид-боты»',
      'Нажмите «Создать лид-бота», укажите название',
      'Выберите триггер запуска: URL, событие или свойство пользователя',
      'Настройте шаги диалога: вопросы, варианты ответов, ветвление',
      'Добавьте действия: запись свойства/тега/события, назначение на оператора',
      'Укажите аудиторию (кому показывать бота) и сохраните',
      'Активируйте бота — он будет запускаться по триггеру, а не при открытии чата',
    ],
    url: 'https://help.carrotquest.io/article/196',
  },
  'welcome-бот': {
    steps: [
      'Перейдите в «Чат-боты» → «Welcome-боты»',
      'Нажмите «Создать welcome-бота»',
      'Настройте приветственное сообщение: текст, кнопки, медиа-вложения',
      'Добавьте ветки сценария по нажатию каждой кнопки',
      'Welcome-бот запускается только когда посетитель сам открывает чат',
      'Сохраните и активируйте',
    ],
    url: 'https://help.carrotquest.io/article/199',
  },
  'поп-ап': {
    steps: [
      'Перейдите в «Триггерные сообщения» → «Создать» → тип «Поп-ап»',
      'Выберите размер: большой (центр экрана) или маленький (угол страницы)',
      'Добавьте блоки: заголовок, текст, изображение, кнопку или форму',
      'Настройте триггер: событие, URL, свойство пользователя или время на сайте',
      'Укажите аудиторию через фильтры и настройте частоту показа',
      'Задайте цель (конверсионное событие) и запустите',
    ],
    url: 'https://help.carrotquest.io/article/204',
  },
  'email': {
    steps: [
      'Перейдите в «Триггерные сообщения» → «Создать» → тип «Email»',
      'Настройте тему, имя отправителя и адрес ответа',
      'Создайте письмо в конструкторе или загрузите HTML-шаблон',
      'Укажите триггер отправки: событие или свойство пользователя',
      'Настройте задержку (мгновенно или через N часов/дней после триггера)',
      'Укажите аудиторию, запустите и отслеживайте статистику',
    ],
    url: 'https://help.carrotquest.io/article/222',
  },
  'цепочка': {
    steps: [
      'Перейдите в «Цепочки сообщений» → «Создать цепочку»',
      'Укажите стартовое событие — триггер запуска всей цепочки',
      'Добавляйте блоки: Фильтр аудитории, Задержка, Ожидание события, Действие, Сплит-тест',
      'В блоке «Действие» выберите канал: чат, email, поп-ап, webhook или push',
      'Настройте условия и тайминги каждого блока',
      'Задайте цель цепочки для отслеживания конверсии и активируйте',
    ],
    url: 'https://help.carrotquest.io/article/367',
  },
  'telegram': {
    steps: [
      'Убедитесь, что интеграция с Telegram подключена и модуль активирован',
      'Перейдите в «Триггерные сообщения» → «Создать» → тип «Telegram»',
      'Настройте текст сообщения, используйте переменные пользователя',
      'Укажите триггер: событие, URL или свойство пользователя',
      'Аудитория — только пользователи, подписанные на Telegram-бота CQ',
      'Сохраните и запустите',
    ],
    url: 'https://help.carrotquest.io/article/530',
  },
  'чат': {
    steps: [
      'Перейдите в «Триггерные сообщения» → «Создать» → тип «Чат»',
      'Введите текст сообщения (доступны переменные пользователя)',
      'Настройте триггер: событие, URL, свойство или время на странице',
      'Укажите задержку показа сообщения после срабатывания триггера',
      'Настройте аудиторию и условие повторного показа',
      'Сохраните и активируйте',
    ],
    url: 'https://help.carrotquest.io/article/204',
  },
  'сегмент': {
    steps: [
      'Перейдите в «Посетители» → «Сегменты» → «Создать сегмент»',
      'Добавьте фильтры: по событиям, свойствам, тегам или активности',
      'Комбинируйте фильтры через И / ИЛИ логику',
      'Дайте сегменту название и сохраните',
      'Используйте сегмент в условиях аудитории сообщений и цепочек',
    ],
    url: 'https://help.carrotquest.io/article/394',
  },
  'push': {
    steps: [
      'Перейдите в «Триггерные сообщения» → «Создать» → тип «Web Push»',
      'Введите заголовок и текст уведомления, добавьте иконку и URL перехода',
      'Настройте триггер и аудиторию',
      'Push работает только для пользователей, давших разрешение на уведомления',
      'Добавьте блок подписки на push на сайт для сбора базы подписчиков',
      'Сохраните и запустите',
    ],
    url: 'https://help.carrotquest.io/article/452',
  },
  'база знаний': {
    steps: [
      'Перейдите в раздел «База знаний» в admin-панели',
      'Создайте разделы для структурирования материала',
      'Нажмите «Создать статью», выберите раздел',
      'Напишите статью в редакторе (текст, изображения, видео)',
      'Опубликуйте — статьи становятся доступны через виджет чата',
      'Настройте подсказки из базы знаний в автоответах диалогов',
    ],
    url: 'https://help.carrotquest.io/article/526',
  },
  'a/b': {
    steps: [
      'При создании триггерного сообщения или лид-бота нажмите «Добавить A/B тест»',
      'Укажите процентное соотношение аудитории для вариантов A и B',
      'Настройте варианты: разный текст, оформление или логика срабатывания',
      'Задайте цель теста для автоматического определения победителя',
      'Дождитесь набора статистики и завершите тест, выбрав лучший вариант',
    ],
    url: 'https://help.carrotquest.io/article/204',
  },
  'воронка': {
    steps: [
      'Перейдите в «Автоматизация» → «Воронки» → «Создать воронку»',
      'Добавьте шаги воронки — события, которые проходит пользователь',
      'Настройте временные ограничения между шагами',
      'Задайте фильтры аудитории: сегмент, теги, свойства',
      'Используйте аналитику воронки для выявления точек оттока',
    ],
    url: 'https://help.carrotquest.io/article/540',
  },
  'webhook': {
    steps: [
      'Перейдите в «Триггерные сообщения» → «Создать» → тип «Webhook»',
      'Укажите URL вашего endpoint для приёма данных',
      'Выберите метод (POST/GET) и настройте заголовки запроса',
      'Добавьте тело запроса с переменными пользователя CQ',
      'Настройте триггер и аудиторию',
      'Используйте для интеграции с CRM, ERP или собственными системами',
    ],
    url: 'https://help.carrotquest.io/article/449',
  },
};

function getToolInstructions(toolName) {
  if (!toolName) return null;
  const t = toolName.toLowerCase();
  for (const [key, val] of Object.entries(TOOL_INSTRUCTIONS)) {
    if (t.includes(key)) return val;
  }
  for (const [key, val] of Object.entries(TOOL_INSTRUCTIONS)) {
    const words = key.split(/[-\s/]+/);
    if (words.some(w => w.length > 3 && t.includes(w))) return val;
  }
  return null;
}

function ScenarioCard({ sc, i }) {
  const [open, setOpen] = React.useState(false);
  const instr = getToolInstructions(sc.tool || '');
  return (
    <div className="ob-sc-outer">
      <div className="ob-sc-row">
        {instr && (
          <div className="ob-setup-col no-print">
            <button
              className={"ob-setup-btn" + (open ? " is-open" : "")}
              onClick={() => setOpen(v => !v)}
              title="Инструкция по настройке"
            >
              <span className="ob-setup-btn-icon">{open ? "▲" : "▼"}</span>
              <span>Настройка</span>
            </button>
          </div>
        )}
        <div className={"ob-sc" + (i === 0 ? " first" : "")} style={{ cursor: "default", flex: 1 }}>
          <div className="ob-sc-h">
            <div className="ob-sc-t">{sc.name}</div>
            <span className={"ob-sc-bdg " + (i === 0 ? "hot" : "cool")}>
              {i === 0 ? "Начать здесь" : (sc.funnel_stage || "Сценарий")}
            </span>
          </div>
          <div className="ob-sc-d">
            <b>Инструмент:</b> {sc.tool}<br />
            <b>Триггер:</b> {sc.trigger}
          </div>
          {sc.message_draft && (
            <div className="ob-sc-pre"><span>«{sc.message_draft}»</span></div>
          )}
          <div className="ob-sc-meta">
            <Icon name="clock" size={13} /> <b>{sc.setup_time || "—"}</b>
            {sc.expected_result && <span> · {sc.expected_result}</span>}
          </div>
        </div>
      </div>
      {open && instr && (
        <div className="ob-setup-panel no-print">
          <div className="ob-setup-title">Как настроить: {sc.tool}</div>
          <ol className="ob-setup-steps">
            {instr.steps.map((step, j) => (
              <li key={j}>{step}</li>
            ))}
          </ol>
          {instr.url && (
            <a className="ob-setup-link" href={instr.url} target="_blank" rel="noopener">
              Подробнее в базе знаний →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function ScreenResult({ site, goal, result, restart }) {
  const data = (result && result.data) || {};
  const siteAnalysis = (result && result.site_analysis) || {};

  const scenarios = data.scenarios || data.top_scenarios || [];
  const tools = data.top_tools || [];
  const profile = data.client_profile || "";
  const firstStep = data.first_step || "";

  const segment = siteAnalysis.segment || data.segment || "";
  const segmentLabel = ({
    b2b_saas: "B2B SaaS",
    online_school: "EdTech",
    real_estate: "недвижимость",
    ecommerce: "e-commerce",
    services: "услуги",
    other: "",
  })[segment] || "";

  return (
    <div className="ob-content wide ob-anim" key="s4">
      <div className="ob-res-head">
        <div className="ob-res-tag"><Icon name="sparkles" size={13} /> AI-рекомендация готова</div>
        <div className="ob-res-t">
          {scenarios.length
            ? `${scenarios.length} сценариев, которые дадут результат первыми`
            : "Анализ завершён"}
        </div>
        <div className="ob-res-meta">
          {site}
          {segmentLabel && ` · ${segmentLabel}`}
          {goal && ` · цель: ${GOAL_LABEL[goal] || goal}`}
        </div>
      </div>

      {profile && (
        <div className="ob-sc" style={{ marginTop: 14, cursor: "default" }}>
          <div className="ob-sc-h">
            <div className="ob-sc-t">О вашем бизнесе</div>
          </div>
          <div className="ob-sc-d">{profile}</div>
        </div>
      )}

      {tools.length > 0 && (
        <React.Fragment>
          <div className="ob-eyebrow" style={{ marginTop: 22 }}>Топ инструментов Carrot Quest</div>
          <div className="ob-scs">
            {tools.map((tool, i) => (
              <div key={i} className="ob-sc" style={{ cursor: "default" }}>
                <div className="ob-sc-h">
                  <div className="ob-sc-t">{tool.tool}</div>
                  <span className="ob-sc-bdg cool">Приоритет {tool.priority}</span>
                </div>
                <div className="ob-sc-d">{tool.why}</div>
              </div>
            ))}
          </div>
        </React.Fragment>
      )}

      {scenarios.length > 0 && (
        <React.Fragment>
          <div className="ob-eyebrow" style={{ marginTop: 22 }}>Сценарии</div>
          <div className="ob-scs">
            {scenarios.map((sc, i) => (
              <ScenarioCard key={i} sc={sc} i={i} />
            ))}
          </div>
        </React.Fragment>
      )}

      {firstStep && (
        <div className="ob-sc first" style={{ marginTop: 14, cursor: "default" }}>
          <div className="ob-sc-h">
            <div className="ob-sc-t">С чего начать прямо сейчас</div>
            <span className="ob-sc-bdg hot">Шаг 1</span>
          </div>
          <div className="ob-sc-d">{firstStep}</div>
        </div>
      )}

      <div className="ob-actions no-print" style={{ marginTop: 18 }}>
        <button className="ob-btn ob-btn--p" onClick={() => window.print()}>
          <Icon name="download" size={18} /> Скачать PDF
        </button>
        <button className="ob-btn ob-btn--ghost" onClick={restart}>Пройти онбординг заново</button>
      </div>
    </div>
  );
}

Object.assign(window, { Rail, ScreenSite, ScreenGoal, ScreenMetrica, ScreenAnalyze, ScreenResult, RAIL_STEPS });
