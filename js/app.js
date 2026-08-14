// Entry point: builds the slot DOM, wires up all events, and keeps state.js
// / layout.js / twitch.js in sync with each other. This is the only file
// that touches the DOM directly.

import { MAX_SLOTS, PARENT_DOMAINS, state, countFilled } from "./state.js";
import { parseChannel, createTwitchPlayer, destroyPlayer } from "./twitch.js";
import { computeFilledIndices, applyGridLayout, applyFocusLayout } from "./layout.js";
import { readChannelsFromURL, writeChannelsToURL } from "./urlSync.js";

var grid = document.getElementById("grid");
var addBtn = document.getElementById("add-btn");
var shareBtn = document.getElementById("share-btn");
var audioSelect = document.getElementById("audio-select");
var overlay = document.getElementById("modal-overlay");
var input = document.getElementById("channel-input");
var errorEl = document.getElementById("modal-error");
var confirmBtn = document.getElementById("modal-confirm");
var cancelBtn = document.getElementById("modal-cancel");

var slotEls = [];
var pendingSlotIndex = null;

// ---------- slot markup ----------

function emptySlotHTML(){
  return (
    '<span class="slot-index">01</span>' +
    '<div class="empty-inner">' +
      '<span class="plus">+</span>' +
      '<span class="label">ADD STREAM</span>' +
    "</div>"
  );
}

function filledSlotHTML(index, channel){
  return (
    '<span class="slot-index">01</span>' +
    '<div class="slot-topbar">' +
      '<span class="channel-tag"><span class="live-dot"></span>' + channel +
        '<span class="audible-badge" style="display:none">&#128266;</span></span>' +
      '<button type="button" class="exit-focus-btn" title="Back to multiview">&#8862; Multiview</button>' +
      '<button type="button" class="remove-btn" aria-label="Remove stream" title="Remove">&times;</button>' +
    "</div>" +
    '<div class="mount" id="mount-' + index + '"></div>' +
    '<div class="focus-catcher" title="Click to focus this stream">' +
      '<span class="expand-icon">&#10021;</span>' +
      '<span class="collapse-icon">&#10529;</span>' +
    "</div>"
  );
}

function buildSlotsDOM(){
  grid.innerHTML = "";
  slotEls = [];
  for (var i = 0; i < MAX_SLOTS; i++){
    var slot = document.createElement("div");
    slot.className = "slot empty";
    slot.dataset.index = i;
    slot.innerHTML = emptySlotHTML();
    bindEmptySlotClick(slot);
    grid.appendChild(slot);
    slotEls.push(slot);
  }
  relayout();
}

function bindEmptySlotClick(slot){
  slot.addEventListener("click", function(){
    openModal(parseInt(this.dataset.index, 10));
  });
}

// ---------- layout ----------

function relayout(){
  var filled = computeFilledIndices(state.slots);
  var canFocus = state.focusedIndex !== -1 &&
    filled.indexOf(state.focusedIndex) !== -1 &&
    filled.length > 1;

  if (canFocus){
    applyFocusLayout(grid, slotEls, filled, state.focusedIndex);
  } else {
    state.focusedIndex = -1;
    applyGridLayout(grid, slotEls, filled);
  }
}

function enterFocus(index){
  if (!state.slots[index]) return;
  state.focusedIndex = index;
  setAudible(index);
  relayout();
}

function exitFocus(){
  if (state.focusedIndex === -1) return;
  state.focusedIndex = -1;
  relayout();
}

// Clicking the grid's own background (the gaps between tiles) exits focus.
grid.addEventListener("click", function(e){
  if (e.target === grid) exitFocus();
});

// ---------- add / remove streams ----------

function addStream(index, channel){
  var slot = slotEls[index];
  slot.className = "slot filled";
  slot.innerHTML = filledSlotHTML(index, channel);

  slot.querySelector(".remove-btn").addEventListener("click", function(e){
    e.stopPropagation();
    removeStream(index);
  });
  slot.querySelector(".exit-focus-btn").addEventListener("click", function(e){
    e.stopPropagation();
    exitFocus();
  });
  slot.querySelector(".focus-catcher").addEventListener("click", function(e){
    e.stopPropagation();
    if (state.focusedIndex === index) exitFocus();
    else enterFocus(index);
  });

  var player = createTwitchPlayer("mount-" + index, channel, PARENT_DOMAINS, function(readyPlayer){
    if (!state.slots[index]) return; // removed before it finished loading
    state.slots[index].ready = true;
    readyPlayer.setMuted(true);
    refreshAudioOptions();
    if (countFilled() === 1) setAudible(index);
  });

  state.slots[index] = { channel: channel, player: player, ready: false };

  refreshAudioOptions();
  updateAddButton();
  relayout();
  syncURL();
}

