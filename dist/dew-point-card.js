/* dew-point-card 0.4.0 — built from src/, do not edit. https://github.com/pilgaard/dew-point-card */

// src/const.js
var VERSION = "0.4.0";
var CARD_TYPE = "dew-point-card";
var EDITOR_TYPE = "dew-point-card-editor";
var DEFAULTS = {
  humidity_thresholds: [60, 70],
  // below 60 green, 60-69 yellow, 70+ red
  dew_thresholds: [3, 5]
  // below 3 red, 3-5 yellow, 5+ orange
};

// src/translations.js
var TRANSLATIONS = {
  en: {
    card: {
      noConnection: "No connection",
      off: "Off",
      turningOn: "Turning on\u2026",
      heatingTo: (t) => `Heating to ${t}`,
      setTo: (t) => `Set to ${t}`,
      dewPointNoThermostat: (t) => `Dew point ${t} \xB7 no thermostat`,
      noThermostat: "No thermostat",
      ariaDegrees: (t) => `${t} degrees`,
      ariaHumidity: (h) => `${h} percent humidity`,
      ariaDewMargin: (d) => `${d} kelvin to the dew point`
    },
    editor: {
      name: "Name",
      temperature: "Temperature sensor",
      humidity: "Humidity sensor",
      climate: "Thermostat",
      advanced: "Advanced",
      dew_point: "Dew point sensor (optional, otherwise calculated)",
      parked_setpoint: "Parked setpoint (Better Thermostat)",
      humidity_yellow: "Humidity: yellow from (%)",
      humidity_red: "Humidity: red from (%)",
      dew_red: "Dew point margin: red below (K)",
      dew_yellow: "Dew point margin: yellow below (K)",
      needsSensor: "Choose a temperature sensor or a thermostat."
    }
  },
  da: {
    card: {
      noConnection: "Ingen forbindelse",
      off: "Slukket",
      turningOn: "T\xE6nder\u2026",
      heatingTo: (t) => `Varmer til ${t}`,
      setTo: (t) => `Indstillet til ${t}`,
      dewPointNoThermostat: (t) => `Dugpunkt ${t} \xB7 ingen termostat`,
      noThermostat: "Ingen termostat",
      ariaDegrees: (t) => `${t} grader`,
      ariaHumidity: (h) => `${h} procent luftfugtighed`,
      ariaDewMargin: (d) => `${d} kelvin til dugpunktet`
    },
    editor: {
      name: "Navn",
      temperature: "Temperatursensor",
      humidity: "Fugtsensor",
      climate: "Termostat",
      advanced: "Avanceret",
      dew_point: "Dugpunktssensor (valgfri, ellers beregnes det)",
      parked_setpoint: "Parkeret setpunkt (Better Thermostat)",
      humidity_yellow: "Fugt: gul fra (%)",
      humidity_red: "Fugt: r\xF8d fra (%)",
      dew_red: "Margin til dugpunkt: r\xF8d under (K)",
      dew_yellow: "Margin til dugpunkt: gul under (K)",
      needsSensor: "V\xE6lg en temperatursensor eller en termostat."
    }
  }
};
function languageOf(hass) {
  return hass && hass.locale && hass.locale.language || hass && hass.language || "en";
}
function textsFor(language) {
  const base = String(language).split("-")[0].toLowerCase();
  return TRANSLATIONS[base] || TRANSLATIONS.en;
}

