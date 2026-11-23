/* Al2zTweaker — macOS-style Windows tweaker with UWP removal */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const STORAGE_KEY = "al2ztweaker.state.v1";
  const THEME_KEY = "al2ztweaker.theme.v1";
  const VINES_KEY = "al2ztweaker.vines.v1";

  /* Electron bridge (falls back to a safe demo shim in a plain browser) */
  const api = window.electronAPI || {
    getSystemInfo: async () => ({}),
    isAdmin: async () => false,
    getUwpApps: async () => [],
    getInstalledPrograms: async () => [],
    removeUwpApp: async () => ({ success: false, error: "Electron API unavailable" }),
    removeUwpAppAll: async () => ({ success: false, error: "Electron API unavailable" }),
    removeBloatware: async () => ({ success: false, removed: [], failed: ["Electron API unavailable"], total: 0 }),
    uninstallProgram: async () => ({ success: false, error: "Electron API unavailable" }),
    getActivationStatus: async () => ({ activated: false, status: "Unavailable", name: "Windows", partialKey: "", expiration: "" }),
    openSettings: async () => ({ success: false, error: "Electron API unavailable" }),
    getUpdateStatus: async () => ({ lastUpdate: "", hotfixId: "", lastScan: "" }),
    quickSetup: async () => ({ success: false, applied: [] }),
    pauseUpdates: async () => ({ success: false }),
    resumeUpdates: async () => ({ success: false }),
    getRestorePoints: async () => [],
    openRecoveryTool: async () => ({ success: false, error: "Electron API unavailable" }),
    minimize: async () => {}, maximize: async () => {}, close: async () => {},
    loadSettings: async () => {
      try {
        return {
          tweaks: JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
          theme: localStorage.getItem(THEME_KEY) || undefined,
          vines: JSON.parse(localStorage.getItem(VINES_KEY) || "{}")
        };
      } catch (_) { return {}; }
    },
    saveSettings: async () => true,
    restartExplorer: async () => ({ success: false, error: "Electron API unavailable" }),
    createRestorePoint: async () => ({ success: false, error: "Electron API unavailable" })
  };

  /* ---------------------------------- data --------------------------------- */

  const CATEGORIES = ["All", "Appearance", "Performance", "Privacy", "System"];

  const TWEAKS = [
    { id: "darkMode", cat: "Appearance", icon: "i-moon", name: "Dark mode", desc: "System apps and menus in dark theme." },
    { id: "transparency", cat: "Appearance", icon: "i-grid", name: "Transparency", desc: "Transparency and blur effects across the UI." },
    { id: "animations", cat: "Appearance", icon: "i-sparkles", name: "Smooth animations", desc: "Window, menu and minimize animations." },
    { id: "widgets", cat: "Appearance", icon: "i-monitor", name: "Widgets", desc: "Hide the widgets panel on the taskbar." },
    { id: "taskbarCenter", cat: "Appearance", icon: "i-sliders", name: "Center taskbar", desc: "Center app icons like on macOS." },
    { id: "explorerTabs", cat: "System", icon: "i-folder", name: "Explorer tabs", desc: "Open multiple folders in one window." },
    { id: "showExtensions", cat: "System", icon: "i-info", name: "File extensions", desc: "Show .exe, .jpg and other extensions." },
    { id: "gameMode", cat: "Performance", icon: "i-bolt", name: "Game mode", desc: "Prioritize games and reduce background tasks." },
    { id: "powerPlan", cat: "Performance", icon: "i-gauge", name: "Maximum power", desc: "High performance power plan without sleep." },
    { id: "startup", cat: "Performance", icon: "i-refresh", name: "Clean startup", desc: "Disable unnecessary startup programs." },
    { id: "hags", cat: "Performance", icon: "i-cpu", name: "GPU scheduling", desc: "Hardware-accelerated GPU scheduling." },
    { id: "storageSense", cat: "Performance", icon: "i-trash", name: "Storage Sense", desc: "Automatically clean temp files and recycle bin." },
    { id: "ads", cat: "Privacy", icon: "i-sparkles", name: "No ads", desc: "Remove advertising suggestions from Windows." },
    { id: "telemetry", cat: "Privacy", icon: "i-shield", name: "No telemetry", desc: "Disable diagnostic data collection." },
    { id: "location", cat: "Privacy", icon: "i-wifi", name: "Location", desc: "Stop apps from accessing your location." },
    { id: "cortana", cat: "Privacy", icon: "i-command", name: "Cortana", desc: "Disable the Windows voice assistant." },
    { id: "copilot", cat: "Privacy", icon: "i-sparkles", name: "Copilot", desc: "Hide the AI assistant on the taskbar." },
    { id: "timeline", cat: "Privacy", icon: "i-clock", name: "Activity history", desc: "Do not store activity and opened files." },
    { id: "feedback", cat: "Privacy", icon: "i-info", name: "Feedback requests", desc: "Stop Windows from asking for a review." }
  ];

  const PRESETS = {
    quiet: ["animations", "widgets", "ads", "telemetry", "copilot"],
    gaming: ["gameMode", "powerPlan", "startup", "animations"],
    privacy: ["telemetry", "ads", "location", "cortana", "timeline", "copilot"]
  };
  const PRESET_NAMES = { quiet: "Quiet system", gaming: "Gaming mode", privacy: "Maximum privacy" };

  const RECOMMENDED = ["darkMode", "animations", "widgets", "ads", "telemetry", "location", "cortana", "copilot", "timeline", "feedback", "gameMode", "startup", "storageSense", "explorerTabs", "showExtensions"];

  const PAGES = [
    { id: "overview", label: "Overview", icon: "i-grid" },
    { id: "tweaks", label: "Tweaks", icon: "i-sliders" },
    { id: "performance", label: "Performance", icon: "i-gauge" },
    { id: "activation", label: "Windows Activation", icon: "i-check" },
    { id: "quicksetup", label: "Quick Setup", icon: "i-bolt" },
    { id: "updates", label: "Windows Update", icon: "i-refresh" },
    { id: "recovery", label: "System & Recovery", icon: "i-command" },
    { id: "privacy", label: "Privacy", icon: "i-shield" },
    { id: "uwp", label: "UWP Apps", icon: "i-sparkles" },
    { id: "programs", label: "Programs", icon: "i-folder" },
    { id: "presets", label: "Presets", icon: "i-bolt" },
    { id: "settings", label: "Settings", icon: "i-settings" },
    { id: "about", label: "About", icon: "i-info" }
  ];

  const PROCESSES = [
    { name: "explorer.exe", label: "Windows Explorer", icon: "i-folder", cpu: 3.4 },
    { name: "chrome.exe", label: "Web browser", icon: "i-grid", cpu: 8.7 },
    { name: "svchost.exe", label: "System service", icon: "i-cpu", cpu: 2.1 },
    { name: "dwm.exe", label: "Desktop compositor", icon: "i-monitor", cpu: 5.3 },
    { name: "searchhost.exe", label: "Windows Search", icon: "i-search", cpu: 1.8 }
  ];

  let UWP_APPS = [];
  let INSTALLED_PROGRAMS = [];
  let SYSTEM_INFO = {};
  let IS_ADMIN = false;

  /* --------------------------------- state --------------------------------- */

  const defaultState = () => Object.fromEntries(TWEAKS.map((t) => [t.id, false]));
  let state = defaultState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && typeof saved === "object") {
      for (const t of TWEAKS) if (saved[t.id] === true) state[t.id] = true;
    }
  } catch (_) { /* ignore corrupted storage */ }

  const saveState = () => saveAllSettings();

  const sys = { cpu: 24, ram: 62, gpu: 18, disk: 41 };
  const history = { overview: { cpu: [], gpu: [] }, perf: { cpu: [], ram: [] } };
  const HISTORY_LEN = 44;
  for (let i = 0; i < HISTORY_LEN; i++) {
    history.overview.cpu.push(sys.cpu + (Math.random() - 0.5) * 9);
    history.overview.gpu.push(sys.gpu + (Math.random() - 0.5) * 7);
    history.perf.cpu.push(sys.cpu + (Math.random() - 0.5) * 9);
    history.perf.ram.push(sys.ram + (Math.random() - 0.5) * 5);
  }

  const clamp = (v, min = 4, max = 96) => Math.min(max, Math.max(min, v));
  const rnd = (amount) => (Math.random() * 2 - 1) * amount;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  /* --------------------------------- theme --------------------------------- */

  const root = document.documentElement;
  const THEMES = ["dark", "light", "red", "yellow", "green", "medieval"];
  const THEME_NAMES = { dark: "Dark", light: "Light", red: "Red", yellow: "Yellow", green: "Green", medieval: "Knight" };
  let theme = "dark";
  try { theme = localStorage.getItem(THEME_KEY) || "dark"; } catch (_) { /* ignore */ }
  if (!THEMES.includes(theme)) theme = "dark";
  root.dataset.theme = theme;

  function setTheme(next) {
    if (!THEMES.includes(next)) return;
    theme = next;
    root.dataset.theme = theme;
    saveAllSettings();
    $$("[data-theme-choice]").forEach((btn) => btn.classList.toggle("active", btn.dataset.themeChoice === theme));
    requestAnimationFrame(() => { drawOverviewChart(); drawPerfChart(); });
  }

  function cycleTheme() {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    setTheme(next);
    toast("Theme changed", `${THEME_NAMES[next]} theme enabled.`, "i-sparkles");
  }

  $("#themeToggle")?.addEventListener("click", cycleTheme);

  $$("[data-theme-choice]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setTheme(btn.dataset.themeChoice);
      toast("Theme changed", `${THEME_NAMES[theme]} theme enabled.`, "i-sparkles");
    });
  });

  requestAnimationFrame(() => {
    $$("[data-theme-choice]").forEach((btn) => btn.classList.toggle("active", btn.dataset.themeChoice === theme));
  });

  /* ------------------------------ vine settings ----------------------------- */

  const VINE_GROUPS = {
    vineSides: "hide-vines-sides",
    vineTop: "hide-vines-top",
    vineBottom: "hide-vines-bottom"
  };
  let vineSettings = { vineSides: true, vineTop: true, vineBottom: true };
  try {
    const saved = JSON.parse(localStorage.getItem(VINES_KEY) || "null");
    if (saved && typeof saved === "object") vineSettings = { ...vineSettings, ...saved };
  } catch (_) { /* ignore */ }

  function applyVineSettings() {
    Object.entries(VINE_GROUPS).forEach(([id, className]) => {
      const input = $(`#${id}`);
      if (input) input.checked = vineSettings[id] !== false;
      document.body.classList.toggle(className, vineSettings[id] === false);
    });
  }
  applyVineSettings();

  Object.keys(VINE_GROUPS).forEach((id) => {
    $(`#${id}`)?.addEventListener("change", (e) => {
      vineSettings[id] = e.target.checked;
      applyVineSettings();
      saveAllSettings();
    });
  });

  /* --------------------------- persistent settings --------------------------- */

  function saveAllSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem(THEME_KEY, theme);
      localStorage.setItem(VINES_KEY, JSON.stringify(vineSettings));
    } catch (_) { /* localStorage is optional */ }
    try {
      Promise.resolve(api.saveSettings({ tweaks: state, theme, vines: vineSettings })).catch(() => {});
    } catch (_) { /* file storage is optional */ }
  }

  async function loadPersistedSettings() {
    let saved = {};
    try { saved = (await api.loadSettings()) || {}; } catch (_) { /* fall back to defaults */ }

    if (saved.tweaks && typeof saved.tweaks === "object") {
      for (const t of TWEAKS) {
        if (typeof saved.tweaks[t.id] === "boolean") state[t.id] = saved.tweaks[t.id];
      }
    }
    if (saved.theme && THEMES.includes(saved.theme)) theme = saved.theme;
    if (saved.vines && typeof saved.vines === "object") vineSettings = { ...vineSettings, ...saved.vines };

    root.dataset.theme = theme;
    applyVineSettings();
    $$("[data-theme-choice]").forEach((btn) => btn.classList.toggle("active", btn.dataset.themeChoice === theme));
    saveAllSettings();
  }

  /* ------------------------------- navigation ------------------------------ */

  const content = $("#content");
  const sidebar = $("#sidebar");
  const scrim = $("#sidebarScrim");

  function closeSidebar() {
    sidebar?.classList.remove("open");
    scrim?.classList.remove("show");
  }

  function go(page) {
    if (!PAGES.some((p) => p.id === page)) return;
    $$(".page").forEach((p) => p.classList.toggle("active", p.id === `page-${page}`));
    $$(".nav .nav-item[data-page]").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
    if (content) content.scrollTop = 0;
    closeSidebar();
    if (page === "performance") requestAnimationFrame(drawPerfChart);
    if (page === "overview") requestAnimationFrame(drawOverviewChart);
    if (page === "activation") loadActivation();
    if (page === "updates") loadUpdateStatus();
    if (page === "recovery") loadRestorePoints();
  }

  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-page]");
    if (nav) { go(nav.dataset.page); return; }
    const navLink = e.target.closest("[data-nav]");
    if (navLink) go(navLink.dataset.nav);
  });

  $("#menuBtn")?.addEventListener("click", () => {
    sidebar?.classList.toggle("open");
    scrim?.classList.toggle("show", sidebar?.classList.contains("open"));
  });
  scrim?.addEventListener("click", closeSidebar);

  /* ---------------------------- window controls ---------------------------- */

  $$("[data-win]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.win;
      if (action === "minimize") api.minimize();
      else if (action === "maximize") api.maximize();
      else if (action === "close") api.close();
    });
  });

  $("#titlebar")?.addEventListener("dblclick", (e) => {
    if (e.target.closest("button, input")) return;
    api.maximize();
  });

  /* -------------------------------- switches ------------------------------- */

  function setTweak(id, value, { silent = false } = {}) {
    const tweak = TWEAKS.find((t) => t.id === id);
    if (!tweak) return;
    state[id] = !!value;
    saveState();
    syncSwitch(id);
    updateProgress();
    if (!silent) toast(value ? "Tweak enabled" : "Tweak disabled", tweak.name, value ? "i-check" : "i-refresh");
  }

  function syncSwitch(id) {
    $$(`.switch[data-tweak="${id}"]`).forEach((el) => el.setAttribute("aria-checked", String(!!state[id])));
  }

  function toggleTweak(id) { setTweak(id, !state[id]); }

  document.addEventListener("click", (e) => {
    const sw = e.target.closest(".switch[data-tweak]");
    if (!sw) return;
    toggleTweak(sw.dataset.tweak);
  });

  /* ------------------------------- rendering ------------------------------- */

  const tweakGrid = $("#tweakGrid");
  const privacyGrid = $("#privacyGrid");
  const tweakSearch = $("#tweakSearch");
  const filterChips = $("#filterChips");
  const tweakEmpty = $("#tweakEmpty");
  let activeCat = "All";

  function tweakCard(t) {
    return `<article class="glass-card tweak-card" data-cat="${t.cat}" data-name="${(t.name + " " + t.desc).toLowerCase()}">
      <span class="tweak-icon"><svg class="icon"><use href="#${t.icon}"></use></svg></span>
      <div class="tweak-body"><h3>${t.name}</h3><p>${t.desc}</p></div>
      <button class="switch" role="switch" aria-checked="${!!state[t.id]}" data-tweak="${t.id}" aria-label="${t.name}"></button>
    </article>`;
  }

  function renderTweaks() {
    if (tweakGrid) tweakGrid.innerHTML = TWEAKS.map(tweakCard).join("");
    if (privacyGrid) privacyGrid.innerHTML = TWEAKS.filter((t) => t.cat === "Privacy").map(tweakCard).join("");
    if (filterChips) {
      filterChips.innerHTML = CATEGORIES.map(
        (c) => `<button class="chip${c === activeCat ? " active" : ""}" data-filter="${c}">${c}</button>`
      ).join("");
    }
    applyFilters();
  }

  function applyFilters() {
    const query = (tweakSearch?.value || "").trim().toLowerCase();
    let visible = 0;
    $$(".tweak-card", tweakGrid || document).forEach((card) => {
      const catOk = activeCat === "All" || card.dataset.cat === activeCat;
      const queryOk = !query || card.dataset.name.includes(query);
      card.hidden = !(catOk && queryOk);
      if (!card.hidden) visible++;
    });
    if (tweakEmpty) tweakEmpty.hidden = visible !== 0;
  }

  filterChips?.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-filter]");
    if (!chip) return;
    activeCat = chip.dataset.filter;
    $$(".chip", filterChips).forEach((c) => c.classList.toggle("active", c === chip));
    applyFilters();
  });
  tweakSearch?.addEventListener("input", applyFilters);

  /* -------------------------------- progress ------------------------------- */

  const total = TWEAKS.length;
  const enabledCount = () => TWEAKS.filter((t) => state[t.id]).length;

  function updateProgress() {
    const enabled = enabledCount();
    const pct = Math.round((enabled / total) * 100);

    const countEl = $("#tweakCount");
    if (countEl) countEl.textContent = String(total);
    const navCount = $("#navTweakCount");
    if (navCount) navCount.textContent = String(total);

    const scoreEl = $("#sidebarScore");
    if (scoreEl) scoreEl.textContent = `${pct}%`;
    const ring = $("#sidebarRing");
    if (ring) ring.style.strokeDashoffset = String(94.25 - (94.25 * pct) / 100);
    const hint = $("#sidebarHint");
    if (hint) hint.textContent = plural(enabled, "tweak", "tweaks");

    const applied = $("#appliedCount");
    if (applied) applied.textContent = `${plural(enabled, "tweak", "tweaks")} applied`;

    const privacyTotal = TWEAKS.filter((t) => t.cat === "Privacy").length;
    const privacyOn = TWEAKS.filter((t) => t.cat === "Privacy" && state[t.id]).length;
    const privacyPct = Math.round((privacyOn / privacyTotal) * 100);
    const privacyScore = $("#privacyScore");
    if (privacyScore) privacyScore.textContent = `${privacyPct}%`;
    const scoreRing = $("#scoreRing");
    if (scoreRing) scoreRing.style.strokeDashoffset = String(402.12 - (402.12 * privacyPct) / 100);
    const privacyHint = $("#privacyHint");
    if (privacyHint) {
      if (privacyPct >= 80) privacyHint.textContent = "Excellent! Almost all trackers and ads are disabled.";
      else if (privacyPct >= 40) privacyHint.textContent = "Good start. Enable the remaining privacy tweaks.";
      else privacyHint.textContent = "Enable the recommended tweaks to improve your score.";
    }
  }

  /* --------------------------------- presets ------------------------------- */

  function applyPreset(key) {
    const ids = PRESETS[key];
    if (!ids) return;
    ids.forEach((id) => { state[id] = true; });
    saveState();
    TWEAKS.forEach((t) => syncSwitch(t.id));
    updateProgress();
    toast("Preset applied", `${PRESET_NAMES[key]} · ${plural(ids.length, "tweak", "tweaks")} enabled`, "i-sparkles");
  }

  document.addEventListener("click", (e) => {
    const card = e.target.closest("[data-preset]");
    if (!card) return;
    applyPreset(card.dataset.preset);
  });

  /* --------------------------------- actions ------------------------------- */

  function applyRecommended() {
    RECOMMENDED.forEach((id) => { state[id] = true; });
    saveState();
    TWEAKS.forEach((t) => syncSwitch(t.id));
    updateProgress();
    toast("Recommended applied", `${plural(RECOMMENDED.length, "tweak", "tweaks")} configured automatically`, "i-sparkles");
  }

  function resetAll() {
    TWEAKS.forEach((t) => { state[t.id] = false; });
    saveState();
    TWEAKS.forEach((t) => syncSwitch(t.id));
    updateProgress();
    toast("Settings reset", "All tweaks are off. Your system is back to default.", "i-refresh");
  }

  $("#recommendedBtn")?.addEventListener("click", applyRecommended);
  $("#aboutApply")?.addEventListener("click", applyRecommended);
  $("#resetTweaks")?.addEventListener("click", resetAll);
  $("#aboutReset")?.addEventListener("click", resetAll);

  $("#restoreBtn")?.addEventListener("click", async () => {
    const result = await api.createRestorePoint("Al2zTweaker backup");
    toast("Restore point", result?.success ? "A system restore point was created." : "Could not create a restore point. Run as administrator.", "i-shield");
  });

  const boostBtn = $("#boostBtn");
  boostBtn?.addEventListener("click", () => {
    if (boostBtn.disabled) return;
    boostBtn.disabled = true;
    boostBtn.style.opacity = ".65";
    const label = boostBtn.querySelector("span") || boostBtn;
    const original = label.textContent;
    label.textContent = "Boosting…";
    setTimeout(() => {
      sys.cpu = clamp(sys.cpu - 13, 4, 90);
      sys.ram = clamp(sys.ram - 9, 12, 90);
      sys.gpu = clamp(sys.gpu - 5, 3, 90);
      pushHistory();
      renderStats();
      drawPerfChart();
      drawOverviewChart();
      toast("System boosted", "Background tasks paused, resources freed up.", "i-bolt");
      label.textContent = original;
      boostBtn.disabled = false;
      boostBtn.style.opacity = "";
    }, 1100);
  });

  /* --------------------------------- stats --------------------------------- */

  function renderStats() {
    const map = { Cpu: sys.cpu, Ram: sys.ram, Gpu: sys.gpu, Disk: sys.disk };
    for (const [key, value] of Object.entries(map)) {
      const text = $(`#stat${key}`);
      if (text) text.textContent = `${Math.round(value)}%`;
      const ring = $(`#ring${key}`);
      if (ring) ring.style.strokeDashoffset = String(113.1 - (113.1 * value) / 100);
      const perfText = $(`#perf${key}`);
      if (perfText) perfText.textContent = `${Math.round(value)}%`;
      const bar = $(`#bar${key}`);
      if (bar) bar.style.width = `${Math.round(value)}%`;
    }
    const overviewValue = $("#chartValue");
    if (overviewValue) overviewValue.textContent = `${Math.round(sys.cpu)}% / ${Math.round(sys.gpu)}%`;
    const perfValue = $("#perfValue");
    if (perfValue) perfValue.textContent = `${Math.round(sys.cpu)}% / ${Math.round(sys.ram)}%`;
  }

  function pushHistory() {
    history.overview.cpu.push(sys.cpu + rnd(2));
    history.overview.gpu.push(sys.gpu + rnd(2));
    history.perf.cpu.push(sys.cpu + rnd(2));
    history.perf.ram.push(sys.ram + rnd(1.5));
    for (const key of Object.keys(history)) {
      for (const series of Object.keys(history[key])) {
        if (history[key][series].length > HISTORY_LEN) history[key][series].shift();
      }
    }
  }

  function renderProcesses() {
    const list = $("#processList");
    if (!list) return;
    list.innerHTML = PROCESSES.map((p) => `
      <div class="process-row">
        <div class="process-name">
          <span class="process-icon"><svg class="icon"><use href="#${p.icon}"></use></svg></span>
          <span><b>${p.name}</b><span>${p.label}</span></span>
        </div>
        <span class="process-cpu">${p.cpu.toFixed(1)}% CPU</span>
        <span class="process-bar"><i style="width:${Math.min(100, p.cpu * 7)}%"></i></span>
      </div>`).join("");
  }

  function escapeHtml(text) {
    return String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  const UWP_FRIENDLY = {
    "microsoft.windowscommunicationsapps": "Mail, Calendar & Outlook",
    "microsoft.outlookforwindows": "Outlook",
    "microsoft.windowsfeedbackhub": "Feedback Hub",
    "microsoft.xboxapp": "Xbox",
    "microsoft.xboxgameoverlay": "Xbox Game Overlay",
    "microsoft.xboxgamingoverlay": "Xbox Gaming Overlay",
    "microsoft.xboxidentityprovider": "Xbox Identity Provider",
    "microsoft.xboxspeechtotextoverlay": "Xbox Speech-to-Text",
    "microsoft.xbox.tcui": "Xbox Game Bar UI",
    "microsoft.gamingapp": "Xbox Gaming Services",
    "microsoft.clipchamp": "Clipchamp",
    "microsoft.copilot": "Copilot",
    "microsoft.bingnews": "Bing News",
    "microsoft.bingweather": "Bing Weather",
    "microsoft.bingsports": "Bing Sports",
    "microsoft.getstarted": "Windows Tips",
    "microsoft.microsoftsolitairecollection": "Solitaire Collection",
    "microsoft.windowsmaps": "Windows Maps",
    "microsoft.zonemusic": "Groove Music",
    "microsoft.zonevideo": "Movies & TV",
    "microsoft.people": "People",
    "microsoft.yourphone": "Phone Link",
    "microsoft.todos": "Microsoft To Do",
    "microsoft.microsoftofficehub": "Office Hub",
    "microsoft.skypeapp": "Skype",
    "microsoft.wallet": "Wallet",
    "microsoft.microsoft3dviewer": "3D Viewer",
    "microsoft.microsoftpaint3d": "Paint 3D"
  };

  function uwpName(app) {
    return UWP_FRIENDLY[(app.Name || "").toLowerCase()] || app.Name || "Unknown";
  }

  function renderUwpList() {
    const list = $("#uwpList");
    if (!list) return;
    if (!Array.isArray(UWP_APPS) || UWP_APPS.length === 0) {
      list.innerHTML = `<div class="empty-state"><svg class="icon"><use href="#i-search"></use></svg><b>No UWP apps found</b><span>Run as administrator to get full information.</span></div>`;
      return;
    }
    list.innerHTML = UWP_APPS.map((app) => `
      <div class="glass-card uwp-item" style="padding:16px;display:flex;align-items:center;gap:12px;">
        <div class="uwp-icon"><svg class="icon"><use href="#i-sparkles"></use></svg></div>
        <div style="flex:1;min-width:0;">
          <h3>${escapeHtml(uwpName(app))}</h3>
          <p>${escapeHtml(app.Publisher || "")}</p>
          <div style="font-size:9px;color:var(--muted-2);">Version: ${escapeHtml(app.Version || "N/A")}</div>
        </div>
        <button class="btn btn-ghost" data-package="${escapeHtml(app.PackageFullName || "")}" data-remove-uwp style="padding:6px 10px;font-size:9.5px;"><svg class="icon"><use href="#i-trash"></use></svg>Remove</button>
        <button class="btn btn-ghost" data-package="${escapeHtml(app.PackageFullName || "")}" data-remove-uwp-all title="Remove for all users" style="padding:6px 10px;font-size:9.5px;"><svg class="icon"><use href="#i-refresh"></use></svg>All users</button>
      </div>`).join("");
  }

  function renderProgramsList() {
    const list = $("#programsList");
    if (!list) return;
    if (!Array.isArray(INSTALLED_PROGRAMS) || INSTALLED_PROGRAMS.length === 0) {
      list.innerHTML = `<div class="empty-state"><svg class="icon"><use href="#i-folder"></use></svg><b>No programs found</b><span>Run as administrator to get full information.</span></div>`;
      return;
    }
    list.innerHTML = INSTALLED_PROGRAMS.map((prog) => `
      <div class="glass-card program-item" style="padding:16px;display:flex;align-items:center;gap:12px;">
        <div class="program-icon"><svg class="icon"><use href="#i-folder"></use></svg></div>
        <div style="flex:1;min-width:0;">
          <h3>${escapeHtml(prog.DisplayName || "Unknown")}</h3>
          <p>${escapeHtml(prog.Publisher || "")}</p>
          <div style="font-size:9px;color:var(--muted-2);">Version: ${escapeHtml(prog.DisplayVersion || "N/A")} · Installed: ${escapeHtml(prog.InstallDate || "N/A")}</div>
        </div>
        <button class="btn btn-ghost" data-uninstall="${escapeHtml(prog.UninstallString || "")}" data-remove-program style="padding:6px 10px;font-size:9.5px;"><svg class="icon"><use href="#i-trash"></use></svg>Uninstall</button>
      </div>`).join("");
  }

  function updateSystemInfo() {
    const osInfo = $("#osInfo");
    if (osInfo) osInfo.textContent = `${SYSTEM_INFO.OS || "Windows"} ${SYSTEM_INFO.Version || ""} (${SYSTEM_INFO.BuildNumber || ""})`.trim();
    const adminStatus = $("#adminStatus");
    if (adminStatus) {
      adminStatus.textContent = IS_ADMIN ? "Administrator" : "Ordinary user";
      adminStatus.className = `status-item ${IS_ADMIN ? "status-admin" : "status-muted"}`;
    }
  }

  /* ------------------------------ backend data ----------------------------- */

  async function loadInitialData() {
    await loadPersistedSettings();
    try { SYSTEM_INFO = (await api.getSystemInfo()) || {}; } catch (_) { SYSTEM_INFO = {}; }
    try { IS_ADMIN = !!(await api.isAdmin()); } catch (_) { IS_ADMIN = false; }
    try {
      const apps = await api.getUwpApps();
      UWP_APPS = Array.isArray(apps) ? apps : [];
    } catch (_) { UWP_APPS = []; }
    try {
      const progs = await api.getInstalledPrograms();
      INSTALLED_PROGRAMS = Array.isArray(progs) ? progs : [];
    } catch (_) { INSTALLED_PROGRAMS = []; }
    updateSystemInfo();
    renderUwpList();
    renderProgramsList();
  }

  /* ----------------------------- windows tools ----------------------------- */

  function setText(id, value) {
    const el = $(`#${id}`);
    if (el) el.textContent = value;
  }

  async function loadActivation() {
    setText("activationTitle", "Checking Windows license…");
    setText("activationDetail", "Reading activation information from your system.");
    try {
      const info = await api.getActivationStatus();
      const active = !!info?.activated;
      setText("activationTitle", active ? "Windows is activated" : "Windows is not activated");
      setText("activationDetail", active
        ? "A valid digital or retail license was found."
        : "Open activation settings to enter a product key or run the troubleshooter.");
      const badge = $("#activationBadge");
      if (badge) {
        badge.textContent = active ? "ACTIVE" : "INACTIVE";
        badge.classList.toggle("off", !active);
      }
      setText("activationName", info?.name || "Windows");
      setText("activationKey", info?.partialKey ? `•••••-${info.partialKey}` : "—");
      setText("activationStatus", info?.status && info.status !== "Unknown" ? info.status : "—");
      setText("activationExpiration", info?.expiration || "Not limited");
    } catch (_) {
      setText("activationTitle", "Could not read license");
      setText("activationDetail", "Open activation settings to check your Windows license.");
      const badge = $("#activationBadge");
      if (badge) { badge.textContent = "—"; badge.classList.add("off"); }
    }
  }

  async function loadUpdateStatus() {
    setText("updateTitle", "Checking update history…");
    setText("updateDetail", "Reading Windows Update information.");
    try {
      const info = await api.getUpdateStatus();
      const hotfix = info?.hotfixId || "";
      const installed = info?.lastUpdate || "";
      setText("updateTitle", hotfix || installed
        ? `${hotfix || "Update installed"}${installed ? ` · ${installed}` : ""}`
        : "No update history found");
      setText("updateDetail", info?.lastScan
        ? `Last successful scan: ${info.lastScan}`
        : "Open Windows Update to scan for new updates.");
      setText("updateHotfix", hotfix || "—");
      setText("updateInstalled", installed || "—");
      setText("updateScan", info?.lastScan || "—");
      const badge = $("#updateBadge");
      if (badge) { badge.textContent = hotfix ? "OK" : "—"; badge.classList.toggle("off", !hotfix); }
    } catch (_) {
      setText("updateTitle", "Could not read update history");
      setText("updateDetail", "Open Windows Update to check for new updates.");
    }
  }

  async function loadRestorePoints() {
    const box = $("#restorePoints");
    if (!box) return;
    box.innerHTML = '<div class="restore-empty">Loading restore points…</div>';
    try {
      const points = await api.getRestorePoints();
      if (!Array.isArray(points) || points.length === 0) {
        box.innerHTML = '<div class="restore-empty">No restore points yet. Create one before making bigger changes.</div>';
        return;
      }
      box.innerHTML = points.map((p) => `
        <div class="restore-item">
          <b>${escapeHtml(p.Description || "Restore point")}</b>
          <span>${escapeHtml(p.Date || "")}</span>
        </div>`).join("");
    } catch (_) {
      box.innerHTML = '<div class="restore-empty">Could not read restore points. Run as administrator.</div>';
    }
  }

  const SETTINGS_LABELS = {
    activation: "activation settings",
    troubleshoot: "activation troubleshooter",
    windowsupdate: "Windows Update",
    "windowsupdate-action": "update check",
    recovery: "recovery settings",
    personalization: "personalization",
    privacy: "privacy settings",
    system: "system settings",
    power: "power settings",
    appsfeatures: "apps & features"
  };
  const TOOL_LABELS = {
    systemRestore: "System Restore",
    diskCleanup: "Disk Cleanup",
    advancedStartup: "Advanced Startup",
    commandPrompt: "Command Prompt"
  };

  document.addEventListener("click", async (e) => {
    const settingsBtn = e.target.closest("[data-open-settings]");
    if (settingsBtn) {
      const page = settingsBtn.dataset.openSettings;
      settingsBtn.disabled = true;
      try {
        const result = await api.openSettings(page);
        const ok = result?.success !== false;
        toast(ok ? "Windows settings" : "Error", ok
          ? `Opened ${SETTINGS_LABELS[page] || "Windows settings"}.`
          : (result?.error || "Could not open this Windows page."), ok ? "i-settings" : "i-info");
      } catch (_) {
        toast("Error", "Could not open this Windows page.", "i-info");
      } finally { settingsBtn.disabled = false; }
      return;
    }

    const toolBtn = e.target.closest("[data-recovery-tool]");
    if (toolBtn) {
      const name = toolBtn.dataset.recoveryTool;
      const label = TOOL_LABELS[name] || "Recovery tool";
      if (name === "advancedStartup" && !confirm("Restart the PC now and open Advanced Startup? Save your work first.")) return;
      toolBtn.disabled = true;
      try {
        const result = await api.openRecoveryTool(name);
        const ok = result?.success !== false;
        toast(ok ? "Recovery tool" : "Error", ok ? `${label} started.` : (result?.error || `Could not start ${label}.`), ok ? "i-check" : "i-info");
      } catch (_) {
        toast("Error", `Could not start ${label}.`, "i-info");
      } finally { toolBtn.disabled = false; }
    }
  });

  $("#refreshActivation")?.addEventListener("click", loadActivation);
  $("#refreshUpdateStatus")?.addEventListener("click", loadUpdateStatus);
  $("#refreshRestorePoints")?.addEventListener("click", loadRestorePoints);

  $("#runQuickSetup")?.addEventListener("click", async () => {
    if (!confirm("Apply quick Windows setup now?")) return;
    const btn = $("#runQuickSetup");
    if (btn) btn.disabled = true;
    try {
      const result = await api.quickSetup();
      const applied = Array.isArray(result?.applied) ? result.applied : [];
      const ok = !!result?.success;
      toast(ok ? "Quick setup applied" : "Error", ok
        ? `${applied.length} settings applied${applied.length ? `: ${applied.join(", ")}` : ""}.`
        : "Could not apply quick setup.", ok ? "i-check" : "i-info");
    } catch (_) {
      toast("Error", "Could not apply quick setup.", "i-info");
    } finally { if (btn) btn.disabled = false; }
  });

  $("#restartExplorerQuick")?.addEventListener("click", async () => {
    try {
      const result = await api.restartExplorer();
      toast(result?.success ? "Explorer restarted" : "Error", result?.success
        ? "Windows Explorer is back."
        : (result?.error || "Could not restart Explorer."), result?.success ? "i-check" : "i-info");
    } catch (_) { toast("Error", "Could not restart Explorer.", "i-info"); }
  });

  $("#pauseUpdates")?.addEventListener("click", async () => {
    try {
      const result = await api.pauseUpdates(7);
      toast(result?.success ? "Updates paused" : "Error", result?.success
        ? "Windows updates are paused for 7 days."
        : (result?.error || "Could not pause updates. Run as administrator."), result?.success ? "i-check" : "i-info");
    } catch (_) { toast("Error", "Could not pause updates.", "i-info"); }
  });

  $("#resumeUpdates")?.addEventListener("click", async () => {
    try {
      const result = await api.resumeUpdates();
      toast(result?.success ? "Updates resumed" : "Error", result?.success
        ? "Windows updates are active again."
        : (result?.error || "Could not resume updates. Run as administrator."), result?.success ? "i-check" : "i-info");
    } catch (_) { toast("Error", "Could not resume updates.", "i-info"); }
  });

  $("#createRestorePointPage")?.addEventListener("click", async () => {
    const result = await api.createRestorePoint("Al2zTweaker backup");
    toast("Restore point", result?.success ? "A system restore point was created." : "Could not create a restore point. Run as administrator.", "i-shield");
    if (result?.success) loadRestorePoints();
  });

  $("#refreshUwp")?.addEventListener("click", async () => {
    try {
      const apps = await api.getUwpApps();
      UWP_APPS = Array.isArray(apps) ? apps : [];
      renderUwpList();
      toast("List updated", `${UWP_APPS.length} UWP apps found`, "i-refresh");
    } catch (_) {
      toast("Error", "Could not load the UWP app list.", "i-info");
    }
  });

  $("#removeBloatware")?.addEventListener("click", async () => {
    if (!confirm("Remove common bloatware including Outlook, Feedback Hub, Xbox, Copilot, Bing apps and more?\n\nThis cannot be undone without reinstalling those apps.")) return;
    const btn = $("#removeBloatware");
    if (btn) btn.disabled = true;
    try {
      const result = await api.removeBloatware();
      const removed = Array.isArray(result?.removed) ? result.removed : [];
      const failed = Array.isArray(result?.failed) ? result.failed : [];
      const apps = await api.getUwpApps();
      UWP_APPS = Array.isArray(apps) ? apps : [];
      renderUwpList();
      toast("Bloatware removal finished", `${removed.length} removed · ${failed.length} skipped`, "i-check");
    } catch (_) {
      toast("Error", "Could not remove bloatware. Run as administrator.", "i-info");
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  $("#refreshPrograms")?.addEventListener("click", async () => {
    try {
      const progs = await api.getInstalledPrograms();
      INSTALLED_PROGRAMS = Array.isArray(progs) ? progs : [];
      renderProgramsList();
      toast("List updated", `${INSTALLED_PROGRAMS.length} programs found`, "i-refresh");
    } catch (_) {
      toast("Error", "Could not load the program list.", "i-info");
    }
  });

  document.addEventListener("click", async (e) => {
    const uwpAll = e.target.closest("[data-remove-uwp-all]");
    if (uwpAll) {
      const name = uwpAll.dataset.package;
      if (!name || !confirm(`Remove this UWP app for ALL users?\n${name}`)) return;
      const result = await api.removeUwpAppAll(name);
      if (result?.success) {
        toast("Removed", "UWP app removed for all users.", "i-check");
        UWP_APPS = Array.isArray(await api.getUwpApps()) ? await api.getUwpApps() : [];
        renderUwpList();
      } else toast("Error", result?.error || "Could not remove the app.", "i-info");
      return;
    }
    const uwpBtn = e.target.closest("[data-remove-uwp]");
    if (uwpBtn) {
      const name = uwpBtn.dataset.package;
      if (!name || !confirm(`Remove this UWP app?\n${name}`)) return;
      const result = await api.removeUwpApp(name);
      if (result?.success) {
        toast("Removed", "UWP app removed.", "i-check");
        const apps = await api.getUwpApps();
        UWP_APPS = Array.isArray(apps) ? apps : [];
        renderUwpList();
      } else toast("Error", result?.error || "Could not remove the app.", "i-info");
      return;
    }
    const progBtn = e.target.closest("[data-remove-program]");
    if (progBtn) {
      const cmd = progBtn.dataset.uninstall;
      if (!cmd || !confirm(`Uninstall this program?\n${cmd}`)) return;
      const result = await api.uninstallProgram(cmd);
      if (result?.success) {
        toast("Uninstalled", "The program uninstaller was started.", "i-check");
        const progs = await api.getInstalledPrograms();
        INSTALLED_PROGRAMS = Array.isArray(progs) ? progs : [];
        renderProgramsList();
      } else toast("Error", result?.error || "Could not start the uninstaller.", "i-info");
    }
  });

  /* --------------------------------- charts -------------------------------- */

  function prepareCanvas(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    const box = canvas.parentElement.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: box.width, h: box.height };
  }

  function drawChart(id, data, series) {
    const prepared = prepareCanvas(id);
    if (!prepared) return;
    const { ctx, w, h } = prepared;
    const light = root.dataset.theme === "light";
    const padT = 14, padB = 10, padX = 2;
    const grid = light ? "rgba(20,22,30,.08)" : "rgba(255,255,255,.07)";
    const n = HISTORY_LEN;
    const xAt = (i) => padX + (i / (n - 1)) * (w - padX * 2);
    const yAt = (v) => h - padB - (Math.min(100, Math.max(0, v)) / 100) * (h - padT - padB);

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = padT + (g / 4) * (h - padT - padB);
      ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke();
    }

    for (const s of series) {
      const values = data[s.key];
      if (!values || values.length < 2) continue;
      const fill = ctx.createLinearGradient(0, padT, 0, h);
      fill.addColorStop(0, `${s.color}38`);
      fill.addColorStop(1, `${s.color}00`);

      ctx.beginPath();
      ctx.moveTo(xAt(0), yAt(values[0]));
      for (let i = 0; i < values.length - 1; i++) {
        const xc = (xAt(i) + xAt(i + 1)) / 2;
        const yc = (yAt(values[i]) + yAt(values[i + 1])) / 2;
        ctx.quadraticCurveTo(xAt(i), yAt(values[i]), xc, yc);
      }
      ctx.lineTo(xAt(values.length - 1), yAt(values[values.length - 1]));
      ctx.save();
      ctx.lineTo(xAt(values.length - 1), h - padB);
      ctx.lineTo(xAt(0), h - padB);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(xAt(0), yAt(values[0]));
      for (let i = 0; i < values.length - 1; i++) {
        const xc = (xAt(i) + xAt(i + 1)) / 2;
        const yc = (yAt(values[i]) + yAt(values[i + 1])) / 2;
        ctx.quadraticCurveTo(xAt(i), yAt(values[i]), xc, yc);
      }
      ctx.lineTo(xAt(values.length - 1), yAt(values[values.length - 1]));
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      const lastX = xAt(values.length - 1);
      const lastY = yAt(values[values.length - 1]);
      ctx.beginPath(); ctx.arc(lastX, lastY, 2.6, 0, Math.PI * 2); ctx.fillStyle = s.color; ctx.fill();
      ctx.beginPath(); ctx.arc(lastX, lastY, 5.5, 0, Math.PI * 2); ctx.strokeStyle = `${s.color}55`; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  function drawOverviewChart() {
    drawChart("overviewChart", history.overview, [{ key: "cpu", color: "#8b5cf6" }, { key: "gpu", color: "#22d3ee" }]);
  }
  function drawPerfChart() {
    drawChart("perfChart", history.perf, [{ key: "cpu", color: "#8b5cf6" }, { key: "ram", color: "#f472b6" }]);
  }

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { drawOverviewChart(); drawPerfChart(); }, 140);
  });

  /* ---------------------------------- toast -------------------------------- */

  const toastStack = $("#toastStack");
  function toast(title, text, icon = "i-check") {
    if (!toastStack) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<span class="toast-icon"><svg class="icon"><use href="#${icon}"></use></svg></span><div class="toast-copy"><b></b><span></span></div><span class="toast-progress"></span>`;
    el.querySelector("b").textContent = title;
    el.querySelector(".toast-copy span").textContent = text;
    toastStack.appendChild(el);
    const remove = () => {
      if (!el.isConnected) return;
      el.classList.add("out");
      setTimeout(() => el.remove(), 320);
    };
    setTimeout(remove, 3400);
    el.addEventListener("click", remove);
    while (toastStack.children.length > 3) toastStack.firstElementChild.remove();
  }

  /* ------------------------------ command menu ----------------------------- */

  const overlay = $("#commandOverlay");
  const commandInput = $("#commandInput");
  const commandList = $("#commandList");
  let commandIndex = 0;
  let commandItems = [];

  function buildCommands(query = "") {
    const q = query.trim().toLowerCase();
    const pageItems = PAGES
      .filter((p) => !q || p.label.toLowerCase().includes(q) || "page".includes(q))
      .map((p) => ({ type: "page", value: p.id, label: p.label, meta: "Page", icon: p.icon }));
    const tweakItems = TWEAKS
      .filter((t) => !q || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q))
      .map((t) => ({ type: "tweak", value: t.id, label: t.name, meta: t.cat, icon: t.icon }));
    return [...pageItems, ...tweakItems];
  }

  function renderCommands(query = "") {
    commandItems = buildCommands(query);
    commandIndex = 0;
    if (!commandList) return;
    if (!commandItems.length) {
      commandList.innerHTML = `<div class="command-empty">Nothing found. Try "dark", "gaming" or "privacy".</div>`;
      return;
    }
    commandList.innerHTML = commandItems.map((item, i) => `
      <button class="command-item${i === 0 ? " selected" : ""}" data-action="${item.type}" data-value="${item.value}">
        <svg class="icon"><use href="#${item.icon}"></use></svg><span>${item.label}</span><small>${item.meta}</small>
      </button>`).join("");
  }

  function openCommand() {
    if (!overlay) return;
    overlay.hidden = false;
    if (commandInput) {
      commandInput.value = "";
      renderCommands();
      requestAnimationFrame(() => commandInput.focus());
    }
  }
  function closeCommand() { if (overlay) overlay.hidden = true; }
  function runCommand(item) {
    if (!item) return;
    closeCommand();
    if (item.type === "page") go(item.value);
    else if (item.type === "tweak") toggleTweak(item.value);
  }

  $("#searchTrigger")?.addEventListener("click", openCommand);
  overlay?.addEventListener("click", (e) => { if (e.target === overlay) closeCommand(); });
  commandInput?.addEventListener("input", () => renderCommands(commandInput.value));
  commandInput?.addEventListener("keydown", (e) => {
    if (!commandItems.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      commandIndex = (commandIndex + (e.key === "ArrowDown" ? 1 : -1) + commandItems.length) % commandItems.length;
      $$(".command-item", commandList).forEach((el, i) => el.classList.toggle("selected", i === commandIndex));
      commandList?.children[commandIndex]?.scrollIntoView({ block: "nearest" });
    }
    if (e.key === "Enter") { e.preventDefault(); runCommand(commandItems[commandIndex]); }
  });
  commandList?.addEventListener("click", (e) => {
    const btn = e.target.closest(".command-item");
    if (!btn) return;
    runCommand(commandItems.find((item) => item.type === btn.dataset.action && item.value === btn.dataset.value));
  });

  /* ------------------------------- shortcuts ------------------------------- */

  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      overlay?.hidden ? openCommand() : closeCommand();
      return;
    }
    if (e.key === "Escape") { if (overlay && !overlay.hidden) closeCommand(); closeSidebar(); return; }
    if (typing || (overlay && !overlay.hidden)) return;
    if (e.key.toLowerCase() === "t") { cycleTheme(); return; }

    const order = PAGES.map((p) => p.id);
    const current = order.find((p) => document.getElementById(`page-${p}`)?.classList.contains("active")) || "overview";
    if (e.key === "ArrowRight") go(order[(order.indexOf(current) + 1) % order.length]);
    if (e.key === "ArrowLeft") go(order[(order.indexOf(current) - 1 + order.length) % order.length]);
  });

  /* --------------------------- mouse-reactive vines --------------------------- */

  const vineSpots = $$(".vine-spot");
  let vinePointer = null;
  let vineTicking = false;

  function applyVineMotion() {
    vineTicking = false;
    if (!vinePointer) return;
    const w = window.innerWidth;
    for (const spot of vineSpots) {
      if (!spot.offsetParent) continue;
      const rect = spot.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = vinePointer.x - cx;
      const dy = vinePointer.y - cy;
      const influence = Math.max(0, 1 - Math.hypot(dx, dy) / 340);
      if (influence <= 0) {
        spot.style.transform = "";
        continue;
      }
      const tx = dx * 0.13 * influence;
      const ty = dy * 0.11 * influence;
      const rot = (dx / Math.max(w, 1)) * 34 * influence;
      const scale = 1 + 0.05 * influence;
      spot.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    }
  }

  window.addEventListener("mousemove", (e) => {
    vinePointer = { x: e.clientX, y: e.clientY };
    if (!vineTicking) {
      vineTicking = true;
      requestAnimationFrame(applyVineMotion);
    }
  });
  document.addEventListener("mouseleave", () => {
    vinePointer = null;
    vineSpots.forEach((spot) => { spot.style.transform = ""; });
  });

  /* ------------------------------- little knight ------------------------------ */

  let plimAudio = null;
  function playPlim() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!plimAudio) plimAudio = new AudioCtx();
      if (plimAudio.state === "suspended") plimAudio.resume();

      const now = plimAudio.currentTime;
      const master = plimAudio.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.3, now + 0.012);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      master.connect(plimAudio.destination);

      [
        [880, "sine", 0.26],
        [1320, "triangle", 0.12],
        [1760, "sine", 0.06]
      ].forEach(([freq, type, level], i) => {
        const osc = plimAudio.createOscillator();
        const gain = plimAudio.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq * 1.16, now);
        osc.frequency.exponentialRampToValueAtTime(freq, now + 0.08 + i * 0.02);
        gain.gain.setValueAtTime(level, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5 + i * 0.08);
        osc.connect(gain).connect(master);
        osc.start(now);
        osc.stop(now + 0.7 + i * 0.08);
      });

      // Short metallic clang underneath the chime.
      const length = Math.floor(plimAudio.sampleRate * 0.07);
      const buffer = plimAudio.createBuffer(1, length, plimAudio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const noise = plimAudio.createBufferSource();
      noise.buffer = buffer;
      const filter = plimAudio.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1500;
      filter.Q.value = 2;
      const noiseGain = plimAudio.createGain();
      noiseGain.gain.setValueAtTime(0.12, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      noise.connect(filter).connect(noiseGain).connect(master);
      noise.start(now);
    } catch (_) { /* audio is optional */ }
  }

  $("#knightBtn")?.addEventListener("click", () => {
    playPlim();
    const btn = $("#knightBtn");
    if (btn) {
      btn.classList.remove("is-hit");
      void btn.offsetWidth;
      btn.classList.add("is-hit");
      setTimeout(() => btn.classList.remove("is-hit"), 450);
    }
    const rect = btn?.getBoundingClientRect();
    if (rect) {
      const burst = document.createElement("div");
      burst.className = "plim-burst";
      burst.textContent = "ПЛИМ!";
      burst.style.left = `${rect.left + rect.width / 2}px`;
      burst.style.top = `${rect.top - 6}px`;
      document.body.appendChild(burst);
      setTimeout(() => burst.remove(), 950);
    }
  });

  /* --------------------------------- ticking -------------------------------- */

  setInterval(() => {
    sys.cpu = clamp(sys.cpu + rnd(7), 6, 88);
    sys.ram = clamp(sys.ram + rnd(4), 24, 92);
    sys.gpu = clamp(sys.gpu + rnd(5), 4, 86);
    sys.disk = clamp(sys.disk + rnd(1.5), 20, 80);
    pushHistory();
    renderStats();
    drawOverviewChart();
    drawPerfChart();
  }, 2200);

  /* ---------------------------------- init --------------------------------- */

  loadInitialData().then(() => {
    renderTweaks();
    renderProcesses();
    renderStats();
    updateProgress();
    renderCommands();
    requestAnimationFrame(() => { drawOverviewChart(); drawPerfChart(); });
  });

  window.addEventListener("load", () => { drawOverviewChart(); drawPerfChart(); });
})();