function removeStream(index){
  var entry = state.slots[index];
  if (!entry) return;
  destroyPlayer(entry.player);
  state.slots[index] = null;

  var slot = slotEls[index];
  slot.className = "slot empty";
  slot.innerHTML = emptySlotHTML();
  bindEmptySlotClick(slot);

  var wasAudible = state.audibleIndex === index;
  if (wasAudible) state.audibleIndex = -1;
  if (state.focusedIndex === index) state.focusedIndex = -1;

  refreshAudioOptions();
  updateAddButton();
  relayout();
  syncURL();

  // Hand audio to whichever stream remains rather than leaving everything
  // silently muted.
  if (wasAudible){
    var next = -1;
    for (var k = 0; k < MAX_SLOTS; k++){
      if (state.slots[k] && state.slots[k].ready){ next = k; break; }
    }
    if (next !== -1) setAudible(next);
  }
}

// ---------- shareable URL ----------

function syncURL(){
  var channels = computeFilledIndices(state.slots).map(function(i){
    return state.slots[i].channel;
  });
  writeChannelsToURL(channels);
}

function loadFromURL(){
  var channels = readChannelsFromURL();
  channels.forEach(function(channel){
    var target = state.slots.indexOf(null);
    if (target === -1) return;
    addStream(target, channel);
  });
}

function updateAddButton(){
  var full = countFilled() >= MAX_SLOTS;
  addBtn.disabled = full;
  addBtn.textContent = full ? "All slots full" : "+ Add stream";
}

// ---------- audio ----------

function refreshAudioOptions(){
  audioSelect.innerHTML = '<option value="">— none —</option>';
  for (var i = 0; i < MAX_SLOTS; i++){
    if (state.slots[i]){
      var opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = state.slots[i].channel;
      audioSelect.appendChild(opt);
    }
  }
  audioSelect.value = (state.audibleIndex !== -1 && state.slots[state.audibleIndex])
    ? String(state.audibleIndex)
    : "";
}

function setAudible(index){
  for (var i = 0; i < MAX_SLOTS; i++){
    if (!state.slots[i] || !state.slots[i].ready) continue;
    try { state.slots[i].player.setMuted(i !== index); } catch (err) { /* not ready */ }
    var tag = slotEls[i].querySelector(".audible-badge");
    if (tag) tag.style.display = i === index ? "inline" : "none";
  }
  state.audibleIndex = index === -1 ? -1 : index;
  refreshAudioOptions();
}

audioSelect.addEventListener("change", function(){
  var v = this.value;
  setAudible(v === "" ? -1 : parseInt(v, 10));
});

shareBtn.addEventListener("click", function(){
  var restoreLabel = shareBtn.textContent;
  var restore = function(){
    shareBtn.textContent = restoreLabel;
    shareBtn.disabled = false;
  };
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(location.href).then(function(){
      shareBtn.textContent = "Copied!";
      shareBtn.disabled = true;
      setTimeout(restore, 1500);
    }).catch(function(){
      window.prompt("Copy this link:", location.href);
    });
  } else {
    window.prompt("Copy this link:", location.href);
  }
});

// ---------- add-stream modal ----------

function openModal(index){
  pendingSlotIndex = index;
  errorEl.textContent = "";
  input.value = "";
  overlay.classList.remove("hidden");
  setTimeout(function(){ input.focus(); }, 0);
}

function closeModal(){
  overlay.classList.add("hidden");
  pendingSlotIndex = null;
}

function confirmAdd(){
  var channel = parseChannel(input.value);
  if (!channel){
    errorEl.textContent = "That doesn't look like a valid channel name or link.";
    return;
  }
  var target = pendingSlotIndex;
  if (target === null || state.slots[target]) target = state.slots.indexOf(null);
  if (target === -1 || target === undefined){
    errorEl.textContent = "All 4 slots are full — remove one first.";
    return;
  }
  closeModal();
  addStream(target, channel);
}

addBtn.addEventListener("click", function(){ openModal(null); });
cancelBtn.addEventListener("click", closeModal);
confirmBtn.addEventListener("click", confirmAdd);
overlay.addEventListener("click", function(e){ if (e.target === overlay) closeModal(); });
input.addEventListener("keydown", function(e){ if (e.key === "Enter") confirmAdd(); });

document.addEventListener("keydown", function(e){
  if (e.key !== "Escape") return;
  if (!overlay.classList.contains("hidden")){ closeModal(); return; }
  exitFocus();
});

// ---------- init ----------

buildSlotsDOM();
loadFromURL();
updateAddButton();