// src/styles.css
var styles_default = 'ha-card {\n  position: relative;\n  box-sizing: border-box;\n  height: 152px;\n  border: none;\n  box-shadow: none;\n  border-radius: 26px;\n  overflow: hidden;\n  padding: 13px 14px 14px 18px;\n  display: flex;\n  flex-direction: column;\n  justify-content: space-between;\n  cursor: pointer;\n}\n\n.chips {\n  display: flex;\n  justify-content: space-between;\n  align-items: flex-start;\n  gap: 6px;\n}\n\n.chip {\n  position: relative;\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  font: 600 13px/1 var(--ha-card-header-font-family, inherit);\n  letter-spacing: 0.2px;\n  border: none;\n  border-radius: 999px;\n  min-height: 36px;\n  padding: 0 11px;\n  cursor: pointer;\n  font-family: inherit;\n  white-space: nowrap; /* otherwise "56 %" wraps on narrow cards */\n  flex: none;\n}\n\n/* Invisible touch target: the pill looks 36px tall, but the hit area is 44px,\n   as Apple and Material recommend for a finger. */\n.chip::after {\n  content: "";\n  position: absolute;\n  left: 0;\n  right: 0;\n  top: 50%;\n  transform: translateY(-50%);\n  height: 44px;\n}\n\n.chip:focus-visible {\n  outline: 2px solid currentColor;\n  outline-offset: 2px;\n}\n\n.chip ha-icon {\n  --mdc-icon-size: 16px;\n  width: 16px;\n  height: 16px;\n}\n\n.body {\n  display: flex;\n  flex-direction: column;\n}\n\n.temp {\n  font-size: 40px;\n  font-weight: 300;\n  line-height: 1.02;\n  letter-spacing: -1.2px;\n}\n\n.name {\n  font-size: 14.5px;\n  font-weight: 600;\n  line-height: 1.25;\n  opacity: 0.92;\n}\n\n.footer {\n  font-size: 11.5px;\n  font-weight: 500;\n  margin-top: 4px;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n';

// src/editor.js
var SIMPLE_KEYS = [
  "name",
  "temperature",
  "humidity",
  "climate",
  "dew_point",
  "parked_setpoint"
];
var sameArray = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
async function ensureHaForm() {
  if (customElements.get("ha-form") || !window.loadCardHelpers) return;
  const helpers = await window.loadCardHelpers();
  const card = await helpers.createCardElement({ type: "entities", entities: [] });
  if (card && card.constructor.getConfigElement) {
    await card.constructor.getConfigElement();
  }
}
var DewPointCardEditor = class extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }
  set hass(hass) {
    const previous = this._hass;
    this._hass = hass;
    if (!this._form) {
      this._render();
      return;
    }
    this._form.hass = hass;
    if (!previous || previous.locale !== hass.locale) {
      this._form.schema = this._schema();
      this._updateWarning();
    }
  }
  connectedCallback() {
    ensureHaForm().then(() => this._render());
  }
  _texts() {
    return textsFor(languageOf(this._hass)).editor;
  }
  _schema() {
    const t = this._texts();
    const sensor = (deviceClass) => ({
      entity: { filter: { domain: "sensor", device_class: deviceClass } }
    });
    const number = (min, max, step, unit) => ({
      number: { min, max, step, mode: "box", unit_of_measurement: unit }
    });
    return [
      { name: "name", required: true, selector: { text: {} } },
      { name: "temperature", selector: sensor("temperature") },
      { name: "humidity", selector: sensor("humidity") },
      { name: "climate", selector: { entity: { filter: { domain: "climate" } } } },
      {
        type: "expandable",
        name: "advanced",
        title: t.advanced,
        flatten: true,
        schema: [
          { name: "dew_point", selector: { entity: { filter: { domain: "sensor" } } } },
          { name: "parked_setpoint", selector: number(0, 30, 0.5, "\xB0") },
          {
            type: "grid",
            name: "",
            schema: [
              { name: "humidity_yellow", selector: number(0, 100, 1, "%") },
              { name: "humidity_red", selector: number(0, 100, 1, "%") },
              { name: "dew_red", selector: number(0, 20, 0.5, "K") },
              { name: "dew_yellow", selector: number(0, 20, 0.5, "K") }
            ]
          }
        ]
      }
    ];
  }
  _render() {
    if (!this._hass || !this._config || !customElements.get("ha-form")) return;
    if (!this._form) {
      this._warning = document.createElement("ha-alert");
      this._warning.setAttribute("alert-type", "warning");
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (field) => this._texts()[field.name] || field.name;
      this._form.addEventListener("value-changed", (e) => this._valueChanged(e));
      this.append(this._warning, this._form);
      this._form.schema = this._schema();
    }
    this._form.hass = this._hass;
    this._form.data = this._toForm(this._config);
    this._updateWarning();
  }
  _updateWarning() {
    if (!this._warning || !this._config) return;
    this._warning.textContent = this._texts().needsSensor;
    this._warning.hidden = !!(this._config.temperature || this._config.climate);
  }
  /** YAML config → flat form data */
  _toForm(config) {
    const [humidityYellow, humidityRed] = config.humidity_thresholds || DEFAULTS.humidity_thresholds;
    const [dewRed, dewYellow] = config.dew_thresholds || DEFAULTS.dew_thresholds;
    return {
      ...config,
      humidity_yellow: humidityYellow,
      humidity_red: humidityRed,
      dew_red: dewRed,
      dew_yellow: dewYellow
    };
  }
  /** flat form data → YAML config, leaving out empty fields and defaults */
  _fromForm(data) {
    const config = { ...this._config };
    for (const key of SIMPLE_KEYS) {
      if (data[key] === void 0 || data[key] === null || data[key] === "") {
        delete config[key];
      } else {
        config[key] = data[key];
      }
    }
    const thresholds = (key, first, second) => {
      const defaults = DEFAULTS[key];
      const value = [data[first] ?? defaults[0], data[second] ?? defaults[1]];
      if (sameArray(value, defaults)) delete config[key];
      else config[key] = value;
    };
    thresholds("humidity_thresholds", "humidity_yellow", "humidity_red");
    thresholds("dew_thresholds", "dew_red", "dew_yellow");
    return config;
  }
  _valueChanged(e) {
    e.stopPropagation();
    this._config = this._fromForm(e.detail.value);
    this._updateWarning();
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true
      })
    );
  }
};
if (!customElements.get(EDITOR_TYPE)) {
  customElements.define(EDITOR_TYPE, DewPointCardEditor);
}

