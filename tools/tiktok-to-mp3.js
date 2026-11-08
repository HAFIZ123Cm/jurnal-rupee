// Converts a saved TikTok video to MP3 and cuts off TikTok's end-screen sound.
// Usage: node tools/tiktok-to-mp3.js <video> <out.mp3> ["Song name"]
// The end screen is found as: a quiet moment (song faded out) followed by a loud
// burst in the last ~8 seconds. Everything from that quiet moment on is removed.
const { execFileSync } = require("child_process");
const fs = require("fs"), os = require("os"), path = require("path");
const [, , input, output, title] = process.argv;
if (!input || !output) { console.error("Usage: node tiktok-to-mp3.js <video> <out.mp3> [title]"); process.exit(1); }

const dur = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", input]).toString());
const start = Math.max(0, dur - 7);
const tmpName = "rms-" + process.pid + ".txt", tmp = path.join(os.tmpdir(), tmpName);
execFileSync("ffmpeg", ["-v", "error", "-ss", String(start), "-i", path.resolve(input), "-vn", "-af",
  "aresample=44100,asetnsamples=n=2205,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=" + tmpName,
  "-f", "null", "-"], { cwd: os.tmpdir() });
const rows = []; let t = null;
for (const line of fs.readFileSync(tmp, "utf8").split(/\r?\n/)) {
  const m = line.match(/pts_time:([\d.]+)/); if (m) t = start + parseFloat(m[1]);
  const r = line.match(/RMS_level=(.+)/); if (r && t !== null) rows.push({ t, db: r[1] === "-inf" ? -200 : parseFloat(r[1]) });
}
fs.unlinkSync(tmp);

// TikTok's end screen: ~1.3 s "whoosh-click" (≈ -4 dB) then digital silence to the end.
// 1) find where the trailing silence starts, 2) look back up to 2 s for the click's sharp onset.
let cut = null, ts = null;
for (let i = rows.length - 1; i >= 0 && rows[i].db < -60; i--) ts = rows[i].t;
if (ts !== null) {
  const w = rows.filter(r => r.t >= ts - 2.0 && r.t < ts);
  for (let i = 1; i + 3 < w.length; i++) {
    const next = (w[i].db + w[i + 1].db + w[i + 2].db + w[i + 3].db) / 4;
    if (w[i].db >= -10 && next >= -10 && w[i].db - w[i - 1].db >= 6) { cut = w[i - 1].t; break; }
  }
}
if (cut === null) {                                                                // no click found: just drop trailing silence
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i].db > -50) { cut = rows[i].t + 0.1; break; }
}
if (cut === null || cut < 1) cut = dur;
const fade = Math.min(0.4, cut / 4);
const args = ["-v", "error", "-y", "-i", input, "-vn", "-t", cut.toFixed(2), "-af", `afade=t=out:st=${(cut - fade).toFixed(2)}:d=${fade}`,
  "-c:a", "libmp3lame", "-q:a", "2"];
if (title) args.push("-metadata", "title=" + title);
args.push(output);
execFileSync("ffmpeg", args);
console.log(`${path.basename(input)}: ${dur.toFixed(2)}s → cut at ${cut.toFixed(2)}s (removed ${(dur - cut).toFixed(2)}s) → ${output}`);
