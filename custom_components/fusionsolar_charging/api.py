"""FusionSolar charge-record client and CSV builder."""
from __future__ import annotations

import csv
import io
import logging
import threading
from datetime import datetime, time
from zoneinfo import ZoneInfo

from fusion_solar_py.client import FusionSolarClient

DOMAIN = "fusionsolar_charging"
PATH = "/rest/neteco/web/homemgr/v2/charger/list-charge-record"
_LOGGER = logging.getLogger(__name__)


class Api:
    def __init__(self, username, password, subdomain, dn_id, tz, rate=0.0):
        self.username, self.password = username, password
        self.sub, self.dn_id, self.rate = subdomain, int(dn_id), float(rate or 0)
        self.tz_name, self.tz = tz, ZoneInfo(tz)
        self.client = None
        self.lock = threading.Lock()

    def login(self):
        self.client = FusionSolarClient(
            self.username, self.password, huawei_subdomain=self.sub)

    def _epoch(self, day: str, end=False) -> int:
        d = datetime.strptime(day, "%Y-%m-%d").date()
        t = time(23, 59, 59) if end else time(0, 0, 0)
        return int(datetime.combine(d, t, tzinfo=self.tz).timestamp())

    def _pages(self, start, end):
        offset = int(datetime.now(self.tz).utcoffset().total_seconds() // 60)
        rows, page = [], 1
        while True:
            r = self.client._session.post(
                f"https://{self.sub}.fusionsolar.huawei.com{PATH}",
                json={"startTime": str(self._epoch(start)),
                      "endTime": str(self._epoch(end, True)),
                      "pageNo": page, "pageSize": 1000,
                      "dnId": self.dn_id, "timeZoneId": self.tz_name},
                headers={"X-Timezone-Offset": str(offset)}, timeout=30)
            d = r.json()
            if d.get("code") != 0:
                raise ValueError(d.get("description") or "FusionSolar API error")
            recs = (d.get("data") or {}).get("records") or []
            rows += recs
            if len(recs) < 1000:
                return rows
            page += 1

    def sessions(self, start, end):
        """Blocking: run in an executor. Re-logs in once if the session expired."""
        with self.lock:
            for attempt in (0, 1):
                try:
                    if self.client is None or attempt:
                        self.login()
                    raw = self._pages(start, end)
                    break
                except Exception as err:  # noqa: BLE001
                    _LOGGER.debug("Fetch failed (attempt %s): %s", attempt, err)
                    if attempt:
                        raise
        out = []
        for r in raw:
            s = datetime.fromtimestamp(int(r["startTime"]), self.tz)
            e = datetime.fromtimestamp(int(r["stopTime"]), self.tz)
            out.append({
                "id": r.get("orderNumber"), "day": s.strftime("%Y-%m-%d"),
                "start": s.strftime("%H:%M"), "end": e.strftime("%H:%M"),
                "endDay": e.strftime("%Y-%m-%d"),
                "user": r.get("accountId") or "unknown",
                "kwh": round(float(r.get("totalPower") or 0), 3),
                "minutes": r.get("totalTime")})
        out.sort(key=lambda x: (x["day"], x["start"]))
        return out


def _n(x, d=3):
    return f"{x:.{d}f}".replace(".", ",")  # decimal comma for Belgian Excel


def make_csv(rows, rate) -> bytes:
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";")
    w.writerow(["Date", "Start", "End", "End date", "User", "Duration (min)",
                "kWh", "Rate (EUR/kWh)", "Amount (EUR)", "Session ID"])
    for r in rows:
        w.writerow([r["day"], r["start"], r["end"], r["endDay"], r["user"],
                    r["minutes"], _n(r["kwh"]), _n(rate, 4) if rate else "",
                    _n(r["kwh"] * rate, 2) if rate else "", r["id"]])
    tot = sum(r["kwh"] for r in rows)
    w.writerow(["TOTAL", "", "", "", "", "", _n(tot), "",
                _n(tot * rate, 2) if rate else "", f"{len(rows)} sessions"])
    return ("\ufeff" + buf.getvalue()).encode("utf-8")
