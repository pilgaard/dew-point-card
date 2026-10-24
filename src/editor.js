/*
 * Visual editor for dew-point-card, built on Home Assistant's own ha-form
 * so it gets the same entity pickers and fields as the built-in cards.
 *
 * The thresholds are arrays in the YAML config but two plain number fields
 * each in the form; _toForm and _fromForm translate between the two.
 */

import { EDITOR_TYPE, DEFAULTS } from "./const.js";
import { languageOf, textsFor } from "./translations.js";

// Config keys the form owns. Anything else in the config (type, view_layout,
// grid_options…) is passed through untouched.
const SIMPLE_KEYS = [
  "name",
  "temperature",
  "humidity",
  "climate",
  "dew_point",
  "parked_setpoint",
];

const sameArray = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * ha-form and its entity pickers are lazy-loaded by Home Assistant and may not
 * be defined yet when our editor opens. Asking a built-in card for its editor
 * forces them to load.
 */
async function ensureHaForm() {
  if (customElements.get("ha-form") || !window.loadCardHelpers) return;
  const helpers = await window.loadCardHelpers();
  const card = await helpers.createCardElement({ type: "entities", entities: [] });
  if (card && card.constructor.getConfigElement) {
    await card.constructor.getConfigElement();
  }
}

class DewPointCardEditor extends HTMLElement {
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
    // the labels follow the user's language
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
      entity: { filter: { domain: "sensor", device_class: deviceClass } },
    });
    const number = (min, max, step, unit) => ({
      number: { min, max, step, mode: "box", unit_of_measurement: unit },
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
          { name: "parked_setpoint", selector: number(0, 30, 0.5, "°") },
          {
            type: "grid",
            name: "",
            schema: [
              { name: "humidity_yellow", selector: number(0, 100, 1, "%") },
              { name: "humidity_red", selector: number(0, 100, 1, "%") },
              { name: "dew_red", selector: number(0, 20, 0.5, "K") },
              { name: "dew_yellow", selector: number(0, 20, 0.5, "K") },
            ],
          },
        ],
      },
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
    const [humidityYellow, humidityRed] =
      config.humidity_thresholds || DEFAULTS.humidity_thresholds;
    const [dewRed, dewYellow] = config.dew_thresholds || DEFAULTS.dew_thresholds;
    return {
      ...config,
      humidity_yellow: humidityYellow,
      humidity_red: humidityRed,
      dew_red: dewRed,
      dew_yellow: dewYellow,
    };
  }

  /** flat form data → YAML config, leaving out empty fields and defaults */
  _fromForm(data) {
    const config = { ...this._config };

    for (const key of SIMPLE_KEYS) {
      if (data[key] === undefined || data[key] === null || data[key] === "") {
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
        composed: true,
      })
    );
  }
}

if (!customElements.get(EDITOR_TYPE)) {
  customElements.define(EDITOR_TYPE, DewPointCardEditor);
}
