"""FusionSolar charging sessions: sidebar dashboard, cache and exports."""
from __future__ import annotations

import logging
from datetime import date
from pathlib import Path

from aiohttp import web
from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import HomeAssistantView, StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .api import (
    DOMAIN,
    LoginError,
    explain,
    filter_rows,
    make_csv,
    make_xlsx,
)
from .api import Api
from .homewizard import async_day_net

_LOGGER = logging.getLogger(__name__)
URL_BASE = "/fusionsolar_charging_static"
PANEL = "fusionsolar-charging"
VERSION = "0.3.0"
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _range(request):
    q = request.query
    for k in ("start", "end"):
        date.fromisoformat(q[k])
    return q["start"], q["end"]


class Base(HomeAssistantView):
    def fail(self, err):
        le = explain(err) if not isinstance(err, (KeyError, ValueError)) \
            or isinstance(err, LoginError) else LoginError("request", "Invalid request.")
        return self.json({"message": le.message, "kind": le.kind}, status_code=502
                         if le.kind != "request" else 400)

    @staticmethod
    def admin_only(request):
        return bool(request["hass_user"].is_admin)


class SessionsView(Base):
    url = f"/api/{DOMAIN}/sessions"
    name = f"api:{DOMAIN}:sessions"

    async def get(self, request):
        hass = request.app["hass"]
        api = hass.data[DOMAIN]
        try:
            start, end = _range(request)
            data = await api.async_sessions(
                start, end, request.query.get("refresh") == "1")
        except Exception as err:  # noqa: BLE001
            return self.fail(err)
        data["homewizard"], data["deltas"] = None, {}
        try:
            hw = await async_day_net(
                hass, date.fromisoformat(start), date.fromisoformat(end))
        except Exception:  # noqa: BLE001  (optional feature, never break the page)
            _LOGGER.warning("HomeWizard statistics unavailable", exc_info=True)
            hw = None
        if hw:
            charged: dict[str, float] = {}
            for s in data["sessions"]:
                charged[s["day"]] = charged.get(s["day"], 0.0) + s["kwh"]
            data["homewizard"] = hw["entities"]
            data["deltas"] = {d: round(k - hw["days"][d], 3)
                              for d, k in charged.items() if d in hw["days"]}
        return self.json(data)


class ExportView(Base):
    url = f"/api/{DOMAIN}/export"
    name = f"api:{DOMAIN}:export"

    async def get(self, request):
        hass = request.app["hass"]
        api = hass.data[DOMAIN]
        try:
            start, end = _range(request)
            rows = (await api.async_sessions(start, end))["sessions"]
            rows = filter_rows(rows, request.query.getall("user", []))
            if request.query.get("format") == "xlsx":
                body = await hass.async_add_executor_job(
                    make_xlsx, rows, f"{start} to {end}")
                return web.Response(body=body, content_type=XLSX)
            return web.Response(body=make_csv(rows), content_type="text/csv")
        except Exception as err:  # noqa: BLE001
            return self.fail(err)


class NamesView(Base):
    url = f"/api/{DOMAIN}/names"
    name = f"api:{DOMAIN}:names"

    async def post(self, request):
        if not self.admin_only(request):
            return self.json({"message": "Only administrators can change names."},
                             status_code=403)
        api = request.app["hass"].data[DOMAIN]
        body = await request.json()
        return self.json({"names": await api.async_set_names(body.get("names", {}))})


class OverrideView(Base):
    url = f"/api/{DOMAIN}/override"
    name = f"api:{DOMAIN}:override"

    async def post(self, request):
        if not self.admin_only(request):
            return self.json({"message": "Only administrators can rename sessions."},
                             status_code=403)
        api = request.app["hass"].data[DOMAIN]
        body = await request.json()
        if not body.get("id"):
            return self.json({"message": "Missing session id."}, status_code=400)
        name = await api.async_set_override(body["id"], body.get("name", ""))
        return self.json({"name": name})


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    api = Api(hass, entry, Store(hass, 1, f"{DOMAIN}.cache"))
    await api.async_load()
    hass.data[DOMAIN] = api
    if not hass.data.get(f"{DOMAIN}_registered"):  # views/paths can't be removed
        for v in (SessionsView(), ExportView(), NamesView(), OverrideView()):
            hass.http.register_view(v)
        await hass.http.async_register_static_paths([StaticPathConfig(
            URL_BASE, str(Path(__file__).parent / "frontend"), False)])
        hass.data[f"{DOMAIN}_registered"] = True
    await panel_custom.async_register_panel(
        hass, webcomponent_name="fusionsolar-charging-panel",
        frontend_url_path=PANEL, module_url=f"{URL_BASE}/panel.js?v={VERSION}",
        sidebar_title="EV charging", sidebar_icon="mdi:ev-station",
        require_admin=False)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    frontend.async_remove_panel(hass, PANEL)
    hass.data.pop(DOMAIN, None)
    return True
