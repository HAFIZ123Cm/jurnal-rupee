// On-device store with the small subset of the claude.ai db API the page uses.
(function(){
  var KEY = "jurnalRupee.v1";
  var docs = {};
  try { docs = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { docs = {}; }
  var listeners = [];
  var SEG = /^[A-Za-z0-9_\-.~:@+]+$/;

  function persist(){
    try { localStorage.setItem(KEY, JSON.stringify(docs)); }
    catch (e) { throw {code: "quota_exceeded", message: String(e)}; }
  }
  function clone(o){ return JSON.parse(JSON.stringify(o)); }
  function meta(){ return {fromCache: false, hasPendingWrites: false}; }
  function docSnap(p){
    var d = docs[p], frozen = d ? clone(d) : undefined;
    return {id: p.split("/").pop(), exists: !!d, data: function(){ return frozen ? clone(frozen) : undefined; }, metadata: meta()};
  }
  function colSnap(p){
    var pre = p + "/", n = p.split("/").length + 1;
    var ds = Object.keys(docs).filter(function(k){ return k.indexOf(pre) === 0 && k.split("/").length === n; }).sort().map(docSnap);
    return {docs: ds, size: ds.length, empty: !ds.length, docChanges: function(){ return []; }, metadata: meta()};
  }
  function emit(){
    listeners.slice().forEach(function(l){
      try { l.next(l.type === "doc" ? docSnap(l.path) : colSnap(l.path)); } catch (e) { console.error(e); }
    });
  }
  function listen(type, p, next){
    var l = {type: type, path: p, next: next};
    listeners.push(l);
    setTimeout(function(){ if (listeners.indexOf(l) >= 0) next(type === "doc" ? docSnap(p) : colSnap(p)); }, 0);
    return function(){ var i = listeners.indexOf(l); if (i >= 0) listeners.splice(i, 1); };
  }
  function rid(){ return "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function check(p, even){
    var s = p.split("/");
    if (!s.every(function(x){ return SEG.test(x) && x !== "." && x !== ".."; }) || (s.length % 2 === 0) !== even) throw new TypeError("Bad path: " + p);
  }
  function docRef(p){
    check(p, true);
    var ref = {
      id: p.split("/").pop(), path: p,
      get: function(){ return Promise.resolve(docSnap(p)); },
      set: function(data){
        return new Promise(function(res, rej){
          var prev = docs[p];
          docs[p] = clone(data);
          try { persist(); } catch (e) { if (prev === undefined) delete docs[p]; else docs[p] = prev; return rej(e); }
          emit(); res();
        });
      },
      update: function(data){
        if (!docs[p]) return Promise.reject({code: "invalid_argument", message: "Document does not exist"});
        return ref.set(Object.assign({}, docs[p], data));
      },
      delete: function(){ delete docs[p]; try { persist(); } catch (e) {} emit(); return Promise.resolve(); },
      onSnapshot: function(next){ return listen("doc", p, next); },
      collection: function(sub){ return colRef(p + "/" + sub); }
    };
    return ref;
  }
  function colRef(p){
    check(p, false);
    return {
      path: p,
      doc: function(id){ return docRef(p + "/" + (id || rid())); },
      add: function(d){ var r = docRef(p + "/" + rid()); return r.set(d).then(function(){ return r; }); },
      get: function(){ return Promise.resolve(colSnap(p)); },
      onSnapshot: function(next){ return listen("col", p, next); }
    };
  }
  window.LocalDB = {
    doc: docRef, collection: colRef,
    exportAll: function(){ return {app: "jurnal-rupee", format: 1, exportedAt: new Date().toISOString(), docs: clone(docs)}; },
    importAll: function(obj){
      if (!obj || obj.app !== "jurnal-rupee" || !obj.docs || typeof obj.docs !== "object") throw new Error("Not a Jurnal Rupee file");
      var n = 0;
      Object.keys(obj.docs).forEach(function(k){
        var s = k.split("/");
        if (s.length % 2 === 0 && s.every(function(x){ return SEG.test(x); }) && obj.docs[k] && typeof obj.docs[k] === "object") { docs[k] = obj.docs[k]; n++; }
      });
      persist(); emit(); return n;
    }
  };

  // Share sheet on phones, download link elsewhere
  window.saveFile = function(name, text, mime){
    var blob = new Blob([text], {type: mime});
    function dl(){
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      return {status: "saved"};
    }
    var file = null;
    try { file = new File([blob], name, {type: mime}); } catch (e) {}
    if (file && navigator.canShare && navigator.canShare({files: [file]})) {
      return navigator.share({files: [file], title: name}).then(function(){ return {status: "saved"}; }, function(e){
        if (e && e.name === "AbortError") throw {code: "declined"};
        return dl();
      });
    }
    return Promise.resolve(dl());
  };
})();
