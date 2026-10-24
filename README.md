# Room Climate Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz)
[![Validate](https://github.com/pilgaard/room-climate-card/actions/workflows/validate.yml/badge.svg)](https://github.com/pilgaard/room-climate-card/actions/workflows/validate.yml)

Et rumklima-kort til Home Assistant. Det viser temperatur, luftfugtighed og
hvor langt temperaturen er fra dugpunktet. De to chips kan klikkes og åbner
historikken.

- Én fil, intet byggeskridt, ingen afhængigheder
- Regner selv dugpunktet ud fra temperatur og fugt, så du ikke behøver en
  template-sensor for hvert rum
- Baggrunden skifter efter termostaten: slukket, tændt eller varmer
- Kan vise Better Thermostats "parkerede" setpunkt som *Tænder…*

> Teksterne på kortet er på dansk.

## Installation

### HACS (anbefalet)

1. Åbn HACS i Home Assistant.
2. Menuen ⋮ → **Custom repositories**.
3. Indsæt `https://github.com/pilgaard/room-climate-card`, vælg typen
   **Dashboard** og klik **Add**.
4. Find **Room Climate Card**, klik **Download** og genindlæs browseren.

### Manuelt

1. Kopiér `room-climate-card.js` til `config/www/`.
2. **Indstillinger → Dashboards → ⋮ → Ressourcer → Tilføj ressource**:
   - URL: `/local/room-climate-card.js`
   - Type: **JavaScript-modul**
3. Genindlæs browseren.

## Konfiguration

```yaml
type: custom:room-climate-card
name: Stuen
temperature: sensor.stuen_temperatur
humidity: sensor.stuen_luftfugtighed
climate: climate.stuen
radiators: 2
```

| Option                | Påkrævet | Standard   | Beskrivelse                                                                                   |
| --------------------- | -------- | ---------- | --------------------------------------------------------------------------------------------- |
| `name`                | ja       |            | Rummets navn                                                                                  |
| `temperature`         | *        |            | Temperatursensor. Uden den bruges termostatens `current_temperature`                          |
| `climate`             | *        |            | Termostat. Styrer baggrund og bundlinje                                                       |
| `humidity`            | nej      |            | Fugtsensor (%)                                                                                |
| `dew_point`           | nej      |            | Færdig dugpunktssensor. Ellers regnes dugpunktet af temperatur og fugt                        |
| `dew_margin`          | nej      |            | Færdig sensor for temperatur minus dugpunkt. Vinder over både `dew_point` og beregningen      |
| `radiators`           | nej      | `1`        | Antal radiatorer. Vises i bundlinjen når der er mere end én                                   |
| `parked_setpoint`     | nej      |            | Kun Better Thermostat: setpunktet den parkerer på mens rummet er slukket (typisk `5`)         |
| `humidity_thresholds` | nej      | `[60, 70]` | Fugt-chip: under første grøn, fra første gul, fra anden rød                                   |
| `dew_thresholds`      | nej      | `[3, 5]`   | Dug-chip (K): under første rød, fra første gul, fra anden orange                              |

\* Du skal angive mindst én af `temperature` og `climate`.

### Rum uden termostat

```yaml
type: custom:room-climate-card
name: Badeværelse
temperature: sensor.bad_temperatur
humidity: sensor.bad_luftfugtighed
```

Bundlinjen viser så det absolutte dugpunkt.

## Dugpunkt

Dugpunktet regnes med Magnus-formlen og Sonntags koefficienter
(a = 17,62, b = 243,12 °C). Dug-chippen viser temperaturen minus dugpunktet i
kelvin. Er marginen lille, kan der danne sig kondens på kolde flader.

## Licens

[MIT](LICENSE)
