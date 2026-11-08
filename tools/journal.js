// Journal tab (PWA only): what I learned, venting, gratitude. Stored in LocalDB as jurnal/<id>,
// so it is included in Tetapan → Eksport sandaran.
(function(){
  var db = window.LocalDB, col = db.collection("jurnal");
  var $ = function(id){ return document.getElementById(id); };
  var KINDS = {
    belajar: {label: "Belajar", icon: "📚", ph: "Apa yang saya belajar hari ini? Satu fakta, satu konsep, atau satu pengajaran hidup…"},
    luah: {label: "Luahan", icon: "💭", ph: "Tulis apa saja yang terbuku. Tiada siapa yang baca kecuali anda."},
    syukur: {label: "Syukur", icon: "🌱", ph: "Tiga perkara kecil yang saya syukuri hari ini…"}
  };
  var MOODS = [["1", "😢", "Sangat sedih"], ["2", "😞", "Sedih"], ["3", "😐", "Biasa"], ["4", "🙂", "Baik"], ["5", "😄", "Gembira"]];
  var entries = [], filter = "semua", editing = null, confirmId = null, open = {};

  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function today(){ var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
  function fmtDate(iso){
    var d = new Date(iso + "T00:00:00"), t = today(), y = new Date(Date.now() - 864e5);
    y.setMinutes(y.getMinutes() - y.getTimezoneOffset());
    if (iso === t) return "Hari ini";
    if (iso === y.toISOString().slice(0, 10)) return "Semalam";
    return d.toLocaleDateString("ms-MY", {weekday: "long", day: "numeric", month: "long", year: "numeric"});
  }
  function fmtTime(ms){ return new Date(ms).toLocaleTimeString("ms-MY", {hour: "2-digit", minute: "2-digit"}); }
  function moodOf(v){ return MOODS.filter(function(m){ return m[0] === String(v); })[0]; }
  function checked(name){ var el = document.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ""; }

  // ---- compose form ----
  function setKind(k){
    var el = document.querySelector('input[name="jKind"][value="' + k + '"]'); if (el) el.checked = true;
    $("jText").placeholder = KINDS[k].ph;
  }
  function resetForm(){
    editing = null;
    $("jForm").reset(); $("jDate").value = today(); setKind("belajar");
    $("jSave").textContent = "Simpan"; $("jCancel").hidden = true; $("jFormTitle").textContent = "Tulis hari ini";
    $("jErr").hidden = true; supportNote();
  }
  function supportNote(){
    var m = checked("jMood");
    $("jSupport").hidden = !(m === "1" || m === "2");
  }
  $("jForm").addEventListener("change", function(ev){
    if (ev.target.name === "jKind") $("jText").placeholder = KINDS[ev.target.value].ph;
    if (ev.target.name === "jMood") supportNote();
  });
  $("jForm").addEventListener("submit", function(ev){
    ev.preventDefault();
    var text = $("jText").value.trim();
    if (!text) { $("jErr").textContent = "Tulis sesuatu dulu."; $("jErr").hidden = false; $("jText").focus(); return; }
    var now = Date.now(), prev = editing && entries.filter(function(e){ return e.id === editing; })[0];
    var data = {
      date: $("jDate").value || today(), kind: checked("jKind") || "belajar", mood: checked("jMood") || null,
      title: $("jTitle").value.trim().slice(0, 120), text: text.slice(0, 20000),
      createdAt: prev ? prev.createdAt : now, updatedAt: now
    };
    var ref = editing ? col.doc(editing) : col.doc("j" + now.toString(36) + Math.random().toString(36).slice(2, 6));
    var wasEdit = !!editing;
    ref.set(data).then(function(){
      resetForm(); toast(wasEdit ? "Catatan dikemas kini." : "Catatan disimpan.");
    }).catch(function(){ $("jErr").textContent = "Tidak dapat simpan. Ruang telefon mungkin penuh."; $("jErr").hidden = false; });
  });
  $("jCancel").addEventListener("click", resetForm);

  function toast(t){ var o = $("toast"); if (!o) return; o.textContent = t; o.hidden = false; setTimeout(function(){ o.hidden = true; }, 2500); }

  // ---- list ----
  function streak(){
    var days = {}; entries.forEach(function(e){ days[e.date] = true; });
    var n = 0, d = new Date();
    if (!days[today()]) d.setDate(d.getDate() - 1);
    for (;;) {
      var x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
      if (!days[x.toISOString().slice(0, 10)]) break;
      n++; d.setDate(d.getDate() - 1);
    }
    return n;
  }
  function week(){
    var out = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(Date.now() - i * 864e5); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      var iso = d.toISOString().slice(0, 10);
      var day = entries.filter(function(e){ return e.date === iso; });
      var moods = day.map(function(e){ return Number(e.mood); }).filter(Boolean);
      var avg = moods.length ? Math.round(moods.reduce(function(a, b){ return a + b; }, 0) / moods.length) : 0;
      out.push('<div class="jday' + (iso === today() ? " now" : "") + '"><span class="jface">' + (avg ? moodOf(avg)[1] : (day.length ? "✍️" : "·")) + '</span><small>' +
        new Date(iso + "T00:00:00").toLocaleDateString("ms-MY", {weekday: "short"}).slice(0, 3) + '</small></div>');
    }
    return out.join("");
  }
  function render(){
    var n = streak();
    $("jCount").textContent = entries.length + " catatan";
    $("jStreak").textContent = n ? "🔥 " + n + " hari berturut-turut" : "Mula tulis hari ini";
    $("jWeek").innerHTML = week();
    var counts = {semua: entries.length};
    Object.keys(KINDS).forEach(function(k){ counts[k] = entries.filter(function(e){ return e.kind === k; }).length; });
    Array.prototype.forEach.call(document.querySelectorAll("#jFilter [data-j]"), function(b){
      var k = b.dataset.j; b.setAttribute("aria-pressed", k === filter ? "true" : "false");
      b.querySelector("span").textContent = counts[k] || 0;
    });
    var q = ($("jSearch").value || "").trim().toLowerCase();
    var list = entries.filter(function(e){
      return (filter === "semua" || e.kind === filter) && (!q || (e.title + " " + e.text).toLowerCase().indexOf(q) >= 0);
    });
    if (!entries.length) { $("jList").innerHTML = '<div class="empty">Belum ada catatan. Tulis satu perkara yang anda belajar hari ini, walaupun satu ayat.</div>'; return; }
    if (!list.length) { $("jList").innerHTML = '<div class="empty">Tiada catatan yang sepadan.</div>'; return; }
    var html = "", lastDate = null;
    list.forEach(function(e){
      if (e.date !== lastDate) { html += '<h3 class="jdate">' + esc(fmtDate(e.date)) + '</h3>'; lastDate = e.date; }
      var k = KINDS[e.kind] || KINDS.belajar, m = moodOf(e.mood), long = e.text.length > 280, isOpen = open[e.id] || !long;
      var acts = confirmId === e.id
        ? '<span class="confirm">Padam catatan ini?</span><button type="button" class="link danger" data-ja="del-yes" data-id="' + e.id + '">Ya, padam</button><button type="button" class="link" data-ja="del-no">Batal</button>'
        : '<button type="button" class="link" data-ja="edit" data-id="' + e.id + '">Sunting</button><button type="button" class="link danger" data-ja="del" data-id="' + e.id + '">Padam</button>';
      html += '<article class="jentry k-' + esc(e.kind) + '">' +
        '<div class="jhead"><span class="jkind">' + k.icon + " " + k.label + '</span>' + (m ? '<span class="jmood" title="' + m[2] + '">' + m[1] + '</span>' : "") +
        '<span class="jtime">' + fmtTime(e.createdAt) + '</span></div>' +
        (e.title ? '<h4 class="jtitle">' + esc(e.title) + '</h4>' : "") +
        '<p class="jtext' + (isOpen ? "" : " clip") + '">' + esc(e.text) + '</p>' +
        (long ? '<button type="button" class="link" data-ja="more" data-id="' + e.id + '">' + (isOpen ? "Tutup" : "Baca semua") + '</button>' : "") +
        '<div class="jact">' + acts + '</div></article>';
    });
    $("jList").innerHTML = html;
  }
  $("jFilter").addEventListener("click", function(ev){
    var b = ev.target.closest("[data-j]"); if (!b) return;
    filter = b.dataset.j; render();
  });
  $("jSearch").addEventListener("input", render);
  $("jList").addEventListener("click", function(ev){
    var b = ev.target.closest("[data-ja]"); if (!b) return;
    var a = b.dataset.ja, id = b.dataset.id;
    if (a === "more") { open[id] = !open[id]; render(); }
    else if (a === "del") { confirmId = id; render(); }
    else if (a === "del-no") { confirmId = null; render(); }
    else if (a === "del-yes") { confirmId = null; if (editing === id) resetForm(); col.doc(id).delete(); }
    else if (a === "edit") {
      var e = entries.filter(function(x){ return x.id === id; })[0]; if (!e) return;
      editing = id; confirmId = null;
      $("jDate").value = e.date; $("jTitle").value = e.title || ""; $("jText").value = e.text; setKind(e.kind || "belajar");
      Array.prototype.forEach.call(document.querySelectorAll('input[name="jMood"]'), function(r){ r.checked = r.value === String(e.mood); });
      $("jSave").textContent = "Simpan perubahan"; $("jCancel").hidden = false; $("jFormTitle").textContent = "Sunting catatan";
      supportNote(); render();
      $("jForm").scrollIntoView({behavior: "smooth", block: "start"}); $("jText").focus();
    }
  });

  col.onSnapshot(function(snap){
    entries = snap.docs.map(function(d){ var x = d.data(); x.id = d.id; return x; })
      .sort(function(a, b){ return a.date === b.date ? b.createdAt - a.createdAt : (a.date < b.date ? 1 : -1); });
    render();
  });
  resetForm();
})();
