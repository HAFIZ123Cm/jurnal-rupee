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
</style>
`;

const localDb = fs.readFileSync(path.join(__dirname, "localdb.js"), "utf8");
const html = pwaHead + headPart + styleBlock + "\n" + extraStyle + "</head>\n<body>\n" + bodyPart +
  "<script>\n" + localDb + "\n</script>\n" + mainScript + "\n" +
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
