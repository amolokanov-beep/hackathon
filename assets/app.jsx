// app.jsx — state machine, tweakable shell, mount

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#5C5CD6",
  "radius": "product",
  "density": "regular",
  "progress": "steps"
}/*EDITMODE-END*/;

const RADII = {
  product: { btn: "6px", input: "8px", card: "12px", chip: "6px" },
  soft:    { btn: "12px", input: "12px", card: "16px", chip: "12px" },
  pill:    { btn: "999px", input: "999px", card: "18px", chip: "999px" },
};
const DENSITY = {
  compact: { fz: 14, gap: 0.85 },
  regular: { fz: 15, gap: 1 },
  comfy:   { fz: 16.5, gap: 1.18 },
};

const LS_KEY = "cq_onboarding_state_v1";
function loadState() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; }
}

const GOAL_LABELS = {
  leads:     "Собирать больше лидов с сайта",
  support:   "Поддерживать клиентов в чате",
  retention: "Возвращать и удерживать клиентов",
  sales:     "Автоматизировать продажи",
};

async function callAnalyze({ site, goal, metrikaFile }) {
  const form = new FormData();
  form.append("site_url", site);
  form.append("goal", GOAL_LABELS[goal] || goal || "");
  if (metrikaFile) form.append("metrika_pdf", metrikaFile);
  const res = await fetch("/api/analyze", { method: "POST", body: form });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Ошибка анализа");
  return json;
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const saved = React.useRef(loadState()).current;
  const [step, setStep] = React.useState(saved.step ?? 0);
  const [site, setSite] = React.useState(saved.site ?? "");
  const [goal, setGoal] = React.useState(saved.goal ?? "");
  const [metrikaFile, setMetrikaFile] = React.useState(null);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ step, site, goal }));
  }, [step, site, goal]);

  const go = (n) => setStep(n);
  const restart = () => {
    setStep(0); setSite(""); setGoal(""); setMetrikaFile(null);
    setResult(null); setError(null);
  };
  const siteLabel = site.trim() ? site.trim().replace(/^https?:\/\//, "") : "myshop.ru";

  const runAnalyze = async () => {
    setError(null); setResult(null);
    try {
      const res = await callAnalyze({ site, goal, metrikaFile });
      setResult(res);
      return res;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  };

  const r = RADII[t.radius] || RADII.product;
  const d = DENSITY[t.density] || DENSITY.regular;
  const rootStyle = {
    "--accent": t.accent,
    "--accent-ink": "#fff",
    "--r-btn": r.btn, "--r-input": r.input, "--r-card": r.card, "--r-chip": r.chip,
    "--fz": d.fz + "px", "--gap": d.gap,
  };

  let screen;
  if (step === 0) screen = <ScreenSite site={site} setSite={setSite} next={() => go(1)} />;
  else if (step === 1) screen = <ScreenGoal goal={goal} setGoal={setGoal} next={() => go(2)} />;
  else if (step === 2) screen = <ScreenMetrica file={metrikaFile} setFile={setMetrikaFile} next={() => go(3)} />;
  else if (step === 3) screen = <ScreenAnalyze site={siteLabel} runAnalyze={runAnalyze} error={error} next={() => go(4)} retry={() => go(2)} />;
  else screen = <ScreenResult site={siteLabel} goal={goal} result={result} restart={restart} />;

  return (
    <div className="ob-root" style={rootStyle}>
      <Rail step={step} progress={t.progress} />
      <div className="ob-main">
        <div className="ob-topbar">
          {step < 3 && (
            <button className="ob-exit" onClick={restart}><Icon name="x" size={16} /> Выйти из настройки</button>
          )}
        </div>
        <div className="ob-stage">{screen}</div>
      </div>

      <TweaksPanel>
        <TweakSection label="Акцент" />
        <TweakColor label="Цвет" value={t.accent}
          options={["#5C5CD6", "#2929A3", "#FF7733"]}
          onChange={(v) => setTweak("accent", v)} />
        <TweakSection label="Форма" />
        <TweakRadio label="Скругления" value={t.radius}
          options={["product", "soft", "pill"]}
          onChange={(v) => setTweak("radius", v)} />
        <TweakRadio label="Плотность" value={t.density}
          options={["compact", "regular", "comfy"]}
          onChange={(v) => setTweak("density", v)} />
        <TweakSection label="Прогресс" />
        <TweakRadio label="Индикатор" value={t.progress}
          options={["steps", "bar", "dots"]}
          onChange={(v) => setTweak("progress", v)} />
        <TweakSection label="Навигация" />
        <TweakRow label="Перейти к экрану">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["Сайт", "Цель", "Метрика", "Анализ", "Готово"].map((lbl, i) => (
              <button key={i} onClick={() => go(i)}
                style={{
                  padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                  border: "1px solid " + (step === i ? t.accent : "rgba(0,0,0,0.15)"),
                  background: step === i ? t.accent : "#fff",
                  color: step === i ? "#fff" : "#444", fontSize: 12, fontWeight: 600,
                }}>{i + 1}</button>
            ))}
          </div>
        </TweakRow>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
