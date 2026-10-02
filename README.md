# FusionSolar Charging Sessions (Home Assistant / HACS)

Sidebar dashboard for your Huawei FusionSolar EV charger.

- Pick a period first, then see kWh per user, a per-day chart (all users or one user)
  and the session list (day, start, end, user, kWh).
- Export for the accountant as **CSV** (sessions, total, per-user totals) or **Excel**
  (sheet "Sessions" with a total, sheet "Per user"). No prices are included.
- **Cache**: finished months are saved in Home Assistant storage and never fetched again;
  the running month refreshes at most every 5 minutes. Use **Refresh** to force a fetch.
  If FusionSolar is unreachable, saved data is shown with a warning.
- **Names**: map account IDs to real names (Names card, administrators only). Names appear
  on the page and in both exports; the account ID stays in a separate export column.
- **Login problems**: clear messages (wrong password, captcha, network). A wrong password
  starts Home Assistant's re-authentication prompt and stops further login attempts
  until you enter the new password, so the account isn't locked.

## Install
1. Put this repository on GitHub (replace `YOUR_USER` in `manifest.json`).
2. HACS > Integrations > ⋮ > Custom repositories > add the repo URL, category **Integration**.
3. Download it in HACS and restart Home Assistant.
4. Settings > Devices & services > Add integration > **FusionSolar Charging Sessions**:
   owner username/password, portal subdomain (e.g. `uni004eu5`), charger ID (`dnId`).
5. Open **EV charging** in the sidebar.

## Notes
- Uses the unofficial portal API (via `fusion_solar_py`); Huawei may change it.
- Credentials are stored in Home Assistant's config entry storage.
- CSV uses `;` separators and decimal commas (Belgian Excel).
- Upgrading from 0.1.x: restart Home Assistant; the cache fills on first use.
