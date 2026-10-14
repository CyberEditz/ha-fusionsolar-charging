# FusionSolar Charging Sessions (Home Assistant / HACS)

Sidebar dashboard for your Huawei FusionSolar EV charger.

- Pick a period first, then see kWh per user, a per-day chart (all users or one user)
  and the session list (day, start, end, user, kWh).
- Export for the accountant as **CSV** (sessions, total, per-user totals) or **Excel**
  (sheet "Sessions" with a total, sheet "Per user"). No prices are included.
- **Cache**: finished months are saved in Home Assistant storage and never fetched again;
  the running month refreshes at most every 5 minutes. The header shows whether the data is
  *Live* or *From cache*, and every session row is marked *live* or *cached* (hover for the
  fetch time). **Force refresh** fetches new data now. If FusionSolar is unreachable, saved
  data is shown with a warning.
- **Nicknames and merging**: give an account ID a nickname (Names card), or rename a single
  session with ✎ in the table (clear the field to undo). Everything with the same nickname
  (case-insensitive) is combined into one user in the tiles, chart, table and exports.
  Administrators only.
- **Filtered exports**: tick the users to include, then export CSV or Excel. The account IDs
  behind each (merged) user stay in their own column.
- **HomeWizard (optional)**: if the HomeWizard integration is set up, the table gets a
  "Δ grid (day)" column: charger kWh of that day minus net grid usage (import − export) from
  the HomeWizard meter, read from Home Assistant's daily statistics.
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
