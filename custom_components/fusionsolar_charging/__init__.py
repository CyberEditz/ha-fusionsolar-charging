"""FusionSolar charging sessions: sidebar dashboard + CSV export."""
from __future__ import annotations

from datetime import datetime
from pathlib import Path

from aiohttp import web
from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import HomeAssistantView, StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .api import DOMAIN, Api, make_csv

URL_BASE = "/fusionsolar_charging_static"
PANEL = "fusionsolar-charging"


def _dates(request):
    q = request.query
    for k in ("start", "end"):
        datetime.strptime(q[k], "%Y-%m-%d")
    return q["start"], q["end"]


class SessionsView(HomeAssistantView):
    url = f"/api/{DOMAIN}/sessions"
    name = f"api:{DOMAIN}:sessions"

    async def get(self, request):
        hass, api = request.app["hass"], request.app["hass"].data[DOMAIN]
        try:
            start, end = _dates(request)
            rows = await hass.async_add_executor_job(api.sessions, start, end)
        except Exception as err:  # noqa: BLE001
            return self.json_message(f"{type(err).__name__}: {err}", 500)
        return self.json({"rate": api.rate, "sessions": rows})


class ExportView(HomeAssistantView):
    url = f"/api/{DOMAIN}/export"
    name = f"api:{DOMAIN}:export"

    async def get(self, request):
        hass, api = request.app["hass"], request.app["hass"].data[DOMAIN]
        try:
            start, end = _dates(request)
            rows = await hass.async_add_executor_job(api.sessions, start, end)
            if request.query.get("user"):
                rows = [r for r in rows if r["user"] == request.query["user"]]
            rate = float((request.query.get("rate") or "0").replace(",", ".") or 0)
        except Exception as err:  # noqa: BLE001
            return self.json_message(f"{type(err).__name__}: {err}", 500)
        return web.Response(body=make_csv(rows, rate), content_type="text/csv")


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    d = entry.data
    hass.data[DOMAIN] = Api(d["username"], d["password"], d["subdomain"],
                            d["dn_id"], hass.config.time_zone, d.get("rate", 0))
    if not hass.data.get(f"{DOMAIN}_registered"):  # views/paths can't be removed
        hass.http.register_view(SessionsView())
        hass.http.register_view(ExportView())
        await hass.http.async_register_static_paths([StaticPathConfig(
            URL_BASE, str(Path(__file__).parent / "frontend"), False)])
        hass.data[f"{DOMAIN}_registered"] = True
    await panel_custom.async_register_panel(
        hass, webcomponent_name="fusionsolar-charging-panel",
        frontend_url_path=PANEL, module_url=f"{URL_BASE}/panel.js?v=0.1.0",
        sidebar_title="EV charging", sidebar_icon="mdi:ev-station",
        require_admin=False)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    frontend.async_remove_panel(hass, PANEL)
    hass.data.pop(DOMAIN, None)
    return True
