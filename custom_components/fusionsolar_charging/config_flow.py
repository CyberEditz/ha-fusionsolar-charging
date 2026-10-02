"""Config flow with re-authentication."""
from __future__ import annotations

import voluptuous as vol
from fusion_solar_py.exceptions import (
    AuthenticationException,
    CaptchaRequiredException,
)
from homeassistant import config_entries

from .api import DOMAIN, login_client


class FusionSolarChargingFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def _check(self, username, password, subdomain, errors):
        try:
            await self.hass.async_add_executor_job(
                login_client, username, password, subdomain)
        except AuthenticationException:
            errors["base"] = "invalid_auth"
        except CaptchaRequiredException:
            errors["base"] = "captcha"
        except Exception:  # noqa: BLE001
            errors["base"] = "cannot_connect"
        return not errors

    async def async_step_user(self, user_input=None):
        errors = {}
        if user_input is not None and await self._check(
                user_input["username"], user_input["password"],
                user_input["subdomain"].strip(), errors):
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
        })
        return self.async_show_form(step_id="user", data_schema=schema,
                                    errors=errors)

    async def async_step_reauth(self, entry_data):
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(self, user_input=None):
        entry = self._get_reauth_entry()
        errors = {}
        if user_input is not None and await self._check(
                user_input["username"], user_input["password"],
                entry.data["subdomain"], errors):
            return self.async_update_reload_and_abort(
                entry, data={**entry.data, **user_input})
        schema = vol.Schema({
            vol.Required("username", default=entry.data["username"]): str,
            vol.Required("password"): str,
        })
        return self.async_show_form(step_id="reauth_confirm",
                                    data_schema=schema, errors=errors)
