// Builds the standalone Jurnal Rupee PWA (index.html) from the artifact page.
// Usage: node tools/build.js <artifact.html>
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(process.argv[2], "utf8");
const root = path.join(__dirname, "..");

const scriptStart = src.indexOf("<script>");
const headPart = src.slice(0, src.indexOf("<style>"))
  .replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "");
const styleBlock = src.slice(src.indexOf("<style>"), src.indexOf("</style>") + 8);
let bodyPart = src.slice(src.indexOf("</style>") + 8, scriptStart);
let mainScript = src.slice(scriptStart);

function mustReplace(str, from, to, label) {
  const out = typeof from === "string" ? str.replace(from, to) : str.replace(from, to);
  if (out === str) throw new Error("Patch did not apply: " + label);
  return out;
}

// Footer: data lives on this phone
bodyPart = mustReplace(bodyPart,
  /<p class="foot">[\s\S]*?<\/p>/,
  '<p class="foot">Semua amaun dalam Rupee India (₹). Data disimpan dalam telefon ini sahaja. Buat sandaran (Tetapan → Eksport sandaran) sekali seminggu.</p>',
  "footer");

// Backup section in settings
bodyPart = mustReplace(bodyPart,
  '    <p id="setError" class="form-error" hidden></p>',
  `    <div class="dlg-sec">
      <h3>Sandaran data</h3>
      <p class="hint">Data disimpan dalam telefon ini sahaja, tiada di internet. Eksport sandaran sekali seminggu dan simpan dalam Files atau hantar kepada diri sendiri.</p>
      <div class="form-actions">
        <button type="button" id="exportBackup" class="btn ghost small">Eksport sandaran</button>
        <label for="importFile" class="btn ghost small filebtn">Import fail data</label>
      </div>
      <p id="backupMsg" class="hint" role="status"></p>
    </div>
    <p id="setError" class="form-error" hidden></p>`,
  "backup section");

// File input outside the dialog so labels anywhere can open it
bodyPart = mustReplace(bodyPart,
  '<div id="toast" class="toast" role="status" hidden></div>',
  '<input id="importFile" class="vh" type="file" accept="application/json,.json">\n<div id="toast" class="toast" role="status" hidden></div>',
  "file input");

// Setup state: offer import
mainScript = mustReplace(mainScript,
  `'<button class="btn ghost" type="button" data-action="open-settings"' + (S.readOnly ? " disabled" : "") + '>Susun sendiri</button></div></div>';`,
  `'<button class="btn ghost" type="button" data-action="open-settings"' + (S.readOnly ? " disabled" : "") + '>Susun sendiri</button>' +
        '<label for="importFile" class="btn ghost filebtn">Import fail data</label></div></div>';`,
  "setup import button");

// Music tab (PWA only)
mainScript = mustReplace(mainScript,
  'var TABS = ["hari", "belanja", "bajet", "diet"];',
  'var TABS = ["hari", "belanja", "bajet", "diet", "jurnal", "muzik"];',
  "tabs list");
