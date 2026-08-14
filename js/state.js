// Shared, mutable app state. Kept in one small module so the other files
// (layout, twitch, app) all read/write the same source of truth instead of
// passing a growing pile of arguments around.

export const MAX_SLOTS = 4;

// Twitch requires the embedding page's domain(s) to be whitelisted. Using
// location.hostname means this works automatically wherever the site is
// deployed (including a GitHub Pages *.github.io URL) with no editing.
export const PARENT_DOMAINS = [location.hostname, "localhost", "127.0.0.1"];

export const state = {
  // slots[i] is either null, or { channel, player, ready }
  slots: new Array(MAX_SLOTS).fill(null),
  audibleIndex: -1, // which slot currently has sound, -1 = none
  focusedIndex: -1  // which slot is enlarged (theater mode), -1 = grid view
};

export function countFilled(){
  var n = 0;
  for (var i = 0; i < MAX_SLOTS; i++) if (state.slots[i]) n++;
  return n;
}
