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
#dash{display:none}.leg{display:flex;gap:12px;flex-wrap:wrap;margin-top:6px;font-size:13px}
.leg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px}
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
  <div class="row sb" style="margin-bottom:12px"><span class="mut" id="per"></span><button id="change">Change period</button></div>
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
      <div class="row"><label>Rate (EUR/kWh)<input id="rate" size="6" inputmode="decimal" placeholder="optional"></label>
      <button class="p" id="csv">Export CSV</button></div></div>
    <p class="mut" style="margin:0 0 8px" id="exinfo"></p>
    <div class="scroll"><table><thead><tr><th>Day</th><th>Start</th><th>End</th><th>User</th><th class="n">kWh</th></tr></thead><tbody id="rows"></tbody></table></div>
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
    $("#csv").onclick = () => this.exportCsv();
  }
  set hass(h) { this._h = h; this.$("ha-menu-button").hass = h; }
  set narrow(v) { this.$("ha-menu-button").narrow = v; }

  async load() {
    const $ = this.$;
    this.range = { start: $("#from").value, end: $("#to").value };
    $("#err").textContent = "";
    if (!this.range.start || !this.range.end || this.range.start > this.range.end) {
      $("#err").textContent = "Pick a valid period."; return;
    }
    $("#load").disabled = true; $("#load").textContent = "Loading…";
    try {
      const d = await this._h.callApi("GET", `fusionsolar_charging/sessions?start=${this.range.start}&end=${this.range.end}`);
      this.rows = d.sessions;
      if (d.rate && !$("#rate").value) $("#rate").value = d.rate;
      this.show();
    } catch (e) {
      $("#err").textContent = "Could not load sessions: " + (e.body?.message || e.message || JSON.stringify(e));
    }
    $("#load").disabled = false; $("#load").textContent = "Show sessions";
  }

  show() {
    const $ = this.$, rows = this.rows;
    $("#pick").style.display = "none"; $("#dash").style.display = "block";
    $("#per").textContent = `${this.range.start} to ${this.range.end}`;
    const agg = {}; rows.forEach(r => { const a = agg[r.user] ||= { n: 0, k: 0 }; a.n++; a.k += r.kwh; });
    this.users = Object.keys(agg).sort((a, b) => agg[b].k - agg[a].k);
    const tk = rows.reduce((s, r) => s + r.kwh, 0);
    $("#tkwh").textContent = f1(tk); $("#tses").textContent = rows.length;
    $("#users").innerHTML = this.users.length ? this.users.map(u =>
      `<tr class="u" data-u="${esc(u)}"><td>${esc(u)}</td><td class="n">${agg[u].n}</td><td class="n">${f1(agg[u].k)}</td><td><div class="bar" style="width:${tk ? agg[u].k / tk * 100 : 0}%"></div></td></tr>`).join("")
      : '<tr><td colspan="4" class="mut">No sessions in this period.</td></tr>';
    this.shadowRoot.querySelectorAll("tr.u").forEach(t => t.onclick = () => { $("#usel").value = t.dataset.u; $("#usel").onchange(); });
    $("#usel").innerHTML = '<option value="">All users</option>' + this.users.map(u => `<option>${esc(u)}</option>`).join("");
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
    const val = (u, d) => this.rows.filter(r => r.user === u && r.day === d).reduce((s, r) => s + r.kwh, 0);
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
        g += `<rect x="${L + i * bw + bw * .1}" y="${y}" width="${bw * .8}" height="${h}" fill="${COL[this.users.indexOf(u) % COL.length]}"><title>${d} ${esc(u)}: ${v.toFixed(2)} kWh</title></rect>`;
      });
      if (i % Math.ceil(ds.length / 12) === 0) g += `<text x="${L + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${d.slice(5)}</text>`;
    });
    $("#chart").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="kWh per day">${g}</svg>`;
    $("#leg").innerHTML = us.map(u => `<span><i style="background:${COL[this.users.indexOf(u) % COL.length]}"></i>${esc(u)}</span>`).join("");
  }

  list() {
    const $ = this.$, sel = $("#usel").value, v = this.rows.filter(r => !sel || r.user === sel);
    $("#rows").innerHTML = v.map(r => `<tr><td>${r.day}</td><td>${r.start}</td><td>${r.end}</td><td>${esc(r.user)}</td><td class="n">${r.kwh.toFixed(2)}</td></tr>`).join("");
    $("#exinfo").textContent = `CSV export covers: ${sel || "all users"} (${v.length} sessions).`;
  }

  async exportCsv() {
    const $ = this.$, sel = $("#usel").value;
    const p = new URLSearchParams({ start: this.range.start, end: this.range.end, rate: $("#rate").value });
    if (sel) p.set("user", sel);
    try {
      const r = await this._h.fetchWithAuth(`/api/fusionsolar_charging/export?${p}`);
      if (!r.ok) throw new Error(r.status);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(await r.blob());
      a.download = `charging_${this.range.start}_${this.range.end}${sel ? "_" + sel.replace(/\W/g, "") : ""}.csv`;
      a.click(); URL.revokeObjectURL(a.href);
    } catch (e) { $("#exinfo").textContent = "Export failed: " + e.message; }
  }
}
customElements.define("fusionsolar-charging-panel", FusionSolarChargingPanel);
