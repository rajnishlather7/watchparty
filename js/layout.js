// Pure(ish) DOM layout logic: given the current state, decide which slot
// elements are visible and where they sit. Never creates/destroys players —
// only toggles CSS attributes/classes — so switching layouts never causes a
// stream to reload.

import { MAX_SLOTS } from "./state.js";

export function computeFilledIndices(slots){
  var filled = [];
  for (var i = 0; i < MAX_SLOTS; i++) if (slots[i]) filled.push(i);
  return filled;
}

// Responsive multiview: 1 stream fills the view, 2 sit side by side, 3 are
// two-up-one-under, 4 form a 2x2 grid. Driven by data-rank (position among
// filled slots), not by each slot's fixed index.
export function applyGridLayout(gridEl, slotEls, filled){
  gridEl.className = "count-" + filled.length;
  gridEl.removeAttribute("style");

  for (var j = 0; j < MAX_SLOTS; j++){
    var el = slotEls[j];
    el.removeAttribute("data-rank");
    el.dataset.role = "";
    el.style.gridColumn = "";
    el.style.gridRow = "";
    el.dataset.hidden = "true";
  }

  if (filled.length === 0){
    // Default view: a single full-size placeholder to add the first stream.
    var placeholder = slotEls[0];
    placeholder.dataset.hidden = "false";
    placeholder.dataset.rank = "1";
    return;
  }

  filled.forEach(function(idx, i){
    var el = slotEls[idx];
    el.dataset.hidden = "false";
    el.dataset.rank = String(i + 1);
    // With exactly one stream there's nothing to multiview against, so
    // treat it as already "focused": this hides the click-to-focus overlay
    // and hands clicks straight to Twitch's own play/pause/volume controls
    // instead of trapping the very first stream behind an overlay with no
    // way to reach it until a second stream gets added.
    if (filled.length === 1) el.dataset.role = "stage";
    var badge = el.querySelector(".slot-index");
    if (badge) badge.textContent = "0" + (i + 1);
  });
}

// Focus (theater) mode: the focused slot fills a big "stage" area; every
// other active stream becomes a small clickable thumbnail in a strip
// underneath. Clicking a thumbnail (handled in app.js) switches focus;
// clicking the background exits back to the grid.
export function applyFocusLayout(gridEl, slotEls, filled, focusedIndex){
  var thumbs = filled.filter(function(i){ return i !== focusedIndex; });

  gridEl.className = "focus-mode";
  gridEl.style.gridTemplateColumns = thumbs.length ? "repeat(" + thumbs.length + ", 1fr)" : "1fr";
  gridEl.style.gridTemplateRows = thumbs.length ? "1fr 110px" : "1fr";

  for (var j = 0; j < MAX_SLOTS; j++){
    var el = slotEls[j];
    el.removeAttribute("data-rank");
    el.dataset.role = "";
    el.style.gridColumn = "";
    el.style.gridRow = "";
    el.dataset.hidden = "true";
  }

  var stage = slotEls[focusedIndex];
  stage.dataset.hidden = "false";
  stage.dataset.role = "stage";
  stage.style.gridColumn = "1 / -1";
  stage.style.gridRow = "1";

  thumbs.forEach(function(idx, i){
    var el = slotEls[idx];
    el.dataset.hidden = "false";
    el.dataset.role = "thumb";
    el.style.gridColumn = String(i + 1);
    el.style.gridRow = "2";
    var badge = el.querySelector(".slot-index");
    if (badge) badge.textContent = "0" + (i + 1);
  });
}
