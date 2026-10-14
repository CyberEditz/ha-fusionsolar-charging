"""Optional HomeWizard energy meter data: net grid usage per day.

Reads the daily statistics Home Assistant's recorder keeps for the HomeWizard
import/export energy sensors. Returns None when HomeWizard isn't set up.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, time, timedelta

_LOGGER = logging.getLogger(__name__)


def _day(value, tz) -> date:
    """Recorder 'start' may be a datetime or a timestamp in seconds/ms."""
    if isinstance(value, datetime):
        dt = value
    else:
        x = float(value)
        dt = datetime.fromtimestamp(x / 1000 if x > 1e11 else x, tz)
    return dt.astimezone(tz).date()


def find_entities(hass):
    """Return (import_entity_id, export_entity_id or None) of a HomeWizard meter."""
    from homeassistant.helpers import entity_registry as er

    by_dev: dict = {}
    for e in er.async_get(hass).entities.values():
        if (e.platform != "homewizard" or e.disabled_by is not None
                or not e.entity_id.startswith("sensor.")):
            continue
        uid, eid = (e.unique_id or "").lower(), e.entity_id.lower()
        kind = None
        if uid.endswith("total_power_import_kwh") or eid.endswith("_energy_import"):
            kind = "import"
        elif uid.endswith("total_power_export_kwh") or eid.endswith("_energy_export"):
            kind = "export"
        if kind:
            by_dev.setdefault(e.device_id, {})[kind] = e.entity_id
    for d in by_dev.values():
        if "import" in d and "export" in d:
            return d["import"], d["export"]
    for d in by_dev.values():
        if "import" in d:
            return d["import"], None
    return None, None


async def async_day_net(hass, start: date, end: date):
    """{"entities": [...], "days": {"YYYY-MM-DD": net kWh}} or None.

    net = energy imported - energy exported that local day.
    """
    if "recorder" not in hass.config.components:
        return None
    imp, exp = find_entities(hass)
    if not imp:
        return None
    from homeassistant.components.recorder import get_instance
    from homeassistant.components.recorder.statistics import (
        statistics_during_period,
    )
    from homeassistant.util import dt as dt_util

    tz = dt_util.get_default_time_zone()
    s = dt_util.as_utc(datetime.combine(start, time.min, tz))
    e = dt_util.as_utc(datetime.combine(end + timedelta(days=1), time.min, tz))
    ids = {i for i in (imp, exp) if i}
    stats = await get_instance(hass).async_add_executor_job(
        statistics_during_period, hass, s, e, ids, "day", None, {"change"})
    days: dict[str, float] = {}
    for sign, eid in ((1, imp), (-1, exp)):
        if not eid:
            continue
        for row in stats.get(eid, []):
            ch = row.get("change")
            if ch is None:
                continue
            k = _day(row["start"], tz).isoformat()
            days[k] = days.get(k, 0.0) + sign * float(ch)
    return {"entities": [i for i in (imp, exp) if i], "days": days}