bodyPart = mustReplace(bodyPart,
  '  <div class="view two" data-view="bajet" hidden>',
  `  <div class="view" data-view="jurnal" hidden>
    <section class="panel">
      <div class="panel-head"><h2 id="jFormTitle">Tulis hari ini</h2><span id="jStreak" class="meta"></span></div>
      <form id="jForm" class="jform" novalidate>
        <div class="chips" role="radiogroup" aria-label="Jenis catatan">
          <input type="radio" name="jKind" id="jk1" value="belajar" checked><label for="jk1">📚 Belajar</label>
          <input type="radio" name="jKind" id="jk2" value="luah"><label for="jk2">💭 Luahan</label>
          <input type="radio" name="jKind" id="jk3" value="syukur"><label for="jk3">🌱 Syukur</label>
        </div>
        <div class="jrow">
          <label class="jlbl" for="jDate">Tarikh</label><input id="jDate" type="date">
        </div>
        <fieldset class="jmoods"><legend class="jlbl">Perasaan saya</legend>
          <div class="chips">
            <input type="radio" name="jMood" id="jm1" value="1"><label for="jm1" title="Sangat sedih">😢</label>
            <input type="radio" name="jMood" id="jm2" value="2"><label for="jm2" title="Sedih">😞</label>
            <input type="radio" name="jMood" id="jm3" value="3"><label for="jm3" title="Biasa">😐</label>
            <input type="radio" name="jMood" id="jm4" value="4"><label for="jm4" title="Baik">🙂</label>
            <input type="radio" name="jMood" id="jm5" value="5"><label for="jm5" title="Gembira">😄</label>
          </div>
        </fieldset>
        <input id="jTitle" type="text" maxlength="120" placeholder="Tajuk (pilihan)" aria-label="Tajuk">
        <textarea id="jText" rows="7" aria-label="Catatan"></textarea>
        <p id="jSupport" class="jsupport" hidden>Hari yang berat. Tak apa rasa begini. Kalau terlalu berat, bercakap dengan seseorang membantu: <b>Tele-MANAS 14416</b> (India, 24 jam, percuma) atau <b>Befrienders KL 03-7627 2929</b>, atau hubungi kawan dan keluarga.</p>
        <p id="jErr" class="form-error" hidden></p>
        <div class="form-actions">
          <button type="submit" id="jSave" class="btn primary">Simpan</button>
          <button type="button" id="jCancel" class="btn ghost" hidden>Batal</button>
        </div>
      </form>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Catatan saya</h2><span id="jCount" class="meta"></span></div>
      <div id="jWeek" class="jweek" aria-label="Perasaan 7 hari"></div>
      <div id="jFilter" class="jfilter">
        <button type="button" class="mbtn" data-j="semua">Semua <span></span></button>
        <button type="button" class="mbtn" data-j="belajar">📚 <span></span></button>
        <button type="button" class="mbtn" data-j="luah">💭 <span></span></button>
        <button type="button" class="mbtn" data-j="syukur">🌱 <span></span></button>
      </div>
      <input id="jSearch" type="search" placeholder="Cari catatan…" aria-label="Cari catatan">
      <div id="jList" class="jlist"></div>
      <p class="hint">Catatan disimpan dalam telefon ini sahaja dan ikut sekali dalam Eksport sandaran.</p>
    </section>
  </div>

  <div class="view" data-view="muzik" hidden>
    <section class="panel mplayer">
      <div class="panel-head"><h2>Muzik</h2><span id="mCount" class="meta"></span></div>
      <p id="mNow" class="mnow"></p>
      <audio id="mAudio" controls preload="metadata"></audio>
      <div class="mctl">
        <button type="button" id="mPrev" class="mbtn" aria-label="Lagu sebelum">⏮</button>
        <button type="button" id="mToggle" class="mbtn big" aria-label="Main atau jeda">▶</button>
        <button type="button" id="mNext" class="mbtn wide">⏭ Seterusnya</button>
        <button type="button" id="mRepeat" class="mbtn wide" aria-pressed="false">🔂 Ulang lagu ini</button>
      </div>
      <p id="mMode" class="hint"></p>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Senarai lagu</h2><label for="mFile" class="btn primary small filebtn" style="color:var(--accent-ink)">+ Tambah lagu</label></div>
      <input id="mFile" class="vh" type="file" accept="audio/*,.mp3,.m4a" multiple>
      <div id="mList"></div>
      <p class="hint">Lagu disimpan dalam telefon ini sahaja, tidak dimuat naik ke mana-mana. Muzik terus bermain bila anda tukar tab.</p>
    </section>
  </div>

  <div class="view two" data-view="bajet" hidden>`,
  "music view");
bodyPart = mustReplace(bodyPart,
  '<path d="M8 7.5c0-1.5 1-2 1-3.5M12 7.5c0-1.5 1-2 1-3.5M16 7.5c0-1.5 1-2 1-3.5"/></svg>Diet</button>',
  `<path d="M8 7.5c0-1.5 1-2 1-3.5M12 7.5c0-1.5 1-2 1-3.5M16 7.5c0-1.5 1-2 1-3.5"/></svg>Diet</button>
    <button type="button" class="tabbtn" data-action="tab" data-tab="jurnal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/><path d="M9 8h6M9 11.5h4"/></svg>Jurnal</button>
    <button type="button" class="tabbtn" data-action="tab" data-tab="muzik"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>Muzik</button>`,
  "music tab button");

