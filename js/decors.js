// Décors provisoires, dessinés en SVG, en attendant les vraies images (img/l-*.jpg).
// Dès qu'une image est listée dans window.__IMAGES (js/medias.js), elle remplace le dessin.
(function (G) {
  "use strict";
  const MF = G.MF = G.MF || {};
  const R = (x, y, w, h, f, o = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${o}/>`;
  const P = (d, f, o = "") => `<path d="${d}" fill="${f}" ${o}/>`;
  const C = (x, y, r, f, o = "") => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${o}/>`;
  const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join("");
  // Ogive gothique
  const ogive = (x, y, w, h, f, o = "") => P(`M${x} ${y + h}V${y + w * .55}Q${x} ${y} ${x + w / 2} ${y - w * .12}Q${x + w} ${y} ${x + w} ${y + w * .55}V${y + h}Z`, f, o);
  // Cercueil (casier, sarcophage, miroir)
  const cercueil = (x, y, w, h, f, o = "") => P(`M${x + w * .28} ${y}H${x + w * .72}L${x + w} ${y + h * .26}L${x + w * .8} ${y + h}H${x + w * .2}L${x} ${y + h * .26}Z`, f, o);
  const sol = (c1, c2) => `<g>${R(0, 640, 1600, 260, c1)}${rep(9, r => rep(14, c => (r + c) % 2 ? "" : P(`M${800 + (c - 7) * (90 + r * 26)} ${640 + r * r * 3.4}L${800 + (c - 6) * (90 + r * 26)} ${640 + r * r * 3.4}L${800 + (c - 6) * (90 + (r + 1) * 26)} ${640 + (r + 1) * (r + 1) * 3.4}L${800 + (c - 7) * (90 + (r + 1) * 26)} ${640 + (r + 1) * (r + 1) * 3.4}Z`, c2)))}</g>`;
  const mur = (c1, c2) => `<defs><linearGradient id="mur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient><radialGradient id="lune"><stop offset="0" stop-color="#fff4fb"/><stop offset=".6" stop-color="#f6c9e4"/><stop offset="1" stop-color="#f6c9e4" stop-opacity="0"/></radialGradient></defs>${R(0, 0, 1600, 640, "url(#mur)")}`;
  const miroir = (x, y, w, h) => `${ogive(x - 12, y - 10, w + 24, h + 20, "#3a2a17")}${ogive(x, y, w, h, "#c9d3e6")}${ogive(x, y, w, h, "#0d0a14", 'opacity=".55"')}${P(`M${x + w * .2} ${y + h * .9}L${x + w * .5} ${y + h * .1}L${x + w * .58} ${y + h * .1}L${x + w * .28} ${y + h * .9}Z`, "#fff", 'opacity=".12"')}`;
  const drap = (x, y, w, h) => P(`M${x} ${y}Q${x + w / 2} ${y - 30} ${x + w} ${y}L${x + w + 14} ${y + h}Q${x + w * .75} ${y + h - 26} ${x + w / 2} ${y + h}Q${x + w * .25} ${y + h + 20} ${x - 14} ${y + h}Z`, "#d9d2e3", 'opacity=".8"');
  const bougie = (x, y) => `${R(x - 5, y, 10, 44, "#1a1420")}${P(`M${x} ${y - 22}Q${x + 9} ${y - 6} ${x} ${y}Q${x - 9} ${y - 6} ${x} ${y - 22}Z`, "#ffb347")}`;
  const fenetre = (x, y, w, h, c) => `${ogive(x, y, w, h, c)}${P(`M${x + w / 2} ${y - w * .1}V${y + h}M${x} ${y + h * .55}H${x + w}`, "none", 'stroke="#120c1c" stroke-width="8"')}`;

  const D = {
    hall: () => mur("#1c1028", "#2c1238") + rep(5, i => ogive(90 + i * 300, 120, 220, 520, "#150c20")) + fenetre(690, 60, 220, 300, "#3b1d52") + C(800, 190, 70, "url(#lune)") +
      rep(2, i => drap(150 + i * 1100, 220, 180, 330)) + miroir(735, 260, 130, 280) + sol("#1a0f22", "#ff2e93") +
      R(520, 560, 560, 26, "#3a1730") + R(560, 586, 20, 110, "#2a1024") + R(1020, 586, 20, 110, "#2a1024") +
      P("M720 560h160v-30h-26v-34h-24v-30h-60v30h-24v34h-26z", "#ff8cc6") + rep(5, i => bougie(748 + i * 26, 440)) +
      rep(7, i => C(180 + i * 210, 60 + (i % 2) * 40, 34, "#0b0710", 'stroke="#ff2e93" stroke-width="2" opacity=".8"')) +
      P("M0 30Q400 110 800 40Q1200 110 1600 30", "none", 'stroke="#ff2e93" stroke-width="3" opacity=".5"') + R(1340, 400, 90, 140, "#241530", 'stroke="#8d7aa3" stroke-width="3"'),
    casiers: () => mur("#160d22", "#24122e") + rep(8, i => cercueil(70 + i * 190, 170, 150, 440, i === 2 ? "#ff2e93" : ["#3a2a4d", "#2b3a4d", "#4d3a2a", "#2a4d3f"][i % 4], 'stroke="#0b0710" stroke-width="6"') + C(145 + i * 190, 400, 9, "#d8c27a") + R(118 + i * 190, 250, 54, 8, "#0b0710", 'opacity=".5"')) +
      sol("#140c1c", "#3a2a4d") + R(1120, 640, 360, 26, "#2b1a36") + R(1150, 666, 16, 70, "#1c1026") + R(1434, 666, 16, 70, "#1c1026") + P("M394 388c-10-14-30-4-20 12l20 20 20-20c10-16-10-26-20-12z", "#fff"),
    labo: () => mur("#0f1a1c", "#12262a") + rep(3, i => fenetre(120 + i * 520, 70, 160, 230, "#1c3a40")) + miroir(770, 170, 150, 330) + P("M740 170l210 0l-20 360l-170 0z", "#3d4a4d", 'opacity=".35"') +
      sol("#0c1416", "#1f6f68") + R(180, 520, 620, 30, "#27373a") + R(210, 550, 22, 150, "#1b282a") + R(750, 550, 22, 150, "#1b282a") +
      rep(6, i => `${R(220 + i * 86, 430 - (i % 3) * 22, 44, 90 + (i % 3) * 22, ["#7cffb2", "#ff2e93", "#8fd3ff"][i % 3], 'opacity=".7"')}${R(228 + i * 86, 410 - (i % 3) * 22, 28, 22, "#cfe")}`) +
      rep(2, i => `${R(1180 + i * 150, 180, 26, 300, "#55606a")}${C(1193 + i * 150, 160, 34, "#c9d3e6")}`) + P("M1193 160Q1270 90 1343 160", "none", 'stroke="#8fd3ff" stroke-width="5"') + R(1330, 440, 180, 200, "#1d2a2d", 'stroke="#55606a" stroke-width="4"') + rep(4, i => rep(3, j => C(1365 + i * 38, 480 + j * 50, 10, "#7cffb2", 'opacity=".5"'))),
    biblio: () => mur("#1a120c", "#2a1a12") + rep(5, s => R(60, 90 + s * 110, 1480, 12, "#3a2415") + rep(40, i => R(70 + i * 37, 100 + s * 110 - 86 - ((i * 7 + s * 3) % 5) * 4 + 0, 30, 84 + ((i * 7 + s * 3) % 5) * 4, ["#5a1e2e", "#2e3a5a", "#3f5a2e", "#5a4a1e", "#3a2a4d"][(i * 3 + s) % 5], 'transform="translate(0,2)"'))) +
      ogive(120, 190, 150, 360, "#0d0a14") + sol("#150e09", "#6b4a2a") + R(520, 560, 500, 30, "#4a2f1c") + R(540, 590, 460, 120, "#2e1c10") + R(700, 470, 140, 90, "#0f1a14", 'stroke="#3a2415" stroke-width="8"') + R(716, 486, 108, 58, "#4dff9a", 'opacity=".5"') +
      P("M1260 640L1300 150h14l40 490h-14l-6-70h-54l-6 70z", "#6b4a2a") + bougie(600, 516),
    bassins: () => mur("#0a1a1a", "#0c2b2b") + rep(4, i => ogive(120 + i * 380, 110, 240, 420, "#07302f")) + R(0, 600, 1600, 300, "#0b2423") +
      rep(3, i => P(`M${140 + i * 470} 660h400l40 200h-480z`, "#0e5550") + P(`M${150 + i * 470} 668h380l24 110h-428z`, "#19a394", 'opacity=".5"')) + C(800, 720, 26, "#ff8cc6") +
      rep(4, i => `${C(1380 + (i % 2) * 110, 300 + Math.floor(i / 2) * 130, 42, "none", `stroke="${["#ff4d4d", "#ffd24d", "#4dff88", "#4da6ff"][i]}" stroke-width="10"`)}${C(1380 + (i % 2) * 110, 300 + Math.floor(i / 2) * 130, 8, "#c9d3e6")}`) +
      rep(9, i => C(100 + i * 180, 40 + (i * 53) % 90, 5, "#7fe", 'opacity=".5"')) + C(480, 790, 60, "#051312") + C(480, 790, 60, "none", 'stroke="#2c6b66" stroke-width="12"'),
    auditorium: () => mur("#1c0a12", "#300f1c") + P("M0 0h260Q200 320 120 640H0zM1600 0h-260Q1400 320 1480 640H1600z", "#7a1030") + P("M0 0h1600v90Q800 170 0 90z", "#5c0c26") +
      rep(13, i => R(470 + i * 52, 150 + Math.abs(6 - i) * 34 - (i % 2) * 20, 38, 430 - Math.abs(6 - i) * 34 + (i % 2) * 20, "#c9a94d", 'stroke="#5c4a1a" stroke-width="3"')) + R(450, 560, 720, 60, "#2a1420") + R(620, 520, 380, 44, "#120a10") + rep(18, i => R(630 + i * 20, 526, 14, 30, i % 3 ? "#eee" : "#222")) +
      R(0, 640, 1600, 260, "#1a0a10") + rep(3, r => rep(9, i => P(`M${90 + i * 170 - r * 30} ${700 + r * 66}q60-50 120 0v50h-120z`, "#8a1236", `opacity="${.5 + r * .2}"`))),
    tour: () => mur("#0b0f24", "#151a3a") + C(800, 300, 250, "#0b0710") + C(800, 300, 240, "#3b1d52") + C(800, 300, 240, "url(#lune)", 'opacity=".5"') +
      rep(3, k => C(800, 300, 240 - k * 75, "none", 'stroke="#0b0710" stroke-width="12"')) + rep(8, i => P(`M800 300L${800 + 240 * Math.cos(i * Math.PI / 4)} ${300 + 240 * Math.sin(i * Math.PI / 4)}`, "none", 'stroke="#0b0710" stroke-width="7"')) +
      sol("#0a0c1c", "#3d4a8a") + rep(3, i => `${R(600 + i * 180, 590, 40, 70, "#3a3048")}${C(620 + i * 180, 580, 26, "none", `stroke="${["#c77b3a", "#c9d3e6", "#e6c34d"][i]}" stroke-width="9"`)}`) + P("M0 640Q200 300 120 0H0z", "#080a18") + P("M1600 640Q1400 300 1480 0H1600z", "#080a18"),
    crypte: () => mur("#1c1608", "#2e220c") + rep(6, i => R(80 + i * 270, 80, 90, 560, "#3a2c10") + R(66 + i * 270, 70, 118, 30, "#4d3a14")) + cercueil(690, 130, 220, 500, "#c9a94d", 'stroke="#5c4a1a" stroke-width="8"') + cercueil(716, 160, 168, 440, "#c9d3e6") + cercueil(716, 160, 168, 440, "#0d0a14", 'opacity=".5"') +
      sol("#171204", "#b8912e") + rep(5, i => P(`M${200 + i * 60} 640l20-${60 + i * 12}h30l20 ${60 + i * 12}z`, "#b8912e", 'opacity=".7"')) + rep(3, i => R(1180 + i * 110, 560 - i * 30, 90, 80 + i * 30, "#5c4a1a", 'stroke="#c9a94d" stroke-width="3"')) + bougie(560, 596) + bougie(1040, 596),
    titre: () => mur("#12091c", "#2a0f33") + rep(5, i => ogive(-40 + i * 360, 60, 250, 640, "#0d0714")) + C(800, 250, 190, "url(#lune)") + miroir(690, 150, 220, 520) + sol("#10081a", "#ff2e93")
  };
  MF.decor = function (id) {
    const f = D[id] || D.hall;
    return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${f()}</svg>`;
  };
  // Pose le décor d'un lieu dans un élément : la vraie image si elle existe, sinon le dessin.
  MF.poserDecor = function (el, id, image) {
    const liste = G.__IMAGES || [];
    if (image && liste.includes(image)) { el.innerHTML = ""; el.style.backgroundImage = `url(img/${image}.jpg)`; }
    else { el.style.backgroundImage = ""; el.innerHTML = MF.decor(id); }
  };
})(window);
