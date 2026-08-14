// Keeps the page URL in sync with the active streams (?streams=chan1,chan2)
// so the address bar always has a shareable link to the current watch
// party, and opening that link restores the same set of streams.

import { parseChannel } from "./twitch.js";
import { MAX_SLOTS } from "./state.js";

var PARAM = "streams";

export function readChannelsFromURL(){
  var params = new URLSearchParams(location.search);
  var raw = params.get(PARAM);
  if (!raw) return [];
  return raw.split(",")
    .map(function(s){ return parseChannel(s); })
    .filter(function(c){ return !!c; })
    .slice(0, MAX_SLOTS);
}

// Rewrites the URL without adding a new browser-history entry, so
// repeatedly adding/removing streams doesn't spam the back button.
export function writeChannelsToURL(channels){
  var params = new URLSearchParams(location.search);
  if (channels.length){
    params.set(PARAM, channels.join(","));
  } else {
    params.delete(PARAM);
  }
  var qs = params.toString();
  var newUrl = location.pathname + (qs ? "?" + qs : "") + location.hash;
  history.replaceState(null, "", newUrl);
}
