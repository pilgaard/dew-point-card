/*
 * Texts per language, for both the card and the visual editor. Add a language
 * by copying the "en" block. Languages not listed here fall back to English.
 */
export const TRANSLATIONS = {
  en: {
    card: {
      noConnection: "No connection",
      off: "Off",
      turningOn: "Turning on…",
      heatingTo: (t) => `Heating to ${t}`,
      setTo: (t) => `Set to ${t}`,
      dewPointNoThermostat: (t) => `Dew point ${t} · no thermostat`,
      noThermostat: "No thermostat",
      ariaDegrees: (t) => `${t} degrees`,
      ariaHumidity: (h) => `${h} percent humidity`,
      ariaDewMargin: (d) => `${d} kelvin to the dew point`,
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
      needsSensor: "Choose a temperature sensor or a thermostat.",
    },
  },
  da: {
    card: {
      noConnection: "Ingen forbindelse",
      off: "Slukket",
      turningOn: "Tænder…",
      heatingTo: (t) => `Varmer til ${t}`,
      setTo: (t) => `Indstillet til ${t}`,
      dewPointNoThermostat: (t) => `Dugpunkt ${t} · ingen termostat`,
      noThermostat: "Ingen termostat",
      ariaDegrees: (t) => `${t} grader`,
      ariaHumidity: (h) => `${h} procent luftfugtighed`,
      ariaDewMargin: (d) => `${d} kelvin til dugpunktet`,
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
      humidity_red: "Fugt: rød fra (%)",
      dew_red: "Margin til dugpunkt: rød under (K)",
      dew_yellow: "Margin til dugpunkt: gul under (K)",
      needsSensor: "Vælg en temperatursensor eller en termostat.",
    },
  },
};

/** The user's Home Assistant language. */
export function languageOf(hass) {
  return (
    (hass && hass.locale && hass.locale.language) ||
    (hass && hass.language) ||
    "en"
  );
}

export function textsFor(language) {
  const base = String(language).split("-")[0].toLowerCase();
  return TRANSLATIONS[base] || TRANSLATIONS.en;
}
