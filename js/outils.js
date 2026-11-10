// Décodage des données et petits outils communs à l'écran et au téléphone.
(function (G) {
  "use strict";
  const MF = G.MF = G.MF || {};
  const CLE = "minuit-fuchsia-1600";
  MF.decode = function (b64) {
    const brut = atob(b64), n = brut.length, o = new Uint8Array(n), k = new TextEncoder().encode(CLE);
    for (let i = 0; i < n; i++) o[i] = brut.charCodeAt(i) ^ k[i % k.length] ^ ((i * 13) & 255);
    return JSON.parse(new TextDecoder().decode(o));
  };
  if (G.__D) MF.D = MF.decode(G.__D);
  if (G.__M) MF.M = MF.decode(G.__M);
  MF.$ = id => document.getElementById(id);
  MF.el = function (tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  MF.norme = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
})(window);
