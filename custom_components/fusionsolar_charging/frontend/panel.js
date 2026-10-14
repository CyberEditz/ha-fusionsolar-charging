const COL = ["#1f7a5a", "#d98324", "#3b6fb6", "#b5446e", "#7a5cc4", "#2a9d8f", "#c0392b", "#8d8d2f"];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const iso = d => d.toLocaleDateString("sv-SE");
const f1 = x => x.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const T = `<style>
:host{display:block;background:var(--primary-background-color);color:var(--primary-text-color);min-height:100vh}
.top{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--app-header-background-color,var(--primary-color));color:var(--app-header-text-color,#fff)}
.top h1{font-size:20px;font-weight:500;margin:0;flex:1}
main{max-width:980px;margin:0 auto;padding:16px}
.card{background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:10px;padding:14px;margin-bottom:14px}
h2{font-size:16px;margin:0 0 10px}.mut{color:var(--secondary-text-color)}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:end}.sb{justify-content:space-between}
label{display:flex;flex-direction:column;font-size:13px;color:var(--secondary-text-color);gap:3px}
input,select,button{font:inherit;padding:7px 10px;border-radius:7px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}
button{cursor:pointer}button.p{background:var(--primary-color);border-color:var(--primary-color);color:#fff;font-weight:600}
:focus-visible{outline:2px solid var(--primary-color);outline-offset:1px}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--divider-color)}
th{font-size:13px;color:var(--secondary-text-color);font-weight:600}.n{text-align:right;font-variant-numeric:tabular-nums}
.bar{height:8px;border-radius:4px;background:var(--primary-color);min-width:2px}
tr.u{cursor:pointer}tr.u:hover{background:var(--secondary-background-color)}
.big{font-size:26px;font-weight:700}.tot{display:flex;gap:28px;margin-bottom:10px}
#err{color:var(--error-color,#c0392b);margin-top:10px}.scroll{max-height:380px;overflow:auto}
#dash{display:none}.warn{border-left:4px solid var(--warning-color,#e8a200);padding:8px 12px;margin-bottom:12px;background:var(--card-background-color)}.warn:empty{display:none}.nm{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-bottom:10px}.leg{display:flex;gap:12px;flex-wrap:wrap;margin-top:6px;font-size:13px}
.leg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px}
.chip{font-size:11px;padding:1px 8px;border-radius:10px;border:1px solid var(--divider-color);white-space:nowrap}.chip.live{color:var(--success-color,#2e7d32);border-color:currentColor}.chip:empty{display:none}
button.ic{padding:0 6px;border:0;background:none;color:var(--secondary-text-color)}td input{padding:3px 6px}
.pick{display:flex;gap:6px 14px;flex-wrap:wrap;margin:0 0 8px}.pick label{flex-direction:row;align-items:center;color:var(--primary-text-color);gap:5px}.ren{font-style:italic}
svg{width:100%;height:auto}svg text{fill:var(--secondary-text-color);font-size:11px}
</style>
<div class="top"><ha-menu-button></ha-menu-button><h1>EV charging</h1></div>
<main>
<section id="pick" class="card">
  <h2>Choose a period</h2>
  <div class="row" id="pre" style="margin-bottom:12px">
    <button data-p="this">This month</button><button data-p="last">Last month</button>
    <button data-p="3m">Last 3 months</button><button data-p="year">This year</button>
  </div>
  <div class="row">
    <label>From<input type="date" id="from"></label>
    <label>To<input type="date" id="to"></label>
    <button class="p" id="load">Show sessions</button>
  </div>
  <div id="err" role="alert"></div>
</section>
<div id="dash">
  <div class="row sb" style="margin-bottom:12px"><span class="mut"><span id="per"></span> · <span id="upd"></span> <span class="chip" id="src"></span></span>
    <div class="row"><button id="refresh" title="Fetch new data from FusionSolar now">Force refresh</button><button id="change">Change period</button></div></div>
  <div class="warn" id="warn" role="alert"></div>
  <section class="card"><h2>Usage per user</h2>
    <div class="tot"><div><div class="big" id="tkwh"></div><span class="mut">kWh charged</span></div>
    <div><div class="big" id="tses"></div><span class="mut">sessions</span></div></div>
    <table><thead><tr><th>User</th><th class="n">Sessions</th><th class="n">kWh</th><th style="width:30%">Share</th></tr></thead><tbody id="users"></tbody></table>
  </section>
  <section class="card">
    <div class="row sb" style="margin-bottom:8px"><h2 style="margin:0">kWh per day</h2><label>User<select id="usel"></select></label></div>
    <div id="chart"></div><div class="leg" id="leg"></div>
  </section>
  <section class="card">
    <div class="row sb" style="margin-bottom:8px"><h2 style="margin:0">Sessions</h2>
      <div class="row"><button class="p" id="csv">Export CSV</button><button class="p" id="xlsx">Export Excel</button></div></div>
    <div class="pick" id="expick" role="group" aria-label="Users to include in the export"></div>
    <p class="mut" style="margin:0 0 8px" id="exinfo"></p>
    <div class="scroll"><table><thead id="rhead"></thead><tbody id="rows"></tbody></table></div>
    <p class="mut" id="hwnote" style="margin:8px 0 0;font-size:13px"></p>
  </section>
  <section class="card"><h2>Names</h2>
    <p class="mut" style="margin-top:0">Give an account ID a nickname. Accounts with the same nickname are combined into one user, on this page and in exports. To rename a single session, use ✎ in the sessions table.</p>
    <div class="nm" id="names"></div>
    <div class="row"><button id="savenames">Save names</button><span class="mut" id="nmsg"></span></div>
  </section>
</div></main>`;

class FusionSolarChargingPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML = T;
    this.rows = []; this.users = []; this.range = {};
    const $ = this.$ = s => this.shadowRoot.querySelector(s);
    const n = new Date(), y = n.getFullYear(), m = n.getMonth();
    const presets = {
      this: [new Date(y, m, 1), n], last: [new Date(y, m - 1, 1), new Date(y, m, 0)],
      "3m": [new Date(y, m - 2, 1), n], year: [new Date(y, 0, 1), n],
    };
    const setP = p => { $("#from").value = iso(presets[p][0]); $("#to").value = iso(presets[p][1]); };
    this.shadowRoot.querySelectorAll("#pre button").forEach(b => b.onclick = () => setP(b.dataset.p));
    setP("this");
    $("#load").onclick = () => this.load();
    $("#change").onclick = () => { $("#dash").style.display = "none"; $("#pick").style.display = ""; };
    $("#usel").onchange = () => { this.draw(); this.list(); };
    $("#csv").onclick = () => this.exportFile("csv");
    $("#xlsx").onclick = () => this.exportFile("xlsx");
    $("#refresh").onclick = () => this.load(true);
    $("#savenames").onclick = () => this.saveNames();
    this.names = {}; this.exOff = new Set(); this.deltas = {}; this.hw = null; this.accounts = [];
    $("#expick").onchange = e => { const i = e.target; if (i.checked) this.exOff.delete(i.value); else this.exOff.add(i.value); this.exinfo(); };
    $("#rows").onclick = e => this.rowClick(e);
  }
  set hass(h) { this._h = h; this.$("ha-menu-button").hass = h; }
  set narrow(v) { this.$("ha-menu-button").narrow = v; }

  nm(u) { return u; }  // users are already merged nicknames
  canEdit() { return !!this._h?.user?.is_admin; }
  err(e) { return e.body?.message || e.message || JSON.stringify(e); }

  async load(refresh = false) {
    const $ = this.$;
    this.range = { start: $("#from").value, end: $("#to").value };
    $("#err").textContent = "";
    if (!this.range.start || !this.range.end || this.range.start > this.range.end) {
      $("#err").textContent = "Pick a valid period."; return;
    }
    $("#load").disabled = true; $("#refresh").disabled = true; $("#load").textContent = "Loading…";
    try {
      const d = await this._h.callApi("GET", `fusionsolar_charging/sessions?start=${this.range.start}&end=${this.range.end}${refresh ? "&refresh=1" : ""}`);
      this.rows = d.sessions; this.names = d.names || {}; this.deltas = d.deltas || {}; this.hw = d.homewizard || null;
      const src = $("#src"), live = d.source === "live";
      src.className = "chip" + (live ? " live" : "");
      src.textContent = live ? "● Live from FusionSolar" : "● From cache";
      src.title = live ? "Fetched from FusionSolar just now"
        : `Served from saved data. The running month refreshes automatically after ${Math.round((d.ttl || 300) / 60)} min; closed months are kept permanently. Use Force refresh to fetch now.`;
      $("#upd").textContent = d.updated ? "Updated " + new Date(d.updated).toLocaleString() : "";
      this.show();
      $("#warn").textContent = d.warning ? "Showing saved data. " + d.warning : "";
    } catch (e) {
      const msg = "Could not load sessions: " + this.err(e);
      if ($("#dash").style.display === "block") $("#warn").textContent = msg; else $("#err").textContent = msg;
    }
    $("#load").disabled = false; $("#refresh").disabled = false; $("#load").textContent = "Show sessions";
  }

  show() {
    const $ = this.$, rows = this.rows, prev = $("#usel").value;
    $("#pick").style.display = "none"; $("#dash").style.display = "block";
    $("#per").textContent = `${this.range.start} to ${this.range.end}`;
    const agg = {}; rows.forEach(r => { const a = agg[r.name] ||= { n: 0, k: 0, acc: new Set() }; a.n++; a.k += r.kwh; a.acc.add(r.user); });
    this.users = Object.keys(agg).sort((a, b) => agg[b].k - agg[a].k);
    const tk = rows.reduce((s, r) => s + r.kwh, 0);
    $("#tkwh").textContent = f1(tk); $("#tses").textContent = rows.length;
    $("#users").innerHTML = this.users.length ? this.users.map(u =>
      `<tr class="u" data-u="${esc(u)}"><td>${esc(u)}${[...agg[u].acc].some(a => a !== u) ? `<div class="mut" style="font-size:12px">${esc([...agg[u].acc].join(", "))}</div>` : ""}</td><td class="n">${agg[u].n}</td><td class="n">${f1(agg[u].k)}</td><td><div class="bar" style="width:${tk ? agg[u].k / tk * 100 : 0}%"></div></td></tr>`).join("")
      : '<tr><td colspan="4" class="mut">No sessions in this period.</td></tr>';
    this.shadowRoot.querySelectorAll("tr.u").forEach(t => t.onclick = () => { $("#usel").value = t.dataset.u; $("#usel").onchange(); });
    $("#usel").innerHTML = '<option value="">All users</option>' + this.users.map(u => `<option value="${esc(u)}">${esc(this.nm(u))}</option>`).join("");
    if (this.users.includes(prev)) $("#usel").value = prev;
    this.accounts = [...new Set(rows.map(r => r.user))].sort();
    $("#names").innerHTML = this.accounts.map(a => `<label>${esc(a)}<input data-u="${esc(a)}" value="${esc(this.names[a] || "")}" placeholder="Nickname"></label>`).join("");
    $("#expick").innerHTML = this.users.map(u => `<label><input type="checkbox" value="${esc(u)}" ${this.exOff.has(u) ? "" : "checked"}> ${esc(u)}</label>`).join("");
    this.draw(); this.list();
  }

  days() {
    const o = [];
    for (let d = new Date(this.range.start + "T12:00"); iso(d) <= this.range.end; d.setDate(d.getDate() + 1)) o.push(iso(d));
    return o;
  }

  draw() {
    const $ = this.$, sel = $("#usel").value, ds = this.days(), us = sel ? [sel] : this.users;
    const W = 900, H = 280, L = 40, B = 24, T = 10, pw = W - L - 8, ph = H - B - T, bw = pw / ds.length;
    const val = (u, d) => this.rows.filter(r => r.name === u && r.day === d).reduce((s, r) => s + r.kwh, 0);
    const totals = ds.map(d => us.reduce((s, u) => s + val(u, d), 0));
    const step = Math.pow(10, Math.floor(Math.log10(Math.max(...totals, 1) / 4)));
    const nice = [1, 2, 5, 10].map(k => k * step).find(k => Math.max(...totals, 1) / k <= 5) || step * 10;
    const max = Math.ceil(Math.max(...totals, 1) / nice) * nice;
    let g = "";
    for (let v = 0; v <= max; v += nice) {
      const y = T + ph - v / max * ph;
      g += `<line x1="${L}" x2="${W - 8}" y1="${y}" y2="${y}" stroke="var(--divider-color)"/><text x="${L - 6}" y="${y + 4}" text-anchor="end">${v}</text>`;
    }
    ds.forEach((d, i) => {
      let base = 0;
      us.forEach(u => {
        const v = val(u, d); if (!v) return;
        const h = v / max * ph, y = T + ph - base - h; base += h;
        g += `<rect x="${L + i * bw + bw * .1}" y="${y}" width="${bw * .8}" height="${h}" fill="${COL[this.users.indexOf(u) % COL.length]}"><title>${d} ${esc(this.nm(u))}: ${v.toFixed(2)} kWh</title></rect>`;
      });
      if (i % Math.ceil(ds.length / 12) === 0) g += `<text x="${L + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${d.slice(5)}</text>`;
    });
    $("#chart").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="kWh per day">${g}</svg>`;
    $("#leg").innerHTML = us.map(u => `<span><i style="background:${COL[this.users.indexOf(u) % COL.length]}"></i>${esc(this.nm(u))}</span>`).join("");
  }

  list() {
    const $ = this.$, sel = $("#usel").value, v = this.rows.filter(r => !sel || r.name === sel);
    const hw = !!this.hw, ed = this.canEdit(), seen = new Set();
    $("#rhead").innerHTML = `<tr><th>Day</th><th>Start</th><th>End</th><th>User</th><th class="n">kWh</th>${hw ? '<th class="n" title="Charger kWh that day (all users) minus net grid usage (import − export) from HomeWizard. Positive: the charger used more than the house drew from the grid, so solar or battery covered the difference.">Δ grid (day)</th>' : ""}<th>Source</th></tr>`;
    $("#rows").innerHTML = v.map(r => {
      let dc = "";
      if (hw) {
        const d = !seen.has(r.day) ? this.deltas[r.day] : undefined; seen.add(r.day);
        dc = `<td class="n">${d === undefined ? "" : (d > 0 ? "+" : "") + d.toFixed(2)}</td>`;
      }
      const tip = `Fetched ${r.fetched ? new Date(r.fetched).toLocaleString() : "?"}${r.final ? " · month closed, kept permanently" : " · running month, refreshes after 5 min"}`;
      const ren = r.renamed ? ` <span title="Renamed for this session only (account ${esc(r.user)})">✎</span>` : "";
      const btn = ed ? `<button class="ic" data-id="${esc(r.id)}" title="Rename the user of this session" aria-label="Rename user of this session">✎</button>` : "";
      return `<tr><td>${r.day}</td><td>${r.start}</td><td>${r.end}</td><td class="${r.renamed ? "ren" : ""}">${esc(r.name)}${ed ? "" : ren}${btn}</td><td class="n">${r.kwh.toFixed(2)}</td>${dc}<td><span class="chip${r.source === "live" ? " live" : ""}" title="${esc(tip)}">${r.source === "live" ? "live" : "cached"}</span></td></tr>`;
    }).join("");
    $("#hwnote").textContent = hw ? `HomeWizard (${this.hw.join(", ")}): Δ grid = all charger sessions of that day − net grid usage (import − export). Shown on the first row of each day.` : "";
    this.exinfo();
  }

  exinfo() {
    const on = this.users.filter(u => !this.exOff.has(u)), n = this.rows.filter(r => on.includes(r.name)).length;
    this.$("#exinfo").textContent = on.length ? `Export covers ${on.length} of ${this.users.length} users (${n} sessions).` : "Select at least one user to export.";
  }

  rowClick(e) {
    const b = e.target.closest("button"); if (!b) return;
    const td = b.closest("td");
    if (b.dataset.id) this.editCell(td, b.dataset.id);
    else if (b.classList.contains("no")) this.list();
    else if (b.classList.contains("ok")) this.saveOverride(td);
  }

  editCell(td, id) {
    const r = this.rows.find(x => x.id === id); if (!r) return;
    td.innerHTML = `<input list="nmlist" value="${esc(r.name)}" placeholder="${esc(r.user)}" data-id="${esc(id)}" size="14" aria-label="User name for this session" title="Clear the field to go back to the account's default name"><button class="ic ok" title="Save" aria-label="Save">✓</button><button class="ic no" title="Cancel" aria-label="Cancel">✕</button><datalist id="nmlist">${this.users.map(u => `<option value="${esc(u)}">`).join("")}</datalist>`;
    const i = td.querySelector("input"); i.focus(); i.select();
    i.onkeydown = ev => { if (ev.key === "Enter") this.saveOverride(td); if (ev.key === "Escape") this.list(); };
  }

  async saveOverride(td) {
    const i = td.querySelector("input"), r = this.rows.find(x => x.id === i.dataset.id);
    if (r && !r.renamed && i.value.trim() === r.name) { this.list(); return; }
    try {
      await this._h.callApi("POST", "fusionsolar_charging/override", { id: i.dataset.id, name: i.value });
      await this.load(false);
    } catch (e) { this.$("#warn").textContent = "Could not rename: " + this.err(e); }
  }

  async exportFile(fmt) {
    const $ = this.$, on = this.users.filter(u => !this.exOff.has(u));
    if (!on.length) { this.exinfo(); return; }
    const p = new URLSearchParams({ start: this.range.start, end: this.range.end, format: fmt });
    const subset = on.length < this.users.length;
    if (subset) on.forEach(u => p.append("user", u));
    try {
      const r = await this._h.fetchWithAuth(`/api/fusionsolar_charging/export?${p}`);
      if (!r.ok) { let m = r.status; try { m = (await r.json()).message; } catch (_) {} throw new Error(m); }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(await r.blob());
      a.download = `charging_${this.range.start}_${this.range.end}${subset ? "_" + on.map(u => u.replace(/\W/g, "")).join("-").slice(0, 40) : ""}.${fmt}`;
      a.click(); URL.revokeObjectURL(a.href);
    } catch (e) { $("#exinfo").textContent = "Export failed: " + e.message; }
  }

  async saveNames() {
    const $ = this.$, names = {};
    this.shadowRoot.querySelectorAll("#names input").forEach(i => names[i.dataset.u] = i.value);
    try {
      await this._h.callApi("POST", "fusionsolar_charging/names", { names });
      await this.load(false); $("#nmsg").textContent = "Saved.";
    } catch (e) { $("#nmsg").textContent = "Could not save: " + this.err(e); }
  }
}
customElements.define("fusionsolar-charging-panel", FusionSolarChargingPanel);
