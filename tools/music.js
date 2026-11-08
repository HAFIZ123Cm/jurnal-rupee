// Music tab (PWA only): songs are picked from the phone and kept in IndexedDB on the device.
(function(){
  var DB_NAME = "jurnalRupeeMedia", STORE = "tracks";
  var tracks = [], cur = -1, confirmId = null, urlCache = {};
  var $ = function(id){ return document.getElementById(id); };
  var audio = $("mAudio");

  function openDb(){
    return new Promise(function(res, rej){
      var r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = function(){ r.result.createObjectStore(STORE, {keyPath: "id"}); };
      r.onsuccess = function(){ res(r.result); };
      r.onerror = function(){ rej(r.error); };
    });
  }
  function tx(mode, fn){
    return openDb().then(function(db){
      return new Promise(function(res, rej){
        var t = db.transaction(STORE, mode), s = t.objectStore(STORE), out = fn(s);
        t.oncomplete = function(){ res(out && out.result !== undefined ? out.result : undefined); };
        t.onerror = function(){ rej(t.error); };
      });
    });
  }
  function load(){
    return tx("readonly", function(s){ return s.getAll(); }).then(function(all){
      tracks = (all || []).sort(function(a, b){ return a.added - b.added; });
      render();
    }).catch(function(){ $("mList").innerHTML = '<div class="empty">Simpanan lagu tidak tersedia pada pelayar ini.</div>'; });
  }
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function fmtSize(b){ return b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.round(b / 1024) + " KB"; }
  function srcFor(t){ if (!urlCache[t.id]) urlCache[t.id] = URL.createObjectURL(t.blob); return urlCache[t.id]; }

  function render(){
    var now = tracks[cur];
    $("mNow").textContent = now ? now.name : "Pilih lagu untuk dimainkan";
    $("mCount").textContent = tracks.length + " lagu";
    $("mPrev").disabled = $("mNext").disabled = tracks.length < 2;
    if (!tracks.length) {
      $("mList").innerHTML = '<div class="empty">Belum ada lagu. Tekan "Tambah lagu" dan pilih fail MP3 dari telefon anda.</div>';
      return;
    }
    $("mList").innerHTML = '<ul class="mtracks">' + tracks.map(function(t, i){
      var act = confirmId === t.id
        ? '<span class="confirm">Buang?</span><button type="button" class="link danger" data-m="del-yes" data-id="' + t.id + '">Ya</button><button type="button" class="link" data-m="del-no">Batal</button>'
        : '<button type="button" class="link danger" data-m="del" data-id="' + t.id + '">Buang</button>';
      return '<li class="mtrack' + (i === cur ? " on" : "") + '">' +
        '<button type="button" class="mplay" data-m="play" data-i="' + i + '" aria-label="Main ' + esc(t.name) + '">' + (i === cur && !audio.paused ? "❚❚" : "▶") + '</button>' +
        '<div class="mmeta"><span class="mname">' + esc(t.name) + '</span><small>' + fmtSize(t.size || 0) + '</small></div>' +
        '<div class="mact">' + act + '</div></li>';
    }).join("") + '</ul>';
  }
  function play(i){
    if (!tracks[i]) return;
    if (i === cur) { if (audio.paused) audio.play().catch(function(){}); else audio.pause(); return; }
    cur = i; audio.src = srcFor(tracks[i]); audio.play().catch(function(){});
    if ("mediaSession" in navigator) {
      try { navigator.mediaSession.metadata = new MediaMetadata({title: tracks[i].name, artist: "Jurnal Rupee", artwork: [{src: "icons/icon-512.png", sizes: "512x512", type: "image/png"}]}); } catch (e) {}
    }
    render();
  }
  function step(d){ if (!tracks.length) return; play(((cur < 0 ? 0 : cur) + d + tracks.length) % tracks.length); }

  audio.addEventListener("play", render);
  audio.addEventListener("pause", render);
  audio.addEventListener("ended", function(){ if ($("mLoop").checked && tracks.length === 1) { audio.currentTime = 0; audio.play().catch(function(){}); } else if ($("mLoop").checked || cur < tracks.length - 1) step(1); else render(); });
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.setActionHandler("nexttrack", function(){ step(1); });
      navigator.mediaSession.setActionHandler("previoustrack", function(){ step(-1); });
    } catch (e) {}
  }
  $("mPrev").addEventListener("click", function(){ step(-1); });
  $("mNext").addEventListener("click", function(){ step(1); });
  $("mFile").addEventListener("change", function(ev){
    var files = Array.prototype.slice.call(ev.target.files || []);
    if (!files.length) return;
    var base = Date.now();
    tx("readwrite", function(s){
      files.forEach(function(f, k){
        s.put({id: "t" + (base + k).toString(36) + Math.random().toString(36).slice(2, 6), name: f.name.replace(/\.[^.]+$/, ""), type: f.type, size: f.size, added: base + k, blob: f});
      });
    }).then(load).catch(function(){ alert("Lagu tidak dapat disimpan. Ruang telefon mungkin penuh."); });
    ev.target.value = "";
  });
  $("mList").addEventListener("click", function(ev){
    var b = ev.target.closest("[data-m]"); if (!b) return;
    var a = b.dataset.m;
    if (a === "play") play(Number(b.dataset.i));
    else if (a === "del") { confirmId = b.dataset.id; render(); }
    else if (a === "del-no") { confirmId = null; render(); }
    else if (a === "del-yes") {
      var id = b.dataset.id, playing = tracks[cur] && tracks[cur].id === id;
      if (playing) { audio.pause(); audio.removeAttribute("src"); cur = -1; }
      if (urlCache[id]) { URL.revokeObjectURL(urlCache[id]); delete urlCache[id]; }
      confirmId = null;
      tx("readwrite", function(s){ s.delete(id); }).then(function(){
        var keep = cur >= 0 ? tracks[cur].id : null;
        return load().then(function(){ cur = keep ? tracks.findIndex(function(t){ return t.id === keep; }) : -1; render(); });
      });
    }
  });
  if (window.indexedDB) load(); else render();
})();
