# FusionSolar Charging Sessions (Home Assistant / HACS)

Sidebar dashboard for your Huawei FusionSolar EV charger: pick a period, see kWh per user,
a per-day chart (all users or one user), the session list (day, start, end, user, kWh)
and a CSV export (with optional EUR/kWh rate) for refunds.

## Install
1. Put this repository on GitHub (replace `YOUR_USER` in `manifest.json`).
2. HACS > Integrations > ⋮ > Custom repositories > add the repo URL, category **Integration**.
3. Download it in HACS and restart Home Assistant.
4. Settings > Devices & services > Add integration > **FusionSolar Charging Sessions**.
   - Username / password: your FusionSolar **owner** login
   - Subdomain: first part of your portal address (e.g. `uni004eu5`)
   - Charger ID: the `dnId` from the charge record request
   - Rate: default EUR/kWh for the refund CSV (editable in the page)
5. Open **EV charging** in the sidebar.

## Notes
- Uses the unofficial portal API (via `fusion_solar_py`); Huawei may change it. A captcha at login will fail the setup.
- Credentials are stored in Home Assistant's config entry storage.
- CSV uses `;` separators and decimal commas (Belgian Excel).
