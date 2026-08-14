# WatchParty

A static site for watching up to 4 Twitch streams at once — no backend, no build step, no chat.

## Files

```
index.html        markup only
css/style.css      all styling
js/state.js        shared app state (slots, audible stream, focused stream)
js/twitch.js       everything that talks to the Twitch Player embed API
js/layout.js       grid/focus layout math — pure DOM positioning, never touches players
js/app.js          entry point: builds the DOM and wires up events
```


## Features

- Responsive multiview: the grid always matches how many streams are active : 1 stream fills the view, 2 sit side by side, 3 are two-up-one-under, 4 form a 2x2 grid. No scrolling, fills the viewport.
- **Click a stream to focus it** — it expands to fill the view (theater mode), with the other active streams shown as a thumbnail strip underneath. Click a thumbnail to switch focus to it, click the background (or press Esc) to return to multiview, or use the "Multiview" button on the enlarged stream.
- Add a stream by channel name or full twitch.tv link; remove any stream with the × on its slot.
- Every stream keeps Twitch's native player controls (play/pause, volume, quality, fullscreen) — hover a stream to see them. (Note: while in multiview, clicking a tile focuses it rather than reaching the native controls directly — enter focus mode first, then hover the enlarged stream for full control access.)
- Only one stream is ever audible. Use the **Listening to** dropdown in the header to switch which one has sound; the rest mute automatically. The first stream you add becomes audible by default, and removing the audible stream hands audio to whichever stream is left.


## Notes

- Only streams that are actually live can be watched — Twitch's player shows an offline state for channels that aren't currently streaming.
- Channel names/links aren't validated against Twitch's API (this stays fully static/serverless) — a typo'd name just shows as offline rather than erroring.
