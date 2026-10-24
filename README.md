# Room Climate Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz)
[![Validate](https://github.com/pilgaard/room-climate-card/actions/workflows/validate.yml/badge.svg)](https://github.com/pilgaard/room-climate-card/actions/workflows/validate.yml)

A room climate card for Home Assistant. It shows the temperature, the humidity
and how far the temperature is from the dew point, and its background follows
the thermostat.

![Room climate cards on a dashboard](https://raw.githubusercontent.com/pilgaard/room-climate-card/main/docs/cards.png)

- Visual editor: set it up from the dashboard UI, no YAML needed
- Calculates the dew point from temperature and humidity, so you don't need a
  template sensor for every room
- Works with any `climate` entity, and with rooms that have no thermostat
- Follows your Home Assistant language (English and Danish included)
- One file to install, no dependencies

The card does not require Better Thermostat or any other integration.

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

1. Download
   [`dist/room-climate-card.js`](https://github.com/pilgaard/room-climate-card/raw/main/dist/room-climate-card.js)
   and copy it to `config/www/`.
2. Go to **Settings → Dashboards → ⋮ → Resources → Add resource**:
   - URL: `/local/room-climate-card.js?v=1`
   - Type: **JavaScript module**
3. Reload your browser.

When you update the file later, bump the number in `?v=1` so browsers fetch the
new version instead of a cached one.

## Configuration

Add the card from the dashboard: **Edit dashboard → Add card → Room Climate
Card**. Everything can be set in the visual editor, or in YAML:

![The visual editor](https://raw.githubusercontent.com/pilgaard/room-climate-card/main/docs/editor.png)

```yaml
type: custom:room-climate-card
name: Living room
temperature: sensor.living_room_temperature
humidity: sensor.living_room_humidity
climate: climate.living_room
```

| Option                | Required | Default    | Description                                                                                       |
| --------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------- |
| `name`                | yes      |            | Room name                                                                                         |
| `temperature`         | *        |            | Temperature sensor. Without it, the thermostat's current temperature is used                      |
| `climate`             | *        |            | Thermostat. Controls the background and the bottom line                                           |
| `humidity`            | no       |            | Humidity sensor (%). Needed for the humidity chip and for calculating the dew point               |
| `dew_point`           | no       |            | Existing dew point sensor, used instead of the calculation                                        |
| `parked_setpoint`     | no       |            | For Better Thermostat, see [below](#better-thermostat)                                            |
| `humidity_thresholds` | no       | `[60, 70]` | Humidity chip: green below the first value, yellow from the first, red from the second            |
| `dew_thresholds`      | no       | `[3, 5]`   | Dew point chip (K): red below the first value, yellow from the first, orange from the second      |

\* You must set at least one of `temperature` and `climate`.

In the visual editor, `dew_point`, `parked_setpoint` and the thresholds are
under **Advanced**.

### Room without a thermostat

```yaml
type: custom:room-climate-card
name: Bathroom
temperature: sensor.bathroom_temperature
humidity: sensor.bathroom_humidity
```

The bottom line then shows the absolute dew point.

### Better Thermostat

Better Thermostat parks the setpoint at a fixed low value (usually `5`) while a
room is off. When you turn the room back on, it can take a while before the real
temperature reaches the radiators. Without help, the card would show *Set to
5.0°* in the meantime.

Set `parked_setpoint` to the value Better Thermostat parks at, and the card
shows *Turning on…* instead whenever the room is on and the setpoint is at or
below it:

```yaml
type: custom:room-climate-card
name: Living room
temperature: sensor.living_room_temperature
humidity: sensor.living_room_humidity
climate: climate.living_room
parked_setpoint: 5
```

Leave it out for other thermostats, so a room deliberately turned down to the
minimum isn't shown as turning on.

## What the card shows

**Temperature and name.** Orange when the thermostat is on, grey when it is
off or there is no thermostat.

**Background.** Dark orange while heating (the room is below the setpoint),
brown when on but at temperature, grey when off.

**Bottom line.** *Heating to 22.0°*, *Set to 21.0°*, *Off*, *No connection*
(the thermostat is unavailable), or the dew point for rooms without a
thermostat.

**Humidity chip.** Green, yellow or red by `humidity_thresholds`.

**Dew point chip.** The temperature minus the dew point, in kelvin. Red, yellow
or orange by `dew_thresholds`. When the margin is small, condensation can form
on cold surfaces such as windows and outer walls.

Clicking the card opens the thermostat (or the temperature sensor). Clicking a
chip opens the history of its sensor.

The dew point is calculated with the Magnus formula using Sonntag's
coefficients (a = 17.62, b = 243.12 °C).

## Languages

The card and the editor use the language set in your Home Assistant profile,
and numbers are formatted to match. Included: English and Danish. Other
languages fall back to English.

To add a language, copy the `en` block in
[`src/translations.js`](src/translations.js), translate the texts and open a
pull request.

## Troubleshooting

**"Visual editor not supported", or the card doesn't update after an
upgrade.** The browser is still running an old version. Open the browser
console (F12) and look for the `room-climate-card` line with the version
number. If it shows an old version, or appears twice:

- Make sure there is only one resource for the card under **Settings →
  Dashboards → ⋮ → Resources**. If you used to install it manually, remove the
  old resource and the file in `config/www/`.
- Reload without cache (Ctrl+Shift+R, or Cmd+Shift+R on a Mac). In the
  companion app: **Settings → Companion app → Troubleshooting → Reset frontend
  cache**.

**"Custom element doesn't exist: room-climate-card".** The resource isn't
loading. Check the browser console for an error mentioning
`room-climate-card.js`.

## Development

The source lives in `src/` and is bundled with esbuild into
`dist/room-climate-card.js`, which is what HACS installs.

```
src/
  card.js                the card (entry point)
  editor.js              the visual editor, built on Home Assistant's ha-form
  translations.js        texts for the card and the editor
  styles.css             the card's styles
  const.js               version and default options
```

```sh
npm install
npm run build    # one-off build
npm run watch    # rebuild on every change
```

`dist/` is committed, because HACS installs it straight from the repository.
Run `npm run build` and commit `dist/` together with your source changes. CI
fails if they don't match.

To test in Home Assistant, copy `dist/room-climate-card.js` to `config/www/`
and add it as a resource (see [Manual](#manual)).

### Releasing

1. Bump `version` in `package.json` and run `npm install` to update the lock
   file.
2. `npm run build` and commit.
3. `git tag v<version> && git push --tags`

The release workflow checks that the tag matches `package.json` and that
`dist/` is up to date, then creates the GitHub release. Releases have no
attached files on purpose: HACS fails to download GitHub release assets, so it
installs `dist/` from the tagged commit instead.

## License

[MIT](LICENSE)
