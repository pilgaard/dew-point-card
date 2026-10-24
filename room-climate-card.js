/*
 * room-climate-card 0.1.6
 * Et rumklima-kort til Home Assistant: temperatur, luftfugtighed og margin til
 * dugpunktet, med klikbare chips der åbner historikken.
 *
 * Enkelt fil, intet byggeskridt, ingen afhængigheder.
 * Installeres via HACS, eller læg den i config/www/ og tilføj den som
 * ressource (type: module).
 *
 * Eksempel:
 *
 *   type: custom:room-climate-card
 *   name: Stuen
 *   temperature: sensor.aqara_climate_sensor_w100_temperatur
 *   humidity: sensor.aqara_climate_sensor_w100_luftfugtighed
 *   dew_point: sensor.stuen_dugpunkt   # valgfri — ellers regnes det af temp+fugt
 *   climate: climate.stuen
 *   radiators: 2
 *   parked_setpoint: 5     # kun Better Thermostat: setpunktet den parkerer på
 */

const VERSION = "0.1.6";

const FARVER = {
  groen: { tekst: "#6fd39a", baggrund: "rgba(111,211,154,.13)" },
  gul: { tekst: "#ffd479", baggrund: "rgba(255,190,80,.14)" },
  roed: { tekst: "#ff7a6b", baggrund: "rgba(255,90,70,.18)" },
  orange: { tekst: "#ffb066", baggrund: "rgba(255,154,60,.10)" },
  graa: { tekst: "#8a8a8a", baggrund: "rgba(140,140,140,.12)" },
};

const GRADIENT = {
  varmer: "linear-gradient(155deg,#4f280e 0%,#2b1508 100%)",
  taendt: "linear-gradient(155deg,#38220f 0%,#221208 100%)",
  slukket: "linear-gradient(155deg,#2c2c2c 0%,#1b1b1b 100%)",
};

const UTILGAENGELIG = ["unavailable", "unknown", "none", ""];

const tal = (v, decimaler) =>
  Number(v).toLocaleString("da-DK", {
    minimumFractionDigits: decimaler,
    maximumFractionDigits: decimaler,
  });

/** Returnerer null når entiteten mangler eller ikke har en brugbar værdi. */
function vaerdi(hass, entityId) {
  if (!entityId) return null;
  const s = hass && hass.states[entityId];
  if (!s || UTILGAENGELIG.includes(s.state)) return null;
  const n = Number(s.state);
  return Number.isFinite(n) ? n : null;
}

/**
 * Dugpunkt af temperatur og relativ fugtighed — Magnus med Sonntags
 * koefficienter.
 */
function dugpunktAf(t, rh) {
  if (t === null || rh === null || rh <= 0 || rh > 100) return null;
  const a = 17.62;
  const b = 243.12;
  const g = Math.log(rh / 100) + (a * t) / (b + t);
  return (b * g) / (a - g);
}

class RoomClimateCard extends HTMLElement {
  static getStubConfig(hass) {
    // setConfig kræver temperature eller climate, så kortvælgeren skal have
    // rigtige entiteter at starte med — ellers fejler forhåndsvisningen
    const ids = Object.keys((hass && hass.states) || {});
    const medKlasse = (klasse) =>
      ids.find(
        (id) =>
          id.startsWith("sensor.") &&
          hass.states[id].attributes.device_class === klasse
      );
    const stub = { name: "Stuen" };
    const temperature = medKlasse("temperature");
    const humidity = medKlasse("humidity");
    const climate = ids.find((id) => id.startsWith("climate."));
    if (temperature) stub.temperature = temperature;
    if (humidity) stub.humidity = humidity;
    if (climate) stub.climate = climate;
    if (!temperature && !climate) stub.temperature = "sensor.temperatur";
    return stub;
  }

  setConfig(config) {
    if (!config || !config.name) {
      throw new Error("room-climate-card: 'name' mangler");
    }
    if (!config.temperature && !config.climate) {
      throw new Error(
        "room-climate-card: angiv 'temperature' eller 'climate'"
      );
    }
    this._config = {
      radiators: 1,
      humidity_thresholds: [60, 70], // under 60 grøn, 60-69 gul, 70+ rød
      dew_thresholds: [3, 5], // under 3 rød, 3-5 gul, 5+ orange
      ...config,
    };
    this._byg();
    if (this._hass) this._opdater();
  }

  set hass(hass) {
    const foer = this._hass;
    this._hass = hass;
    if (!this._el) return;
    // hass sættes ved hver eneste tilstandsændring i huset; tegn kun om når
    // en af vores egne entiteter faktisk har flyttet sig
    if (foer && !this._voresEntiteter().some((e) => foer.states[e] !== hass.states[e])) {
      return;
    }
    this._opdater();
  }