// src/card.js
var COLORS = {
  green: { text: "#6fd39a", background: "rgba(111,211,154,.13)" },
  yellow: { text: "#ffd479", background: "rgba(255,190,80,.14)" },
  red: { text: "#ff7a6b", background: "rgba(255,90,70,.18)" },
  orange: { text: "#ffb066", background: "rgba(255,154,60,.10)" },
  grey: { text: "#8a8a8a", background: "rgba(140,140,140,.12)" }
};
var GRADIENTS = {
  heating: "linear-gradient(155deg,#4f280e 0%,#2b1508 100%)",
  on: "linear-gradient(155deg,#38220f 0%,#221208 100%)",
  off: "linear-gradient(155deg,#2c2c2c 0%,#1b1b1b 100%)"
};
var UNAVAILABLE = ["unavailable", "unknown", "none", ""];
function numericState(hass, entityId) {
  if (!entityId) return null;
  const s = hass && hass.states[entityId];
  if (!s || UNAVAILABLE.includes(s.state)) return null;
  const n = Number(s.state);
  return Number.isFinite(n) ? n : null;
}
function dewPointFrom(t, rh) {
  if (t === null || rh === null || rh <= 0 || rh > 100) return null;
  const a = 17.62;
  const b = 243.12;
  const g = Math.log(rh / 100) + a * t / (b + t);
  return b * g / (a - g);
}
var DewPointCard = class extends HTMLElement {
  static getConfigElement() {
    return document.createElement(EDITOR_TYPE);
  }
  static getStubConfig(hass) {
    const ids = Object.keys(hass && hass.states || {});
    const withClass = (deviceClass) => ids.find(
      (id) => id.startsWith("sensor.") && hass.states[id].attributes.device_class === deviceClass
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
    if (previous && previous.locale === hass.locale && !this._ourEntities().some((e) => previous.states[e] !== hass.states[e])) {
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
      maximumFractionDigits: decimals
    };
    return Number(v).toLocaleString(this._language(), options);
  }
  /* ---------- the DOM is built once, after that only text and colors change ---------- */
  _build() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>${styles_default}</style>
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
      footer: $(".footer")
    };
    this._el.card.addEventListener(
      "click",
      () => this._moreInfo(this._config.climate || this._config.temperature)
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
        composed: true
      })
    );
  }
  /* ---------- update ---------- */
  _update() {
    const c = this._config;
    const hass = this._hass;
    const t = this._texts();
    const climate = c.climate ? hass.states[c.climate] : null;
    const isOn = climate && !["off", ...UNAVAILABLE].includes(climate.state);
    const target = climate ? Number(climate.attributes.temperature) : NaN;
    let current = c.temperature ? numericState(hass, c.temperature) : climate ? Number(climate.attributes.current_temperature) : null;
    if (!Number.isFinite(current)) current = null;
    const isHeating = isOn && Number.isFinite(target) && current !== null && current < target - 0.1;
    const fg = isOn ? "#ff9a3c" : "#909090";
    this._el.card.style.background = isHeating ? GRADIENTS.heating : isOn ? GRADIENTS.on : GRADIENTS.off;
    this._el.temp.style.color = fg;
    this._el.name.style.color = fg;
    this._el.footer.style.color = isOn ? "rgba(255,154,60,.60)" : "rgba(200,200,200,.45)";
    this._el.temp.textContent = current === null ? "\u2013" : `${this._number(current, 1)}\xB0`;
    this._el.name.textContent = c.name;
    const h = numericState(hass, c.humidity);
    const [hYellow, hRed] = c.humidity_thresholds;
    const hRounded = h === null ? null : Math.round(h);
    const hColor = hRounded === null ? COLORS.grey : hRounded >= hRed ? COLORS.red : hRounded >= hYellow ? COLORS.yellow : COLORS.green;
    this._setChip(
      this._el.humidity,
      this._el.humidityText,
      hRounded === null ? "\u2013" : `${hRounded} %`,
      hColor,
      !!c.humidity
    );
    let dewPoint = numericState(hass, c.dew_point);
    if (dewPoint === null) dewPoint = dewPointFrom(current, h);
    const d = dewPoint !== null && current !== null ? current - dewPoint : null;
    const [dRed, dYellow] = c.dew_thresholds;
    const dColor = d === null ? COLORS.grey : d < dRed ? COLORS.red : d < dYellow ? COLORS.yellow : COLORS.orange;
    this._setChip(
      this._el.dew,
      this._el.dewText,
      d === null ? "\u2013" : `${this._number(d, 1)} K`,
      dColor,
      !!(c.dew_point || c.humidity)
    );
    this._el.footer.textContent = this._footer(
      climate,
      isOn,
      isHeating,
      target,
      dewPoint
    );
    this._el.card.setAttribute(
      "aria-label",
      [
        c.name,
        current === null ? null : t.ariaDegrees(this._number(current, 1)),
        hRounded === null ? null : t.ariaHumidity(hRounded),
        d === null ? null : t.ariaDewMargin(this._number(d, 1))
      ].filter(Boolean).join(", ")
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
      if (UNAVAILABLE.includes(climate.state)) {
        return t.noConnection;
      }
      if (!isOn) return t.off;
      const parked = Number(c.parked_setpoint);
      if (Number.isFinite(target) && Number.isFinite(parked) && target <= parked) {
        return t.turningOn;
      }
      const m = Number.isFinite(target) ? `${this._number(target, 1)}\xB0` : "\u2013";
      return isHeating ? t.heatingTo(m) : t.setTo(m);
    }
    if (dewPoint !== null) {
      return t.dewPointNoThermostat(`${this._number(dewPoint, 1)}\xB0`);
    }
    return t.noThermostat;
  }
};
if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, DewPointCard);
}
window.customCards = window.customCards || [];
if (!window.customCards.some((k) => k.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: "Dew Point Card",
    description: "Temperature, humidity and dew point margin with clickable chips",
    preview: true
  });
}
console.info(
  `%c dew-point-card %c ${VERSION} `,
  "background:#4f280e;color:#ffb066;border-radius:3px 0 0 3px;padding:2px 4px",
  "background:#ffb066;color:#2b1508;border-radius:0 3px 3px 0;padding:2px 4px"
);
