/*
 * dew-point-card
 * A Home Assistant card for a room: temperature, humidity and the margin
 * to the dew point, with clickable chips that open the history.
 *
 * Example:
 *
 *   type: custom:dew-point-card
 *   name: Living room
 *   temperature: sensor.living_room_temperature
 *   humidity: sensor.living_room_humidity
 *   dew_point: sensor.living_room_dew_point   # optional — otherwise calculated from temp+humidity
 *   climate: climate.living_room
 *   parked_setpoint: 5     # the setpoint the thermostat parks at while off (Better Thermostat)
 */

import { VERSION, CARD_TYPE, EDITOR_TYPE, DEFAULTS } from "./const.js";
import { languageOf, textsFor } from "./translations.js";
import styles from "./styles.css";
import "./editor.js";

const COLORS = {
  green: { text: "#6fd39a", background: "rgba(111,211,154,.13)" },
  yellow: { text: "#ffd479", background: "rgba(255,190,80,.14)" },
  red: { text: "#ff7a6b", background: "rgba(255,90,70,.18)" },
  orange: { text: "#ffb066", background: "rgba(255,154,60,.10)" },
  grey: { text: "#8a8a8a", background: "rgba(140,140,140,.12)" },
};

const GRADIENTS = {
  heating: "linear-gradient(155deg,#4f280e 0%,#2b1508 100%)",
  on: "linear-gradient(155deg,#38220f 0%,#221208 100%)",
  off: "linear-gradient(155deg,#2c2c2c 0%,#1b1b1b 100%)",
};

const UNAVAILABLE = ["unavailable", "unknown", "none", ""];

/** Returns null when the entity is missing or has no usable value. */
function numericState(hass, entityId) {
  if (!entityId) return null;
  const s = hass && hass.states[entityId];
  if (!s || UNAVAILABLE.includes(s.state)) return null;
  const n = Number(s.state);
  return Number.isFinite(n) ? n : null;
}

/**
 * Dew point from temperature and relative humidity — Magnus formula with
 * Sonntag's coefficients.
 */
function dewPointFrom(t, rh) {
  if (t === null || rh === null || rh <= 0 || rh > 100) return null;
  const a = 17.62;
  const b = 243.12;
  const g = Math.log(rh / 100) + (a * t) / (b + t);
  return (b * g) / (a - g);
}

class DewPointCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement(EDITOR_TYPE);
  }

  static getStubConfig(hass) {
    // setConfig requires temperature or climate, so the card picker needs real
    // entities to start with — otherwise the preview fails
    const ids = Object.keys((hass && hass.states) || {});
    const withClass = (deviceClass) =>
      ids.find(
        (id) =>
          id.startsWith("sensor.") &&
          hass.states[id].attributes.device_class === deviceClass
      );
    const stub = { name: "Living room" };
    const temperature = withClass("temperature");
    const humidity = withClass("humidity");
    const climate = ids.find((id) => id.startsWith("climate."));
    if (temperature) stub.temperature = temperature;
    if (humidity) stub.humidity = humidity;
    if (climate) stub.climate = climate;
    if (!temperature && !climate) stub.temperature = "sensor.temperature";
    return stub;
  }

  setConfig(config) {
    if (!config || !config.name) {
      throw new Error("dew-point-card: 'name' is missing");
    }
    if (!config.temperature && !config.climate) {
      throw new Error(
        "dew-point-card: set 'temperature' or 'climate'"
      );
    }
    this._config = { ...DEFAULTS, ...config };
    this._build();
    if (this._hass) this._update();
  }

  set hass(hass) {
    const previous = this._hass;
    this._hass = hass;
    if (!this._el) return;
    // hass is set on every single state change in the house; only redraw when
    // one of our own entities has actually changed, or the language has
    if (
      previous &&
      previous.locale === hass.locale &&
      !this._ourEntities().some((e) => previous.states[e] !== hass.states[e])
    ) {
      return;
    }
    this._update();
  }

  _ourEntities() {
    const c = this._config;
    return [c.temperature, c.humidity, c.climate, c.dew_point].filter(Boolean);
  }

  getCardSize() {
    return 2;
  }

  /* ---------- language ---------- */

  _language() {
    return languageOf(this._hass);
  }

  _texts() {
    return textsFor(this._language()).card;
  }

  _number(v, decimals) {
    const options = {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    };
    return Number(v).toLocaleString(this._language(), options);
  }

  /* ---------- the DOM is built once, after that only text and colors change ---------- */

  _build() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <ha-card>
        <div class="chips">
          <button class="chip" id="humidity" type="button">
            <ha-icon icon="mdi:water"></ha-icon><span></span>
          </button>
          <button class="chip" id="dew" type="button">
            <ha-icon icon="mdi:thermometer-water"></ha-icon><span></span>
          </button>
        </div>
        <div class="body">
          <div class="temp"></div>
          <div class="name"></div>
          <div class="footer"></div>
        </div>
      </ha-card>`;

    const $ = (s) => this.shadowRoot.querySelector(s);
    this._el = {
      card: $("ha-card"),
      humidity: $("#humidity"),
      humidityText: $("#humidity span"),
      dew: $("#dew"),
      dewText: $("#dew span"),
      temp: $(".temp"),
      name: $(".name"),
      footer: $(".footer"),
    };

    this._el.card.addEventListener("click", () =>
      this._moreInfo(this._config.climate || this._config.temperature)
    );
    this._el.humidity.addEventListener("click", (e) => {
      e.stopPropagation();
      this._moreInfo(this._config.humidity);
    });
    this._el.dew.addEventListener("click", (e) => {
      e.stopPropagation();
      this._moreInfo(
        this._config.dew_point || this._config.humidity
      );
    });
  }

  _moreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        detail: { entityId },
        bubbles: true,
        composed: true,
      })
    );
  }

  /* ---------- update ---------- */

  _update() {
    const c = this._config;
    const hass = this._hass;
    const t = this._texts();
    const climate = c.climate ? hass.states[c.climate] : null;

    // on / heating decides the background and foreground color
    const isOn = climate && !["off", ...UNAVAILABLE].includes(climate.state);
    const target = climate ? Number(climate.attributes.temperature) : NaN;
    let current = c.temperature
      ? numericState(hass, c.temperature)
      : climate
      ? Number(climate.attributes.current_temperature)
      : null;
    if (!Number.isFinite(current)) current = null;
    const isHeating =
      isOn && Number.isFinite(target) && current !== null && current < target - 0.1;

    const fg = isOn ? "#ff9a3c" : "#909090";
    this._el.card.style.background = isHeating
      ? GRADIENTS.heating
      : isOn
      ? GRADIENTS.on
      : GRADIENTS.off;
    this._el.temp.style.color = fg;
    this._el.name.style.color = fg;
    this._el.footer.style.color = isOn
      ? "rgba(255,154,60,.60)"
      : "rgba(200,200,200,.45)";

    // temperature
    this._el.temp.textContent = current === null ? "–" : `${this._number(current, 1)}°`;
    this._el.name.textContent = c.name;

    // humidity chip
    const h = numericState(hass, c.humidity);
    const [hYellow, hRed] = c.humidity_thresholds;
    const hRounded = h === null ? null : Math.round(h);
    const hColor =
      hRounded === null
        ? COLORS.grey
        : hRounded >= hRed
        ? COLORS.red
        : hRounded >= hYellow
        ? COLORS.yellow
        : COLORS.green;
    this._setChip(
      this._el.humidity,
      this._el.humidityText,
      hRounded === null ? "–" : `${hRounded} %`,
      hColor,
      !!c.humidity
    );

    // dew chip: the margin is the temperature minus the dew point, and the dew
    // point can be calculated from temperature and humidity. So the card handles
    // both itself, and no template sensors are needed per room. An existing
    // dew_point sensor wins over the calculation if configured.
    let dewPoint = numericState(hass, c.dew_point);
    if (dewPoint === null) dewPoint = dewPointFrom(current, h);
    const d = dewPoint !== null && current !== null ? current - dewPoint : null;
    const [dRed, dYellow] = c.dew_thresholds;
    const dColor =
      d === null
        ? COLORS.grey
        : d < dRed
        ? COLORS.red
        : d < dYellow
        ? COLORS.yellow
        : COLORS.orange;
    this._setChip(
      this._el.dew,
      this._el.dewText,
      d === null ? "–" : `${this._number(d, 1)} K`,
      dColor,
      !!(c.dew_point || c.humidity)
    );

    // footer
    this._el.footer.textContent = this._footer(
      climate,
      isOn,
      isHeating,
      target,
      dewPoint
    );

    // accessible text for screen readers and for clients without CSS
    this._el.card.setAttribute(
      "aria-label",
      [
        c.name,
        current === null ? null : t.ariaDegrees(this._number(current, 1)),
        hRounded === null ? null : t.ariaHumidity(hRounded),
        d === null ? null : t.ariaDewMargin(this._number(d, 1)),
      ]
        .filter(Boolean)
        .join(", ")
    );
  }

  _setChip(button, textEl, text, color, clickable) {
    button.style.color = color.text;
    button.style.backgroundColor = color.background;
    textEl.textContent = text;
    button.style.cursor = clickable ? "pointer" : "default";
    button.disabled = !clickable;
  }

  _footer(climate, isOn, isHeating, target, dewPoint) {
    const c = this._config;
    const t = this._texts();

    if (climate) {
      // unavailable is not the same as off: the thermostat just isn't responding.
      if (UNAVAILABLE.includes(climate.state)) {
        return t.noConnection;
      }
      if (!isOn) return t.off;
      // Better Thermostat parks the setpoint at a fixed low value (usually
      // min_temp, 5°) while the room is off. If the room is on and the setpoint
      // is still parked, BT hasn't yet written the real temperature out to the
      // radiators — which can take a long time if they are unavailable.
      // Show it as a transition rather than as a setting someone chose.
      // Only active when parked_setpoint is set, so regular thermostats don't
      // get this text when someone deliberately turns them down to the minimum.
      const parked = Number(c.parked_setpoint);
      if (Number.isFinite(target) && Number.isFinite(parked) && target <= parked) {
        return t.turningOn;
      }
      const m = Number.isFinite(target) ? `${this._number(target, 1)}°` : "–";
      return isHeating ? t.heatingTo(m) : t.setTo(m);
    }
    // room without a thermostat: show the absolute dew point instead
    if (dewPoint !== null) {
      return t.dewPointNoThermostat(`${this._number(dewPoint, 1)}°`);
    }
    return t.noThermostat;
  }
}

// Loaded twice (e.g. both from www/ and HACS), define would throw
if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, DewPointCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((k) => k.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: "Dew Point Card",
    description:
      "Temperature, humidity and dew point margin with clickable chips",
    preview: true,
  });
}

console.info(
  `%c dew-point-card %c ${VERSION} `,
  "background:#4f280e;color:#ffb066;border-radius:3px 0 0 3px;padding:2px 4px",
  "background:#ffb066;color:#2b1508;border-radius:0 3px 3px 0;padding:2px 4px"
);
