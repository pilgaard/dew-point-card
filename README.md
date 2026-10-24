# Room Climate Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz)
[![Validate](https://github.com/pilgaard/room-climate-card/actions/workflows/validate.yml/badge.svg)](https://github.com/pilgaard/room-climate-card/actions/workflows/validate.yml)

A room climate card for Home Assistant. It shows the temperature, the humidity
and how far the temperature is from the dew point. Both chips are clickable and
open the history.

- One file, no build step, no dependencies
- Calculates the dew point from temperature and humidity, so you don't need a
  template sensor for every room
- The background follows the thermostat: off, on or heating
- Works with any `climate` entity. If you use Better Thermostat, the card can
  also show a "parked" setpoint as *Tænder…* (see `parked_setpoint`)

The card does not require Better Thermostat or any other integration.

> The card's labels are in Danish.

## Installation

### HACS (recommended)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=pilgaard&repository=room-climate-card&category=plugin)

Click the button above and then **Download**, or add the repository manually:

1. Open HACS in Home Assistant.
2. Open the ⋮ menu → **Custom repositories**.
3. Paste `https://github.com/pilgaard/room-climate-card`, choose the type
   **Dashboard** and click **Add**.
4. Find **Room Climate Card**, click **Download** and reload your browser.

### Manual

1. Copy `room-climate-card.js` to `config/www/`.
2. Go to **Settings → Dashboards → ⋮ → Resources → Add resource**:
   - URL: `/local/room-climate-card.js`
   - Type: **JavaScript module**
3. Reload your browser.

## Configuration

```yaml
type: custom:room-climate-card
name: Living room
temperature: sensor.living_room_temperature
humidity: sensor.living_room_humidity
climate: climate.living_room
radiators: 2
```

| Option                | Required | Default    | Description                                                                                                                                       |
| --------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                | yes      |            | Room name                                                                                                                                         |
| `temperature`         | *        |            | Temperature sensor. Without it, the thermostat's `current_temperature` is used                                                                    |
| `climate`             | *        |            | Thermostat. Controls the background and the bottom line                                                                                           |
| `humidity`            | no       |            | Humidity sensor (%)                                                                                                                               |
| `dew_point`           | no       |            | Existing dew point sensor. If not set, the dew point is calculated from temperature and humidity                                                  |
| `dew_margin`          | no       |            | Existing sensor for temperature minus dew point. Takes priority over both `dew_point` and the calculation                                         |
| `radiators`           | no       | `1`        | Number of radiators. Shown in the bottom line when there is more than one                                                                         |
| `parked_setpoint`     | no       |            | The setpoint the thermostat parks at while the room is off (Better Thermostat: usually `5`). If the room is on and the setpoint is still at or below this value, the bottom line shows *Tænder…* |
| `humidity_thresholds` | no       | `[60, 70]` | Humidity chip: green below the first value, yellow from the first, red from the second                                                            |
| `dew_thresholds`      | no       | `[3, 5]`   | Dew point chip (K): red below the first value, yellow from the first, orange from the second                                                      |

\* You must set at least one of `temperature` and `climate`.

### Room without a thermostat

```yaml
type: custom:room-climate-card
name: Bathroom
temperature: sensor.bathroom_temperature
humidity: sensor.bathroom_humidity
```

The bottom line then shows the absolute dew point.

## Dew point

The dew point is calculated with the Magnus formula using Sonntag's
coefficients (a = 17.62, b = 243.12 °C). The dew point chip shows the
temperature minus the dew point in kelvin. When the margin is small,
condensation can form on cold surfaces.

## License

[MIT](LICENSE)
