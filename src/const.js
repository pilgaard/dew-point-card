/* global __VERSION__ */

// Injected by build.mjs from package.json
export const VERSION = __VERSION__;

export const CARD_TYPE = "room-climate-card";
export const EDITOR_TYPE = "room-climate-card-editor";

export const DEFAULTS = {
  humidity_thresholds: [60, 70], // below 60 green, 60-69 yellow, 70+ red
  dew_thresholds: [3, 5], // below 3 red, 3-5 yellow, 5+ orange
};