// Local storage instead of claude.ai db
mainScript = mustReplace(mainScript,
  /  async function init\(\)\{[\s\S]*?\n  init\(\);/,
  `  async function init(){
    setupStatic(); render();
    db = window.LocalDB;
    downloads = {save: function(o){ var n = o.filename || "fail.txt"; return window.saveFile(n, o.data, /\\.csv$/i.test(n) ? "text/csv" : "application/json"); }};
    subscribe();
  }
  init();`,
  "init");

const pwaHead = `<!doctype html>
<html lang="ms">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#4A3E9E">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Jurnal Rupee">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
`;
const extraStyle = `<style>
:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
html{-webkit-text-size-adjust:100%}
body{margin:0}
img{max-width:100%}
[hidden]{display:none!important}
.vh{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none}
.filebtn{display:inline-flex;align-items:center;color:var(--ink);font-size:.8rem}
.tabbar-in{grid-template-columns:repeat(6,minmax(0,1fr))}
.tabbtn{font-size:.64rem;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body[data-tab="muzik"] .cyclebar,body[data-tab="jurnal"] .cyclebar{display:none}
.jform{display:flex;flex-direction:column;gap:12px}
.jrow{display:flex;align-items:center;gap:10px}
.jrow input{width:auto;flex:1}
.jlbl{font-size:.78rem;font-weight:600;color:var(--muted)}
.jmoods{border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.jmoods .chips label{font-size:1.35rem;padding:4px 10px;line-height:1.2}
.jsupport{margin:0;padding:10px 12px;border-radius:10px;background:var(--accent-soft);color:var(--ink);font-size:.85rem;line-height:1.5}
.jweek{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:12px}
.jday{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 0;border-radius:10px;background:var(--bg)}
.jday.now{outline:2px solid var(--accent-soft)}
.jface{font-size:1.15rem;line-height:1.3}
.jday small{color:var(--muted);font-size:.68rem}
.jfilter{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.jfilter .mbtn{height:36px;font-size:.8rem}
.jfilter .mbtn span{color:var(--muted);font-weight:500}
#jSearch{margin-bottom:12px}
.jlist{display:flex;flex-direction:column;gap:8px}
.jdate{margin:10px 0 0;font-size:.8rem;color:var(--muted);font-weight:600;text-transform:none}
.jentry{padding:12px;border-radius:12px;background:var(--bg);border-left:4px solid var(--accent)}
.jentry.k-luah{border-left-color:#C2669B}
.jentry.k-syukur{border-left-color:#3E9E6B}
.jhead{display:flex;align-items:center;gap:8px;font-size:.78rem;color:var(--muted)}
.jkind{font-weight:600;color:var(--ink)}
.jmood{font-size:1rem}
.jtime{margin-left:auto}
.jtitle{margin:6px 0 0;font-size:1rem;font-family:var(--f-display)}
.jtext{margin:6px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.55}
.jtext.clip{display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden}
.jact{display:flex;gap:4px;justify-content:flex-end;align-items:center;margin-top:6px}
.mnow{font-family:var(--f-display);font-weight:600;font-size:1.15rem;overflow-wrap:anywhere}
.mplayer audio{width:100%}
.mctl{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.mbtn{height:44px;min-width:44px;padding:0 14px;border-radius:999px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:600 .85rem/1 var(--f-body);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.mbtn.big{width:54px;height:54px;padding:0;background:var(--accent);border-color:var(--accent);color:var(--accent-ink);font-size:1.1rem}
.mbtn[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}
.mbtn:disabled{opacity:.45;cursor:not-allowed}
.mrename{display:flex;flex-direction:row;flex-wrap:wrap;align-items:center;gap:6px;flex:1;min-width:0}
.mrename input{flex:1;min-width:0;padding:7px 9px}
.mtracks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.mtrack{display:flex;align-items:center;gap:10px;padding:8px;border-radius:12px;background:var(--bg)}
.mtrack.on{background:var(--accent-soft)}
.mplay{width:38px;height:38px;flex:none;border-radius:50%;border:0;background:var(--accent);color:var(--accent-ink);font-size:.85rem;cursor:pointer}
.mmeta{flex:1;min-width:0;display:flex;flex-direction:column}
.mname{font-weight:600;overflow-wrap:anywhere}
.mmeta small{color:var(--muted);font-size:.75rem}
.mact{display:flex;gap:2px;align-items:center}
</style>
`;

const localDb = fs.readFileSync(path.join(__dirname, "localdb.js"), "utf8");
const musicJs = fs.readFileSync(path.join(__dirname, "music.js"), "utf8");
const journalJs = fs.readFileSync(path.join(__dirname, "journal.js"), "utf8");
const html = pwaHead + headPart + styleBlock + "\n" + extraStyle + "</head>\n<body>\n" + bodyPart +
  "<script>\n" + localDb + "\n</script>\n" + mainScript + "\n" + "<script>\n" + musicJs + "\n</script>\n" +
  "<script>\n" + journalJs + "\n</script>\n" +
  `<script>
(function(){
  var msg = function(t){ var p = document.getElementById("backupMsg"); if (p) p.textContent = t; var o = document.getElementById("toast"); o.textContent = t; o.hidden = false; setTimeout(function(){ o.hidden = true; }, 3000); };
  document.getElementById("exportBackup").addEventListener("click", function(){
    var d = window.LocalDB.exportAll();
    window.saveFile("jurnal-rupee-sandaran-" + new Date().toISOString().slice(0,10) + ".json", JSON.stringify(d), "application/json")
      .then(function(){ msg("Sandaran dieksport (" + Object.keys(d.docs).length + " rekod)."); }).catch(function(){});
  });
  document.getElementById("importFile").addEventListener("change", function(ev){
    var f = ev.target.files && ev.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function(){
      try { var n = window.LocalDB.importAll(JSON.parse(r.result)); msg(n + " rekod diimport."); }
      catch (e) { msg("Fail ini bukan data Jurnal Rupee."); }
      ev.target.value = "";
    };
    r.readAsText(f);
  });
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function(){});
  if ("serviceWorker" in navigator) window.addEventListener("load", function(){ navigator.serviceWorker.register("sw.js").catch(function(){}); });
})();
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(root, "index.html"), html);
console.log("index.html written,", html.length, "bytes");
