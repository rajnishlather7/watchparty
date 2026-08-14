// Everything that talks to the Twitch Player embed API lives here, so the
// rest of the app never touches `Twitch.*` directly.

// Accepts a bare channel name or a full twitch.tv link and returns the
// channel name, or null if it doesn't look valid.
export function parseChannel(raw){
  if (!raw) return null;
  raw = raw.trim();
  if (!raw) return null;
  var m = raw.match(/twitch\.tv\/([a-zA-Z0-9_]{2,25})/i);
  var name = m ? m[1] : raw;
  name = name.replace(/^\/+|\/+$/g, "").split("?")[0].split("/")[0];
  if (!/^[a-zA-Z0-9_]{2,25}$/.test(name)) return null;
  return name.toLowerCase();
}

// Creates a Twitch.Player (video only, no chat) mounted into the element
// with id `mountId`. Calls onReady(player) once the player fires READY.
export function createTwitchPlayer(mountId, channel, parentDomains, onReady){
  var player = new Twitch.Player(mountId, {
    channel: channel,
    parent: parentDomains,
    width: "100%",
    height: "100%",
    muted: true,
    autoplay: true
  });
  player.addEventListener(Twitch.Player.READY, function(){
    onReady(player);
  });
  return player;
}

export function destroyPlayer(player){
  try {
    if (player && typeof player.destroy === "function") player.destroy();
  } catch (err) { /* ignore */ }
}
