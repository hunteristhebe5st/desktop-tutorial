// Hunter's App — everything is stored in this browser (localStorage).
const KEY = "hunters-app-v1";

const defaults = () => ({
  name: "Hunter",
  apps: [
    { icon: "✉️", name: "Gmail", url: "https://mail.google.com" },
    { icon: "▶️", name: "YouTube", url: "https://youtube.com" },
    { icon: "🎮", name: "Roblox", url: "https://www.roblox.com" },
    { icon: "🕹️", name: "Steam", url: "https://store.steampowered.com" },
    { icon: "🎧", name: "Spotify", url: "https://open.spotify.com" },
    { icon: "💬", name: "Discord", url: "https://discord.com/app" },
    { icon: "📁", name: "Drive", url: "https://drive.google.com" },
    { icon: "🐙", name: "GitHub", url: "https://github.com" },
  ],
  games: [],
  tx: [],
  mail: [],
});

let state = load();
let gameFilter = "all";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch (e) { /* storage unavailable */ }
  return defaults();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  render();
}

const $ = (s) => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10);
const money = (n) => (n < 0 ? "-" : "") + "$" + Math.abs(n).toFixed(2);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const safeUrl = (u) => (/^https?:\/\//i.test(u) ? u : "https://" + u);

// ---------- Tabs ----------
document.querySelectorAll("#tabs button").forEach((b) =>
  b.addEventListener("click", () => showTab(b.dataset.tab))
);
function showTab(id) {
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
  document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === id));
  try { localStorage.setItem(KEY + "-tab", id); } catch (e) {}
}

// ---------- Clock & greeting ----------
function tick() {
  const d = new Date();
  $("#clock").innerHTML =
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + "<br>" +
    d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  const h = d.getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  $("#greeting").textContent = `${part}, ${state.name || "Hunter"} 👋`;
}

// ---------- Rendering ----------
function totals() {
  let inc = 0, out = 0, monthOut = 0;
  const ym = today().slice(0, 7);
  for (const t of state.tx) {
    if (t.type === "in") inc += t.amount;
    else { out += t.amount; if (t.date.startsWith(ym)) monthOut += t.amount; }
  }
  return { inc, out, bal: inc - out, monthOut };
}

function appTile(a, i, removable) {
  return `<a class="app" href="${esc(safeUrl(a.url))}" target="_blank" rel="noopener">
    <span class="ico">${esc(a.icon || "🔗")}</span><span>${esc(a.name)}</span>
    ${removable ? `<button class="x" data-del-app="${i}" title="Remove">×</button>` : ""}
  </a>`;
}

function txItem(t, removable) {
  const sign = t.type === "in" ? "+" : "-";
  return `<li>
    <div class="grow"><div>${esc(t.desc)}</div><div class="sub">${esc(t.cat)} · ${esc(t.date)}</div></div>
    <span class="amt ${t.type === "in" ? "good" : "bad"}">${sign}${money(t.amount)}</span>
    ${removable ? `<button class="x" data-del-tx="${t.id}" title="Delete">×</button>` : ""}
  </li>`;
}

function setList(el, html, emptyMsg) {
  el.innerHTML = html || `<li class="sub">${emptyMsg}</li>`;
}

function render() {
  const t = totals();
  const sortedTx = [...state.tx].sort((a, b) => b.date.localeCompare(a.date));
  const playing = state.games.filter((g) => g.status === "playing").length;

  // Home
  $("#stat-balance").textContent = money(t.bal);
  $("#stat-spent").textContent = money(t.monthOut);
  $("#stat-mail").textContent = state.mail.length;
  $("#stat-games").textContent = playing;
  $("#home-apps").innerHTML = state.apps.slice(0, 8).map((a, i) => appTile(a, i, false)).join("");
  setList($("#home-tx"), sortedTx.slice(0, 5).map((x) => txItem(x, false)).join(""), "No transactions yet — add one in the Transactions tab.");

  // Gmail follow-ups
  setList($("#mail-list"), state.mail.map((m) => `<li>
      <input type="checkbox" data-done-mail="${m.id}" title="Done" style="flex:none">
      <div class="grow"><div>${esc(m.subject)}</div><div class="sub">From ${esc(m.from)} · added ${esc(m.date)}</div></div>
      <a class="btn" target="_blank" rel="noopener" href="https://mail.google.com/mail/u/0/#search/${encodeURIComponent(m.from + " " + m.subject)}">Find</a>
    </li>`).join(""), "Nothing to follow up on. Nice!");

  // Apps
  $("#app-grid").innerHTML = state.apps.map((a, i) => appTile(a, i, true)).join("") ||
    `<p class="muted">No apps yet. Add one below.</p>`;

  // Games
  const games = state.games.filter((g) => gameFilter === "all" || g.status === gameFilter);
  $("#game-list").innerHTML = games.map((g) => `<div class="game">
      <div class="top"><span class="name">${esc(g.name)}</span><button class="x" data-del-game="${g.id}" title="Remove">×</button></div>
      <div><span class="tag">${esc(g.platform)}</span></div>
      <select data-status-game="${g.id}">
        <option value="playing" ${g.status === "playing" ? "selected" : ""}>Playing</option>
        <option value="wishlist" ${g.status === "wishlist" ? "selected" : ""}>Wishlist</option>
        <option value="done" ${g.status === "done" ? "selected" : ""}>Beat it</option>
      </select>
      <div class="hours">⏱️ ${g.hours} hrs played
        <button class="btn" data-hour-game="${g.id}" data-d="-1">−</button>
        <button class="btn" data-hour-game="${g.id}" data-d="1">+</button>
      </div>
    </div>`).join("") || `<p class="muted">No games here yet. Add one above.</p>`;

  // Money
  $("#m-in").textContent = money(t.inc);
  $("#m-out").textContent = money(t.out);
  $("#m-bal").textContent = money(t.bal);
  setList($("#tx-list"), sortedTx.map((x) => txItem(x, true)).join(""), "No transactions yet.");

  const cats = {};
  state.tx.filter((x) => x.type === "out").forEach((x) => (cats[x.cat] = (cats[x.cat] || 0) + x.amount));
  const entries = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const max = entries[0]?.[1] || 1;
  $("#cat-bars").innerHTML = entries.map(([c, v]) => `<div class="bar">
      <div class="lbl"><span>${esc(c)}</span><span>${money(v)}</span></div>
      <div class="track"><div class="fill" style="width:${(v / max) * 100}%"></div></div>
    </div>`).join("") || `<p class="muted">Add some spending to see where your money goes.</p>`;

  $("#name-input").value = state.name || "";
  tick();
}

