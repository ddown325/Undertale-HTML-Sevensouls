/*
 * Undertale-HTML "Seven Souls" mod
 * Patch engine + soul selector. port by Kantasu
 *
 * Patches are applied to the merged game.unx ArrayBuffer before the
 * GameMaker runner loads it. See mod/patches.json (generated offline).
 */
(function () {
  'use strict';

  var SOULS = [
    {
      id: 'determination', name: 'DETERMINATION', color: '#FF0000', glow: 'rgba(255,0,0,0.45)',
      desc: 'The classic red SOUL. The story as it was meant to be.',
      tag: 'vanilla'
    },
    {
      id: 'patience', name: 'PATIENCE', color: '#00E5FF', glow: 'rgba(0,229,255,0.45)',
      desc: 'A cyan SOUL. Flowey wants nothing to do with a soul that simply waits him out. Even the pellets refuse to touch you.',
      tag: 'flowey flees'
    },
    {
      id: 'bravery', name: 'BRAVERY', color: '#FF9A00', glow: 'rgba(255,154,0,0.45)',
      desc: 'An orange SOUL. Run headfirst into everything. The pellets will scatter before you land a hit.',
      tag: 'flowey flees'
    },
    {
      id: 'integrity', name: 'INTEGRITY', color: '#2E6BFF', glow: 'rgba(46,107,255,0.45)',
      desc: 'A blue SOUL. Honest to a fault. The flower sees right through you... and wants no part of what he finds.',
      tag: 'flowey flees'
    },
    {
      id: 'perseverance', name: 'PERSEVERANCE', color: '#B400FF', glow: 'rgba(180,0,255,0.45)',
      desc: 'A purple SOUL. You do not know when to quit. Flowey gives up on you before you get the chance.',
      tag: 'flowey flees'
    },
    {
      id: 'kindness', name: 'KINDNESS', color: '#00E436', glow: 'rgba(0,228,54,0.45)',
      desc: 'A green SOUL. Care for others, and they will care for you. Flowey is thoroughly disgusted.',
      tag: 'flowey flees'
    },
    {
      id: 'justice', name: 'JUSTICE', color: '#FFE000', glow: 'rgba(255,224,0,0.45)',
      desc: 'A yellow SOUL. Every deed gets its verdict, even down here. The verdict on you: not worth the trouble.',
      tag: 'flowey flees'
    }
  ];

  var STORAGE_KEY = 'ut7.soul';
  var PATCHES = null;
  var audioCtx = null;

  function getStoredSoul() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      if (!v) return null;
      /* savesync.js may re-serialize localStorage values as 'JS:<json>' */
      if (v.indexOf('JS:') === 0) {
        try { v = JSON.parse(v.slice(3)); } catch (e) { return null; }
      }
      return (typeof v === 'string' && v) ? v : null;
    } catch (e) { return null; }
  }

  function storeSoul(id) {
    try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* private mode */ }
  }

  function loadPatches(cb) {
    fetch('mod/patches.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('patches.json ' + r.status); return r.json(); })
      .then(function (j) { PATCHES = j; cb(null); })
      .catch(function (err) { cb(err); });
  }

  function applyPatches(buffer, soulId) {
    if (!PATCHES || !PATCHES[soulId]) return 0;
    var list = PATCHES[soulId].patches;
    var u8 = new Uint8Array(buffer);
    for (var i = 0; i < list.length; i++) {
      var off = list[i][0], bytes = list[i][1];
      for (var b = 0; b < bytes.length; b++) u8[off + b] = bytes[b];
    }
    return list.length;
  }

  /* ---------------- tiny beep ---------------- */
  function beep(freq, dur, when) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var t = audioCtx.currentTime + (when || 0);
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.07));
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t); o.stop(t + (dur || 0.07) + 0.02);
    } catch (e) { /* audio blocked */ }
  }

  /* ---------------- soul selector UI ---------------- */
  var selIndex = 0;
  var onConfirm = null;
  var ui = {};

  /* pixel heart as inline SVG (11x10 grid) */
  function heartSVG(color, size) {
    var rects = [
      [2, 0, 2, 1], [7, 0, 2, 1],
      [1, 1, 4, 1], [6, 1, 4, 1],
      [0, 2, 11, 3],
      [1, 5, 9, 1], [2, 6, 7, 1], [3, 7, 5, 1], [4, 8, 3, 1], [5, 9, 1, 1]
    ];
    var r = '';
    for (var i = 0; i < rects.length; i++) {
      r += '<rect x="' + rects[i][0] + '" y="' + rects[i][1] + '" width="' + rects[i][2] + '" height="' + rects[i][3] + '"/>';
    }
    return '<svg viewBox="0 0 11 10" shape-rendering="crispEdges" width="' + size + '" height="' + (size * 10 / 11) + '" style="display:block">' +
      '<g fill="' + color + '">' + r + '</g></svg>';
  }

  function buildSelector() {
    ui.root = document.getElementById('soulSelect');
    ui.hearts = document.getElementById('ssHearts');
    ui.name = document.getElementById('ssName');
    ui.desc = document.getElementById('ssDesc');
    ui.tag = document.getElementById('ssTag');
    ui.prev = document.getElementById('ssCurrent');
    ui.confirmBtn = document.getElementById('ssConfirm');
    ui.hearts.innerHTML = '';
    SOULS.forEach(function (s, i) {
      var d = document.createElement('button');
      d.className = 'ss-heart';
      d.type = 'button';
      d.innerHTML = heartSVG(s.color, 44);
      d.title = s.name;
      d.style.color = s.color;   /* currentColor glow in CSS */
      d.addEventListener('click', function (e) {
        d.blur();                /* don't steal keyboard focus */
        if (selIndex === i) { confirm(); } else { move(i - selIndex); }
      });
      ui.hearts.appendChild(d);
    });
    if (ui.confirmBtn) {
      ui.confirmBtn.addEventListener('click', function () {
        ui.confirmBtn.blur();
        confirm();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (ui.root.hidden) return;
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'a' || k === 'A') { move(-1); e.preventDefault(); }
      else if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'd' || k === 'D') { move(1); e.preventDefault(); }
      else if (k === 'Enter' || k === 'z' || k === 'Z' || k === ' ') {
        if (e.repeat) { e.preventDefault(); return; }   /* ignore held key auto-repeat */
        confirm();
        e.preventDefault();
      }
    });
    updateSel();
  }

  function move(delta) {
    var n = SOULS.length;
    selIndex = ((selIndex + delta) % n + n) % n;
    beep(delta < 0 ? 620 : 700, 0.045);
    updateSel();
  }

  function updateSel() {
    var btns = ui.hearts.children;
    for (var i = 0; i < btns.length; i++) {
      var on = i === selIndex;
      btns[i].classList.toggle('selected', on);
      btns[i].style.transform = on ? 'translateY(-10px) scale(1.25)' : 'none';
    }
    var s = SOULS[selIndex];
    ui.name.textContent = s.name;
    ui.name.style.color = s.color;
    ui.name.style.textShadow = '0 0 12px ' + s.glow;
    ui.desc.textContent = s.desc;
    ui.tag.textContent = s.tag.toUpperCase();
    ui.tag.style.color = s.color;
    if (ui.confirmBtn) {
      ui.confirmBtn.style.color = s.color;
      ui.confirmBtn.style.borderColor = s.color;
      ui.confirmBtn.style.boxShadow = '0 0 14px ' + s.glow;
    }
  }

  function confirm() {
    if (ui.root.hidden) return;   /* already confirmed */
    var s = SOULS[selIndex];
    beep(880, 0.06, 0);
    beep(1174, 0.09, 0.07);
    storeSoul(s.id);
    ui.root.hidden = true;
    if (onConfirm) { var cb = onConfirm; onConfirm = null; cb(s.id); }
  }

  function showSelector(currentSoulId, cb) {
    onConfirm = cb;
    if (currentSoulId) {
      for (var i = 0; i < SOULS.length; i++) if (SOULS[i].id === currentSoulId) selIndex = i;
      ui.prev.textContent = 'Previously: ' + soulName(currentSoulId);
      ui.prev.hidden = false;
    } else {
      ui.prev.hidden = true;
    }
    ui.root.hidden = false;
    updateSel();
  }

  function soulName(id) {
    for (var i = 0; i < SOULS.length; i++) if (SOULS[i].id === id) return SOULS[i].name;
    return id;
  }

  window.UndertaleMod = {
    SOULS: SOULS,
    loadPatches: loadPatches,
    applyPatches: applyPatches,
    getStoredSoul: getStoredSoul,
    storeSoul: storeSoul,
    buildSelector: buildSelector,
    showSelector: showSelector,
    soulName: soulName,
    heartSVG: heartSVG,
    beep: beep
  };
})();