  _voresEntiteter() {
    const c = this._config;
    return [c.temperature, c.humidity, c.dew_margin, c.climate, c.dew_point].filter(Boolean);
  }

  getCardSize() {
    return 2;
  }

  /* ---------- DOM bygges én gang, derefter opdateres kun tekst og farver ---------- */

  _byg() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        ha-card {
          position: relative;
          box-sizing: border-box;
          height: 152px;
          border: none;
          box-shadow: none;
          border-radius: 26px;
          overflow: hidden;
          padding: 13px 14px 14px 18px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
        }
        .chips { display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; }
        .chip {
          position: relative;
          display: inline-flex; align-items: center; gap: 6px;
          font: 600 13px/1 var(--ha-card-header-font-family, inherit);
          letter-spacing: .2px;
          border: none; border-radius: 999px;
          min-height: 36px; padding: 0 11px;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;   /* ellers ombrydes "56 %" på smalle kort */
          flex: none;
        }
        /* Usynlig trykflade: pillen ser ud som 36px, men rammefeltet er 44px
           højt, som Apple og Material anbefaler til en finger. */
        .chip::after {
          content: ""; position: absolute; left: 0; right: 0;
          top: 50%; transform: translateY(-50%); height: 44px;
        }
        .chip:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
        .chip ha-icon { --mdc-icon-size: 16px; width: 16px; height: 16px; }
        .krop { display: flex; flex-direction: column; }
        .temp {
          font-size: 40px; font-weight: 300; line-height: 1.02;
          letter-spacing: -1.2px;
        }
        .navn { font-size: 14.5px; font-weight: 600; line-height: 1.25; opacity: .92; }
        .under {
          font-size: 11.5px; font-weight: 500; margin-top: 4px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
      </style>
      <ha-card>
        <div class="chips">
          <button class="chip" id="fugt" type="button">
            <ha-icon icon="mdi:water"></ha-icon><span></span>
          </button>
          <button class="chip" id="dug" type="button">
            <ha-icon icon="mdi:thermometer-water"></ha-icon><span></span>
          </button>
        </div>
        <div class="krop">
          <div class="temp"></div>
          <div class="navn"></div>
          <div class="under"></div>
        </div>
      </ha-card>`;

    const $ = (s) => this.shadowRoot.querySelector(s);
    this._el = {
      kort: $("ha-card"),
      fugt: $("#fugt"),
      fugtTekst: $("#fugt span"),
      dug: $("#dug"),
      dugTekst: $("#dug span"),
      temp: $(".temp"),
      navn: $(".navn"),
      under: $(".under"),
    };

    this._el.kort.addEventListener("click", () =>
      this._merInfo(this._config.climate || this._config.temperature)
    );
    this._el.fugt.addEventListener("click", (e) => {
      e.stopPropagation();
      this._merInfo(this._config.humidity);
    });
    this._el.dug.addEventListener("click", (e) => {
      e.stopPropagation();
      this._merInfo(
        this._config.dew_margin || this._config.dew_point || this._config.humidity
      );
    });
  }

  _merInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        detail: { entityId },
        bubbles: true,
        composed: true,
      })
    );
  }

  /* ---------- opdatering ---------- */

  _opdater() {
    const c = this._config;
    const hass = this._hass;
    const klima = c.climate ? hass.states[c.climate] : null;

    // tændt / varmer bestemmer baggrund og forgrundsfarve
    const taendt = klima && !["off", ...UTILGAENGELIG].includes(klima.state);
    const maal = klima ? Number(klima.attributes.temperature) : NaN;
    let nu = c.temperature
      ? vaerdi(hass, c.temperature)
      : klima
      ? Number(klima.attributes.current_temperature)
      : null;
    if (!Number.isFinite(nu)) nu = null;
    const varmer =
      taendt && Number.isFinite(maal) && nu !== null && nu < maal - 0.1;

    const fg = taendt ? "#ff9a3c" : "#909090";
    this._el.kort.style.background = varmer
      ? GRADIENT.varmer
      : taendt
      ? GRADIENT.taendt
      : GRADIENT.slukket;
    this._el.temp.style.color = fg;
    this._el.navn.style.color = fg;
    this._el.under.style.color = taendt
      ? "rgba(255,154,60,.60)"
      : "rgba(200,200,200,.45)";

    // temperatur
    this._el.temp.textContent = nu === null ? "–" : `${tal(nu, 1)}°`;
    this._el.navn.textContent = c.name;

    // fugt-chip
    const f = vaerdi(hass, c.humidity);
    const [fGul, fRoed] = c.humidity_thresholds;
    const fAfrundet = f === null ? null : Math.round(f);
    const fFarve =
      fAfrundet === null
        ? FARVER.graa
        : fAfrundet >= fRoed
        ? FARVER.roed
        : fAfrundet >= fGul
        ? FARVER.gul
        : FARVER.groen;
    this._saetChip(
      this._el.fugt,
      this._el.fugtTekst,
      fAfrundet === null ? "–" : `${fAfrundet} %`,
      fFarve,
      !!c.humidity
    );

    // dug-chip: marginen er temperaturen minus dugpunktet, og dugpunktet kan
    // regnes af temperatur og fugt. Kortet klarer altså begge dele selv, så der
    // ikke skal template-sensorer til pr. rum. Færdige sensorer vinder, hvis de
    // er sat op: dew_margin over dew_point, dew_point over beregningen.
    let dugpunkt = vaerdi(hass, c.dew_point);
    if (dugpunkt === null) dugpunkt = dugpunktAf(nu, f);
    let d = vaerdi(hass, c.dew_margin);
    if (d === null && dugpunkt !== null && nu !== null) d = nu - dugpunkt;
    const [dRoed, dGul] = c.dew_thresholds;
    const dFarve =
      d === null
        ? FARVER.graa
        : d < dRoed
        ? FARVER.roed
        : d < dGul
        ? FARVER.gul
        : FARVER.orange;
    this._saetChip(
      this._el.dug,
      this._el.dugTekst,
      d === null ? "–" : `${tal(d, 1)} K`,
      dFarve,
      !!(c.dew_margin || c.dew_point || c.humidity)
    );

    // bundlinje
    this._el.under.textContent = this._bundlinje(
      klima,
      taendt,
      varmer,
      maal,
      dugpunkt
    );

    // tilgængelighedstekst til skærmlæsere og til klienter uden CSS
    this._el.kort.setAttribute(
      "aria-label",
      [
        c.name,
        nu === null ? null : `${tal(nu, 1)} grader`,
        fAfrundet === null ? null : `${fAfrundet} procent luftfugtighed`,
        d === null ? null : `${tal(d, 1)} kelvin til dugpunktet`,
      ]
        .filter(Boolean)
        .join(", ")
    );
  }

  _saetChip(knap, tekstEl, tekst, farve, klikbar) {
    knap.style.color = farve.tekst;
    knap.style.backgroundColor = farve.baggrund;
    tekstEl.textContent = tekst;
    knap.style.cursor = klikbar ? "pointer" : "default";
    knap.disabled = !klikbar;
  }

  _bundlinje(klima, taendt, varmer, maal, dugpunkt) {
    const c = this._config;
    const radiatorer = c.radiators > 1 ? ` · ${c.radiators} radiatorer` : "";

    if (klima) {
      // unavailable er ikke det samme som slukket: termostaten svarer bare ikke.
      if (UTILGAENGELIG.includes(klima.state)) {
        return `Ingen forbindelse${radiatorer}`;
      }
      if (!taendt) return `Slukket${radiatorer}`;
      // Better Thermostat parkerer setpunktet på en fast lav værdi (typisk
      // min_temp, 5°) mens rummet er slukket. Er rummet tændt og setpunktet
      // stadig parkeret, har BT endnu ikke fået skrevet den rigtige temperatur
      // ud til radiatorerne — det kan tage lang tid hvis de er unavailable.
      // Vis det som en overgang i stedet for som en indstilling nogen har valgt.
      // Kun aktiv når parked_setpoint er sat, så almindelige termostater ikke
      // får teksten når nogen med vilje skruer ned til minimum.
      const parkeret = Number(c.parked_setpoint);
      if (Number.isFinite(maal) && Number.isFinite(parkeret) && maal <= parkeret) {
        return `Tænder…${radiatorer}`;
      }
      const m = Number.isFinite(maal) ? `${tal(maal, 1)}°` : "–";
      return `${varmer ? "Varmer til" : "Indstillet til"} ${m}${radiatorer}`;
    }
    // rum uden termostat: vis det absolutte dugpunkt i stedet
    if (dugpunkt !== null) {
      return `Dugpunkt ${tal(dugpunkt, 1)}° · ingen termostat`;
    }
    return "Ingen termostat";
  }
}

// Indlæst to gange (fx både fra www/ og HACS) kaster define en fejl
if (!customElements.get("room-climate-card")) {
  customElements.define("room-climate-card", RoomClimateCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((k) => k.type === "room-climate-card")) {
  window.customCards.push({
    type: "room-climate-card",
    name: "Room Climate Card",
    description:
      "Temperatur, luftfugtighed og margin til dugpunktet med klikbare chips",
    preview: false,
  });
}

console.info(
  `%c room-climate-card %c ${VERSION} `,
  "background:#4f280e;color:#ffb066;border-radius:3px 0 0 3px;padding:2px 4px",
  "background:#ffb066;color:#2b1508;border-radius:0 3px 3px 0;padding:2px 4px"
);