// ---------- Forms ----------
$("#mail-search").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = $("#mail-q").value.trim();
  window.open("https://mail.google.com/mail/u/0/#search/" + encodeURIComponent(q), "_blank", "noopener");
});

$("#mail-form").addEventListener("submit", (e) => {
  e.preventDefault();
  state.mail.unshift({ id: uid(), from: $("#mail-from").value.trim(), subject: $("#mail-subject").value.trim(), date: today() });
  e.target.reset();
  save();
});

$("#app-form").addEventListener("submit", (e) => {
  e.preventDefault();
  state.apps.push({ icon: $("#app-icon").value.trim() || "🔗", name: $("#app-name").value.trim(), url: $("#app-url").value.trim() });
  e.target.reset();
  save();
});

$("#game-form").addEventListener("submit", (e) => {
  e.preventDefault();
  state.games.unshift({ id: uid(), name: $("#game-name").value.trim(), platform: $("#game-platform").value, status: $("#game-status").value, hours: 0 });
  $("#game-name").value = "";
  save();
});

$("#tx-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = parseFloat($("#tx-amount").value);
  if (!(amount > 0)) return;
  state.tx.push({ id: uid(), type: $("#tx-type").value, desc: $("#tx-desc").value.trim(), amount, cat: $("#tx-cat").value, date: $("#tx-date").value || today() });
  $("#tx-desc").value = ""; $("#tx-amount").value = "";
  save();
});
$("#tx-date").value = today();

$("#name-form").addEventListener("submit", (e) => {
  e.preventDefault();
  state.name = $("#name-input").value.trim() || "Hunter";
  save();
});

$("#game-filter").addEventListener("click", (e) => {
  const b = e.target.closest("[data-f]");
  if (!b) return;
  gameFilter = b.dataset.f;
  document.querySelectorAll("#game-filter .chip").forEach((c) => c.classList.toggle("active", c === b));
  render();
});

// ---------- Delegated clicks ----------
document.addEventListener("click", (e) => {
  const el = e.target;
  if (el.dataset.delApp !== undefined) { e.preventDefault(); state.apps.splice(+el.dataset.delApp, 1); save(); }
  else if (el.dataset.delTx) { state.tx = state.tx.filter((t) => t.id !== el.dataset.delTx); save(); }
  else if (el.dataset.delGame) { state.games = state.games.filter((g) => g.id !== el.dataset.delGame); save(); }
  else if (el.dataset.hourGame) {
    const g = state.games.find((x) => x.id === el.dataset.hourGame);
    if (g) { g.hours = Math.max(0, g.hours + +el.dataset.d); save(); }
  }
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset.doneMail) { state.mail = state.mail.filter((m) => m.id !== el.dataset.doneMail); save(); }
  else if (el.dataset.statusGame) {
    const g = state.games.find((x) => x.id === el.dataset.statusGame);
    if (g) { g.status = el.value; save(); }
  }
});

// ---------- Backup ----------
$("#export-btn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `hunters-app-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});
$("#import-file").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    state = { ...defaults(), ...JSON.parse(await f.text()) };
    save();
    alert("Backup restored!");
  } catch { alert("That file isn't a valid backup."); }
});
$("#reset-btn").addEventListener("click", () => {
  if (confirm("Erase all your apps, games, transactions and notes?")) { state = defaults(); save(); }
});

// ---------- Start ----------
try { const t = localStorage.getItem(KEY + "-tab"); if (t && document.getElementById(t)) showTab(t); } catch (e) {}
render();
setInterval(tick, 30000);
