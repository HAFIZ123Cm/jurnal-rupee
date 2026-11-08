// Tiny static server for testing the app locally: node tools/serve.js
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const types = {".html":"text/html; charset=utf-8", ".js":"text/javascript", ".webmanifest":"application/manifest+json", ".png":"image/png", ".json":"application/json"};
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root) || f.includes(path.join(root, "tools")) || f.includes(path.join(root, ".git"))) { res.writeHead(404); return res.end(); }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, {"Content-Type": types[path.extname(f)] || "application/octet-stream"}); res.end(data);
  });
}).listen(8137, () => console.log("http://localhost:8137"));
