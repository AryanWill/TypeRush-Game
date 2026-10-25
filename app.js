(() => {
  "use strict";

  const HISTORY_KEY = "typerush.history.v1";
  const SETTINGS_KEY = "typerush.settings.v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const WORDS = `a about above across act add after again age ago air all almost along also always among an and animal answer any appear are area arm around as ask at away back base be because become before begin best better between big bird black body book both boy bring build but by call came can car carry change children city close cold come common complete country course cut day did different do down during each early earth east easy eat end enough even every example eye face fact fall family far fast father feel few find first follow food for form found four friend from full game gave get girl give go good got great group grow had hand hard has have he head hear help her here high home house how however idea if important in in fact interest into is it its just keep kind know land large last later learn leave left less let life light like line list little live long look made make man many map mark may me mean men might mile mind miss money month more most mother move much music must name near need never new next night no not now number of off often old on once one only open or order other our out over own page paper part people person picture place plan play point possible power present press problem program put question quick quite read real right river road room run said same saw say school sea second see seem sentence set she should show side simple since small so some something sound spell start state still story study such take talk tell than that the their them then there these they thing think this those thought three through time to together too took tree try turn two under until up us use usually very voice wait walk want war was water way we well went were what when where which while white who why will with word work world would write year yes yet you young`.split(/\s+/);

  const state = {
    mode: "time", duration: 15, wordCount: 25, content: "normal",
    target: "", typed: "", started: false, finished: false,
    startTime: 0, deadline: 0, timerId: null, historyTimerId: null,
    samples: [], sound: false, audio: null, focus: false,
    history: loadHistory(), settings: loadSettings(), currentRunId: 0
  };
  const input = $("#typingInput");

  function loadHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(HISTORY_KEY));
      return Array.isArray(value) ? value.filter(item => item && Number.isFinite(item.wpm) && Number.isFinite(item.accuracy)).slice(0, 100) : [];
    } catch { return []; }
  }
  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; }
  }
  function saveData() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(0, 100)));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ sound: state.sound }));
    } catch { toast("Your browser storage is full. Some stats may not save."); }
  }
  function escapeHTML(text) {
    return String(text).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }
  function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function makeTarget() {
    const count = state.mode === "words" ? state.wordCount : Math.max(90, Math.ceil(state.duration * 3.2));
    const words = [];
    const pool = state.content === "normal" ? WORDS :
      state.content === "punctuation" ? WORDS.filter(w => w.length > 2) :
      ["let", "const", "array", "value", "count", "user42", "item_7", "true", "false", "404", "100%", "2.0", "node.js", "html5", "css3", "x+y", "data", "id_01", ">= 10", "v2.4"];
    while (words.length < count) {
      const shuffled = shuffle(pool);
      for (const word of shuffled) {
        let next = word;
        if (state.content === "punctuation" && Math.random() < 0.32) next += [".", ",", "!", "?", ";", ":"][Math.floor(Math.random() * 6)];
        if (state.content === "numbers" && Math.random() < 0.38) next = ["42", "2026", "v2.4", "user_7", "100%", "3.14", ">= 10", "node.js", "x+y"][Math.floor(Math.random() * 9)];
        words.push(next);
        if (words.length >= count) break;
      }
    }
    return words.slice(0, count).join(" ");
  }
  function setPressed(selector, attribute, value) {
    $$(selector).forEach(button => {
      const active = button.dataset[attribute] === String(value);
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }
  function resetTest(focus = false) {
    clearInterval(state.timerId);
    clearInterval(state.historyTimerId);
    state.timerId = null;
    state.historyTimerId = null;
    state.target = makeTarget();
    state.typed = "";
    state.started = false;
    state.finished = false;
    state.startTime = 0;
    state.deadline = 0;
    state.samples = [];
    state.currentRunId++;
    input.value = "";
    input.disabled = false;
    $("#liveWpm").textContent = "0";
    $("#liveAccuracy").innerHTML = '100<span class="unit">%</span>';
    $("#liveTime").innerHTML = `${state.mode === "time" ? state.duration : "—"}<span class="unit">${state.mode === "time" ? "s" : "words"}</span>`;
    $("#liveErrors").textContent = "0";
    $("#testProgress").style.width = "0%";
    $("#progressLabel").textContent = "0% complete";
    $("#typingOverlay").classList.remove("dismissed");
    renderTarget();
    if (focus) focusTyping();
  }
  function renderTarget() {
    const chars = [];
    const typed = state.typed;
    for (let i = 0; i < state.target.length; i++) {
      let className = "char";
      if (i < typed.length) className += typed[i] === state.target[i] ? " correct" : " incorrect";
      else if (i === typed.length && !state.finished) className += " current";
      chars.push(`<span class="${className}">${state.target[i] === " " ? "&nbsp;" : escapeHTML(state.target[i])}</span>`);
    }
    if (typed.length > state.target.length) {
      for (let i = state.target.length; i < typed.length; i++) chars.push(`<span class="char extra">${escapeHTML(typed[i])}</span>`);
    }
    $("#textDisplay").innerHTML = chars.join("");
    const current = $(".char.current");
    if (current) {
      const parent = $("#textDisplay");
      const top = current.offsetTop;
      if (top > parent.scrollTop + parent.clientHeight - 40) current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }
  function getMetrics(at = Date.now()) {
    const elapsedMinutes = Math.max((at - state.startTime) / 60000, 1 / 60000);
    let correctChars = 0;
    const compareLength = Math.min(state.typed.length, state.target.length);
    for (let i = 0; i < compareLength; i++) if (state.typed[i] === state.target[i]) correctChars++;
    const errors = Math.max(0, state.typed.length - correctChars);
    const accuracy = state.typed.length ? Math.round(correctChars / state.typed.length * 100) : 100;
    const hasStarted = state.startTime > 0;
    const wpm = hasStarted ? Math.round((correctChars / 5) / elapsedMinutes) : 0;
    const rawWpm = hasStarted ? Math.round((state.typed.length / 5) / elapsedMinutes) : 0;
    return { correctChars, errors, accuracy, wpm, rawWpm, typedChars: state.typed.length, targetChars: state.target.length, elapsedMinutes };
  }
  function startTest() {
    if (state.started || state.finished) return;
    state.started = true;
    state.startTime = Date.now();
    state.deadline = state.mode === "time" ? state.startTime + state.duration * 1000 : 0;
    $("#typingOverlay").classList.add("dismissed");
    if (state.mode === "time") {
      state.timerId = setInterval(tick, 50);
    } else {
      state.timerId = setInterval(tick, 100);
    }
    state.historyTimerId = setInterval(() => {
      if (state.started && !state.finished) {
        state.samples.push({ t: (Date.now() - state.startTime) / 1000, wpm: getMetrics().wpm });
        if (state.samples.length > 150) state.samples.shift();
      }
    }, 1000);
  }
  function tick() {
    if (!state.started || state.finished) return;
    const now = Date.now();
    const elapsed = (now - state.startTime) / 1000;
    if (state.mode === "time") {
      const remaining = Math.max(0, (state.deadline - now) / 1000);
      $("#liveTime").innerHTML = `${Math.ceil(remaining)}<span class="unit">s</span>`;
      if (remaining <= 0) { finishTest("time"); return; }
    } else {
      const completedWords = state.typed.trim().split(/\s+/).filter(Boolean).length;
      const remaining = Math.max(0, state.wordCount - completedWords);
      $("#liveTime").innerHTML = `${remaining}<span class="unit">words</span>`;
      if (state.typed.length >= state.target.length || (completedWords >= state.wordCount && state.typed.endsWith(" "))) { finishTest("words"); return; }
    }
    const metrics = getMetrics(now);
    $("#liveWpm").textContent = metrics.wpm;
    $("#liveAccuracy").innerHTML = `${metrics.accuracy}<span class="unit">%</span>`;
    $("#liveErrors").textContent = metrics.errors;
    const progress = state.mode === "time" ? Math.min(100, elapsed / state.duration * 100) :
      Math.min(100, state.typed.trim().split(/\s+/).filter(Boolean).length / state.wordCount * 100);
    $("#testProgress").style.width = `${progress}%`;
    $("#progressLabel").textContent = `${Math.round(progress)}% complete`;
  }
  function playKeySound(key) {
    if (!state.sound) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      state.audio ||= new AudioContext();
      if (state.audio.state === "suspended") state.audio.resume();
      const oscillator = state.audio.createOscillator();
      const gain = state.audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = key === " " ? 320 : 440 + Math.random() * 90;
      gain.gain.setValueAtTime(0.025, state.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, state.audio.currentTime + 0.035);
      oscillator.connect(gain);
      gain.connect(state.audio.destination);
      oscillator.start();
      oscillator.stop(state.audio.currentTime + 0.04);
    } catch { /* Audio is optional; the game remains playable without it. */ }
  }
  function onInput() {
    if (state.finished) return;
    const next = input.value.slice(0, state.target.length);
    if (next.length > state.typed.length) {
      const key = next[next.length - 1];
      playKeySound(key);
    }
    state.typed = next;
    if (next.length > 0 && !state.started) startTest();
    renderTarget();
    if (state.started) tick();
    else {
      const metrics = getMetrics();
      $("#liveAccuracy").innerHTML = `${metrics.accuracy}<span class="unit">%</span>`;
      $("#liveErrors").textContent = metrics.errors;
    }
    if (state.mode === "words" && state.started) {
      const count = state.typed.trim().split(/\s+/).filter(Boolean).length;
      $("#liveTime").innerHTML = `${Math.max(0, state.wordCount - count)}<span class="unit">words</span>`;
    }
    if (state.mode === "words" && state.typed.length >= state.target.length) finishTest("words");
  }
  function finishTest(reason) {
    if (state.finished) return;
    state.finished = true;
    state.started = false;
    clearInterval(state.timerId);
    clearInterval(state.historyTimerId);
    state.timerId = null;
    state.historyTimerId = null;
    input.disabled = true;
    const metrics = getMetrics();
    const elapsedSeconds = Math.max(0.01, (Date.now() - state.startTime) / 1000);
    const result = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      date: new Date().toISOString(),
      mode: state.mode,
      setting: state.mode === "time" ? state.duration : state.wordCount,
      wpm: metrics.wpm,
      rawWpm: metrics.rawWpm,
      accuracy: metrics.accuracy,
      errors: metrics.errors,
      correctChars: metrics.correctChars,
      typedChars: metrics.typedChars,
      targetChars: metrics.targetChars,
      elapsed: Math.round(elapsedSeconds),
      samples: [...state.samples, { t: elapsedSeconds, wpm: metrics.wpm }]
    };
    const previousBest = Math.max(0, ...state.history.map(item => item.wpm));
    state.history.unshift(result);
    state.history = state.history.slice(0, 100);
    saveData();
    const newBest = result.wpm > previousBest;
    $("#resultWpm").textContent = result.wpm;
    $("#resultAccuracy").textContent = `${result.accuracy}%`;
    $("#resultRawWpm").textContent = result.rawWpm;
    $("#resultChars").textContent = `${result.correctChars} / ${result.typedChars}`;
    $("#resultErrors").textContent = result.errors;
    $("#resultDuration").textContent = state.mode === "time" ? `${state.duration} second test` : `${state.wordCount} word test`;
    $("#newBestBadge").classList.toggle("hidden", !newBest);
    $("#resultTitle").textContent = result.wpm >= 80 ? "Lightning fast." : result.wpm >= 50 ? "Nice work." : "You showed up.";
    $("#resultSubtitle").textContent = result.accuracy >= 98 ? "Beautiful accuracy. Keep that rhythm." : result.accuracy >= 90 ? "Great effort. Smoothness brings speed." : "Keep practicing. Accuracy first, speed follows.";
    drawChart($("#resultChart"), result.samples, { compact: true });
    $("#resultBackdrop").classList.remove("hidden");
    renderStats();
    updateBestCard();
    $("#testProgress").style.width = "100%";
    $("#progressLabel").textContent = "100% complete";
    $("#liveWpm").textContent = result.wpm;
    $("#liveAccuracy").innerHTML = `${result.accuracy}<span class="unit">%</span>`;
    $("#liveErrors").textContent = result.errors;
    if (reason === "time") $("#liveTime").innerHTML = `0<span class="unit">s</span>`;
    toast(newBest ? "New personal best. That’s your pace!" : "Test saved to your history.");
  }
  function drawChart(canvas, items, options = {}) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(280, rect.width || 600);
    const height = Math.max(60, rect.height || 180);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    if (!items || items.length < 1) return;
    const values = items.map(item => Math.max(0, item.wpm));
    const max = Math.max(20, Math.ceil(Math.max(...values) / 10) * 10);
    const pad = options.compact ? { l: 3, r: 3, t: 9, b: 5 } : { l: 28, r: 8, t: 12, b: 22 };
    const plotW = width - pad.l - pad.r;
    const plotH = height - pad.t - pad.b;
    const x = i => pad.l + (items.length === 1 ? plotW / 2 : i / (items.length - 1) * plotW);
    const y = value => pad.t + plotH - (value / max) * plotH;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#2c243a";
    ctx.fillStyle = "#756a86";
    ctx.font = "9px DM Sans, sans-serif";
    if (!options.compact) {
      for (let i = 0; i <= 4; i++) {
        const val = max * i / 4;
        const yy = y(val);
        ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(width - pad.r, yy); ctx.stroke();
        ctx.fillText(String(Math.round(val)), 0, yy + 3);
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const yy = pad.t + i * plotH / 2;
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(width, yy); ctx.stroke();
      }
    }
    if (items.length === 1) {
      ctx.fillStyle = "#b9a0ff"; ctx.beginPath(); ctx.arc(x(0), y(values[0]), 3.5, 0, Math.PI * 2); ctx.fill();
      return;
    }
    const gradient = ctx.createLinearGradient(0, pad.t, 0, height);
    gradient.addColorStop(0, "rgba(167,139,250,.24)");
    gradient.addColorStop(1, "rgba(167,139,250,0)");
    ctx.beginPath();
    ctx.moveTo(x(0), height - pad.b);
    items.forEach((item, i) => ctx.lineTo(x(i), y(item.wpm)));
    ctx.lineTo(x(items.length - 1), height - pad.b);
    ctx.closePath();
    ctx.fillStyle = gradient; ctx.fill();
    ctx.beginPath();
    items.forEach((item, i) => i ? ctx.lineTo(x(i), y(item.wpm)) : ctx.moveTo(x(i), y(item.wpm)));
    ctx.strokeStyle = "#b19aff"; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();
    items.forEach((item, i) => {
      ctx.beginPath(); ctx.arc(x(i), y(item.wpm), options.compact ? 2 : 3, 0, Math.PI * 2);
      ctx.fillStyle = "#d5c6ff"; ctx.fill();
      if (!options.compact && (i === 0 || i === items.length - 1 || i === Math.floor(items.length / 2))) {
        ctx.fillStyle = "#8c819e";
        ctx.textAlign = i === 0 ? "left" : i === items.length - 1 ? "right" : "center";
        ctx.fillText(new Date(item.date || Date.now()).toLocaleDateString(undefined, { month: "short", day: "numeric" }), x(i), height - 4);
      }
    });
  }
  function updateBestCard() {
    const best = state.history.reduce((a, b) => !a || b.wpm > a.wpm ? b : a, null);
    $("#personalBest").textContent = best ? best.wpm : "—";
    $("#bestAccuracy").textContent = best ? `${best.accuracy}% accuracy` : "—% accuracy";
  }
  function renderStats() {
    const history = state.history;
    const bestWpm = Math.max(0, ...history.map(item => item.wpm));
    const bestAccuracy = Math.max(0, ...history.map(item => item.accuracy));
    const average = history.length ? Math.round(history.reduce((sum, item) => sum + item.wpm, 0) / history.length) : 0;
    $("#statsBestWpm").textContent = bestWpm;
    $("#statsBestAccuracy").textContent = bestAccuracy;
    $("#statsTests").textContent = history.length;
    $("#statsAverage").textContent = average;
    const chartItems = history.slice(0, 12).reverse().map(item => ({ ...item, date: item.date }));
    $("#chartEmpty").classList.toggle("hidden", chartItems.length > 0);
    drawChart($("#wpmChart"), chartItems);
    $("#historyList").innerHTML = history.length ? history.slice(0, 8).map(item => {
      const date = new Date(item.date);
      const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " · " + date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      const modeLabel = item.mode === "time" ? `${item.setting}s test` : `${item.setting} words`;
      return `<div class="history-row"><div class="history-mode"><span class="history-dot"></span><div><strong>${modeLabel}</strong><small>${label}</small></div></div><div class="history-wpm">${item.wpm}<small>WPM</small></div><div class="history-accuracy">${item.accuracy}%</div></div>`;
    }).join("") : '<div class="history-empty">Your completed tests will show up here.</div>';
    renderAchievements();
  }
  function renderAchievements() {
    const history = state.history;
    const best = Math.max(0, ...history.map(item => item.wpm));
    const tests = history.length;
    const accuracy = Math.max(0, ...history.map(item => item.accuracy));
    const achievements = [
      { icon: "⌨", title: "First steps", desc: "Complete your first typing test.", unlocked: tests >= 1 },
      { icon: "⚡", title: "Quick fingers", desc: "Reach 40 WPM in a test.", unlocked: best >= 40 },
      { icon: "✦", title: "Speed demon", desc: "Reach 70 WPM in a test.", unlocked: best >= 70 },
      { icon: "◎", title: "Precision mode", desc: "Achieve 98% accuracy in a test.", unlocked: accuracy >= 98 && tests > 0 },
      { icon: "♛", title: "Triple threat", desc: "Complete 3 typing tests.", unlocked: tests >= 3 },
      { icon: "◈", title: "Century club", desc: "Reach 100 WPM in a test.", unlocked: best >= 100 }
    ];
    $("#achievementList").innerHTML = achievements.map(a => `<div class="achievement ${a.unlocked ? "unlocked" : ""}"><div class="achievement-icon">${a.icon}</div><div class="achievement-copy"><strong>${a.title}</strong><p>${a.desc}</p></div><span class="achievement-status">${a.unlocked ? "UNLOCKED ✓" : "LOCKED"}</span></div>`).join("");
  }
  function showPage(page) {
    const stats = page === "stats";
    $("#testPage").classList.toggle("active-page", !stats);
    $("#statsPage").classList.toggle("active-page", stats);
    $$(".nav-link").forEach(button => {
      const active = button.dataset.page === page;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
    if (stats) {
      renderStats();
      requestAnimationFrame(() => drawChart($("#wpmChart"), state.history.slice(0, 12).reverse()));
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function focusTyping() {
    if (state.finished) return;
    $("#typingOverlay").classList.add("dismissed");
    input.focus({ preventScroll: true });
  }
  function toast(message) {
    const node = document.createElement("div");
    node.className = "toast";
    node.innerHTML = `<span>✓</span><span>${escapeHTML(message)}</span>`;
    $("#toastRegion").append(node);
    setTimeout(() => node.remove(), 3000);
  }
  function toggleMode(mode) {
    state.mode = mode;
    $("#timeOptions").classList.toggle("hidden", mode !== "time");
    $("#wordOptions").classList.toggle("hidden", mode !== "words");
    setPressed("[data-mode]", "mode", mode);
    resetTest();
  }

  // Settings and primary interactions.
  state.sound = Boolean(state.settings.sound);
  $("#soundToggle").setAttribute("aria-pressed", String(state.sound));
  $("#soundLabel").textContent = state.sound ? "Sound on" : "Sound off";
  $("#soundToggle").addEventListener("click", () => {
    state.sound = !state.sound;
    $("#soundToggle").setAttribute("aria-pressed", String(state.sound));
    $("#soundLabel").textContent = state.sound ? "Sound on" : "Sound off";
    saveData();
    toast(state.sound ? "Keystroke sounds enabled." : "Keystroke sounds disabled.");
  });
  $$("[data-mode]").forEach(button => button.addEventListener("click", () => toggleMode(button.dataset.mode)));
  $$("[data-duration]").forEach(button => button.addEventListener("click", () => {
    state.duration = Number(button.dataset.duration); setPressed("[data-duration]", "duration", state.duration); resetTest();
  }));
  $$("[data-wordcount]").forEach(button => button.addEventListener("click", () => {
    state.wordCount = Number(button.dataset.wordcount); setPressed("[data-wordcount]", "wordcount", state.wordCount); resetTest();
  }));
  $("#contentMode").addEventListener("change", event => { state.content = event.target.value; resetTest(); });
  $("#resetButton").addEventListener("click", () => resetTest(true));
  $("#typingOverlay").addEventListener("click", focusTyping);
  $("#typingArea").addEventListener("click", focusTyping);
  input.addEventListener("input", onInput);
  input.addEventListener("paste", event => {
    // Paste would bypass the intended typing challenge.
    event.preventDefault();
    toast("Pasting is disabled during a typing test.");
  });
  input.addEventListener("keydown", event => {
    if (event.key === "Tab") {
      if (event.shiftKey) return;
      event.preventDefault();
      if (event.key === "Tab") {
        const handleEnter = e => {
          if (e.key === "Enter") { e.preventDefault(); resetTest(true); input.removeEventListener("keydown", handleEnter); }
        };
        input.addEventListener("keydown", handleEnter, { once: true });
        setTimeout(() => input.removeEventListener("keydown", handleEnter), 1600);
      }
    }
    if (event.key === "Escape" && state.focus) toggleFocus();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      $("#resultBackdrop").classList.add("hidden");
      $("#helpBackdrop").classList.add("hidden");
      if (state.focus) toggleFocus();
    }
    if ((event.key === "Enter" && (event.ctrlKey || event.metaKey)) && !$("#resultBackdrop").classList.contains("hidden")) {
      $("#resultBackdrop").classList.add("hidden"); resetTest(true);
    }
  });
  function toggleFocus() {
    state.focus = !state.focus;
    document.body.classList.toggle("focus-mode", state.focus);
    $("#focusButton").innerHTML = state.focus ? "<span>⌗</span> Exit focus" : "<span>⌗</span> Focus mode";
    if (state.focus) focusTyping();
  }
  $("#focusButton").addEventListener("click", toggleFocus);
  $("#helpButton").addEventListener("click", () => $("#helpBackdrop").classList.remove("hidden"));
  $("#closeHelp").addEventListener("click", () => $("#helpBackdrop").classList.add("hidden"));
  $("#helpDone").addEventListener("click", () => $("#helpBackdrop").classList.add("hidden"));
  $("#helpBackdrop").addEventListener("click", event => { if (event.target === $("#helpBackdrop")) $("#helpBackdrop").classList.add("hidden"); });
  $("#closeResults").addEventListener("click", () => { $("#resultBackdrop").classList.add("hidden"); resetTest(true); });
  $("#tryAgainButton").addEventListener("click", () => { $("#resultBackdrop").classList.add("hidden"); resetTest(true); });
  $("#resultStats").addEventListener("click", () => { $("#resultBackdrop").classList.add("hidden"); showPage("stats"); });
  $("#viewStatsButton").addEventListener("click", () => showPage("stats"));
  $("#backToTest").addEventListener("click", () => showPage("test"));
  $$(".nav-link").forEach(button => button.addEventListener("click", () => showPage(button.dataset.page)));
  $("#clearHistoryButton").addEventListener("click", () => {
    if (!state.history.length) { toast("There is no history to clear."); return; }
    if (!confirm("Clear all saved test history and personal records? This cannot be undone.")) return;
    state.history = [];
    saveData(); renderStats(); updateBestCard(); toast("Test history cleared.");
  });
  window.addEventListener("resize", () => {
    if ($("#statsPage").classList.contains("active-page")) drawChart($("#wpmChart"), state.history.slice(0, 12).reverse());
  });

  // Make sure first render has a target and persisted stats.
  renderStats();
  updateBestCard();
  resetTest();
})();