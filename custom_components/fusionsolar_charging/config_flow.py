"""Config flow."""
from __future__ import annotations

import voluptuous as vol
from fusion_solar_py.exceptions import AuthenticationException
from homeassistant import config_entries

from .api import DOMAIN, Api


class FusionSolarChargingFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        errors = {}
        if user_input is not None:
            api = Api(user_input["username"], user_input["password"],
                      user_input["subdomain"].strip(), user_input["dn_id"],
                      self.hass.config.time_zone)
            try:
                await self.hass.async_add_executor_job(api.login)
            except AuthenticationException:
                errors["base"] = "invalid_auth"
            except Exception:  # noqa: BLE001
                errors["base"] = "cannot_connect"
            else:
                await self.async_set_unique_id(str(user_input["dn_id"]))
                self._abort_if_unique_id_configured()
                return self.async_create_entry(
                    title=f"FusionSolar charger {user_input['dn_id']}",
                    data=user_input)
        schema = vol.Schema({
            vol.Required("username"): str,
            vol.Required("password"): str,
            vol.Required("subdomain", default="uni004eu5"): str,
            vol.Required("dn_id"): int,
            vol.Optional("rate", default=0.0): vol.Coerce(float),
        })
        return self.async_show_form(step_id="user", data_schema=schema,
                                    errors=errors)
