// Les mécanismes : chaque type reçoit sa définition (données encodées), l'élément où se dessiner, et une petite API du jeu.
// api : etat (mémoire du mécanisme), ok(), erreur(message), dire(texte), son, cri(), tel(message), fin(quelle), cartes(), poser(fait), sauver().
(function (G) {
  "use strict";
  const MF = G.MF = G.MF || {}, el = MF.el;
  const bouton = (texte, cls, f) => { const b = el("button", cls || "", texte); b.addEventListener("click", f); return b; };
  const rangee = (...e) => { const r = el("div", "rangee"); e.forEach(x => x && r.appendChild(x)); return r; };
  const M = MF.mecas = {};

  // ——— Cadenas à molettes
  M.code = function (def, corps, api) {
    const v = api.etat.v = api.etat.v || Array(def.longueur).fill(0), r = el("div", "rangee");
    v.forEach((_, i) => {
      const m = el("div", "molette"), b = el("b", "", v[i]);
      const tourne = d => { v[i] = (v[i] + d + 10) % 10; b.textContent = v[i]; api.son.jouer("SFX_CLIC"); };
      m.append(bouton("▲", "", () => tourne(1)), b, bouton("▼", "", () => tourne(-1))); r.appendChild(m);
    });
    corps.append(r, bouton("Essayer", "plein", () => v.join("") === def.solution ? api.ok() : api.erreur("Le cadenas ne cède pas.")));
  };

  // ——— Candélabres : chaque interrupteur bascule aussi ses deux voisins
  M.lumieres = function (def, corps, api) {
    const l = api.etat.l = api.etat.l || [...def.depart], n = def.n, c = el("div", "cercle"), bs = [];
    const peindre = () => bs.forEach((b, i) => b.classList.toggle("on", !!l[i]));
    for (let i = 0; i < n; i++) {
      const ang = i / n * 2 * Math.PI - Math.PI / 2, b = bouton(String(i + 1), "", () => {
        [i - 1, i, i + 1].forEach(k => { k = (k + n) % n; l[k] = l[k] ? 0 : 1; }); api.son.jouer("SFX_CLIC"); peindre(); api.sauver();
        if (l.every(Boolean)) setTimeout(api.ok, 500);
      });
      b.style.left = 50 + 42 * Math.cos(ang) + "%"; b.style.top = 50 + 42 * Math.sin(ang) + "%"; bs.push(b); c.appendChild(b);
    }
    corps.appendChild(c); peindre();
  };

  // ——— Deux béchers
  M.bechers = function (def, corps, api) {
    const v = api.etat.v = api.etat.v || [0, 0], cap = def.cap, noms = ["Grand", "Petit"], zone = el("div", "bechers");
    const vues = cap.map((c, i) => { const d = el("div", "becher", `<div class="verre" style="height:${c * 1.25}rem"><div class="eau"></div></div><b></b><div class="petit">${noms[i]} (${c} cl)</div>`); zone.appendChild(d); return d; });
    const peindre = () => vues.forEach((d, i) => { d.querySelector(".eau").style.height = v[i] / cap[i] * 100 + "%"; d.querySelector("b").textContent = v[i] + " cl"; });
    const fait = f => () => { f(); api.son.jouer("SFX_EAU"); peindre(); api.sauver(); if (v.includes(def.cible)) setTimeout(api.ok, 600); };
    const verse = (a, b) => { const q = Math.min(v[a], cap[b] - v[b]); v[a] -= q; v[b] += q; };
    corps.append(zone,
      rangee(bouton("Remplir le grand", "", fait(() => v[0] = cap[0])), bouton("Vider le grand", "", fait(() => v[0] = 0)), bouton("Grand → petit", "", fait(() => verse(0, 1)))),
      rangee(bouton("Remplir le petit", "", fait(() => v[1] = cap[1])), bouton("Vider le petit", "", fait(() => v[1] = 0)), bouton("Petit → grand", "", fait(() => verse(1, 0)))));
    peindre();
  };

  // ——— Circuit : tuiles à tourner
  const BASE = { I: [0, 2], L: [0, 1], T: [0, 1, 2] }, VOIS = [[-1, 0], [0, 1], [1, 0], [0, -1]];
  const TRAITS = { 0: "M50 50V0", 1: "M50 50H100", 2: "M50 50V100", 3: "M50 50H0" };
  M.circuit = function (def, corps, api) {
    const g = def.grille, H = g.length, W = g[0].length;
    const r = api.etat.r = api.etat.r || g.map((l, y) => l.map((c, x) => (+c[1] + ((y * 3 + x * 5) % 3) + 1) % 4));
    const dirs = (y, x) => BASE[g[y][x][0]].map(d => (d + r[y][x]) % 4);
    const grille = el("div", "grille"); grille.style.gridTemplateColumns = `repeat(${W}, auto)`; const tuiles = [];
    const calcule = () => {
      const vu = new Set(), [ey, ex] = def.entree, [sy, sx] = def.sortie, file = [];
      if (dirs(ey, ex).includes(3)) { vu.add(ey + "," + ex); file.push([ey, ex]); }
      while (file.length) {
        const [y, x] = file.shift();
        for (const d of dirs(y, x)) { const ny = y + VOIS[d][0], nx = x + VOIS[d][1]; if (ny < 0 || nx < 0 || ny >= H || nx >= W || vu.has(ny + "," + nx)) continue; if (dirs(ny, nx).includes((d + 2) % 4)) { vu.add(ny + "," + nx); file.push([ny, nx]); } }
      }
      tuiles.forEach(t => t.b.classList.toggle("vive", vu.has(t.y + "," + t.x)));
      return vu.has(sy + "," + sx) && dirs(sy, sx).includes(1);
    };
    g.forEach((l, y) => l.forEach((c, x) => {
      const b = bouton(`<svg viewBox="0 0 100 100"><path d="${BASE[c[0]].map(d => TRAITS[d]).join("")}"/></svg>`, "tuile", () => { r[y][x] = (r[y][x] + 1) % 4; tourne(); api.son.jouer("SFX_CLIC"); api.sauver(); if (calcule()) { api.son.jouer("SFX_ARC"); setTimeout(api.ok, 700); } });
      let tours = r[y][x]; const tourne = () => { tours++; b.firstChild.style.transform = `rotate(${tours * 90}deg)`; };
      b.firstChild.style.transform = `rotate(${tours * 90}deg)`; tuiles.push({ b, y, x }); grille.appendChild(b);
    }));
    corps.append(el("p", "petit", `Génératrice : à gauche de la rangée ${def.entree[0] + 1}. Miroir : à droite de la rangée ${def.sortie[0] + 1}.`), grille); calcule();
  };

  // ——— Défibrillateur : coups et soupirs, puis levier
  M.rythme = function (def, corps, api) {
    let s = ""; const trace = el("p", "trace");
    const peindre = () => { trace.textContent = [...s].map(c => c === "C" ? "●" : "–").join(" "); };
    corps.append(trace, rangee(
      bouton("Coup", "gros rouge", () => { s += "C"; api.son.jouer("SFX_COUP"); peindre(); }),
      bouton("Soupir", "gros bleu", () => { s += "S"; api.son.jouer("SFX_SOUPIR"); peindre(); }),
      bouton("Levier", "gros levier", () => { if (s === def.solution) { api.son.jouer("SFX_ARC"); api.ok(); } else { s = ""; peindre(); api.erreur("Un arc, une odeur de roussi. Frankie ne bouge pas. Ce n'était pas son rythme."); } })),
      bouton("Recommencer", "lien", () => { s = ""; peindre(); }));
  };

  // ——— Mot à taper
  M.mot = function (def, corps, api) {
    const i = el("input", "saisie"); i.autocomplete = "off"; i.spellcheck = false; i.maxLength = 24;
    const essai = () => MF.norme(i.value) === def.solution ? api.ok() : (i.value = "", api.erreur("« MOT-CLÉ INCONNU »"));
    i.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") essai(); });
    corps.append(i, bouton("Valider", "plein", essai)); setTimeout(() => i.focus(), 50);
  };

  // ——— Rayon de livres : échanger deux volumes
  const TEINTES = { N: "#3b3b46", H: "#3f6b3a", C: "#7a5a1e", B: "#7a2338", G: "#4a2f7a", A: "#2e5a7a" };
  M.livres = function (def, corps, api) {
    let o = api.etat.o || def.depart, pris = -1; const rayon = el("div", "rayon");
    const peindre = () => {
      rayon.innerHTML = "";
      [...o].forEach((c, i) => { const b = bouton(def.livres[c], "livre" + (i === pris ? " pris" : ""), () => {
        if (pris < 0) pris = i; else if (pris === i) pris = -1; else { const t = [...o]; [t[pris], t[i]] = [t[i], t[pris]]; o = api.etat.o = t.join(""); pris = -1; api.son.jouer("SFX_LIVRE"); api.sauver(); }
        peindre(); if (o === def.solution) setTimeout(api.ok, 600);
      }); b.style.background = TEINTES[c]; b.style.height = 9 + (c.charCodeAt(0) % 4) * .7 + "rem"; rayon.appendChild(b); });
    };
    corps.appendChild(rayon); peindre();
  };

  // ——— Horloge vue dans un miroir
  function cadran(h, m, cls) {
    const ah = ((h % 12) + m / 60) * 30, am = m * 6, pt = (a, l) => [100 + l * Math.sin(a * Math.PI / 180), 100 - l * Math.cos(a * Math.PI / 180)];
    const [hx, hy] = pt(ah, 46), [mx, my] = pt(am, 70);
    return `<svg class="cadran ${cls || ""}" viewBox="0 0 200 200"><circle cx="100" cy="100" r="92"/>${[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n, i) => { const [x, y] = pt(i * 30, 76); return `<text x="${x}" y="${y + 5}">${n}</text>`; }).join("")}<line x1="100" y1="100" x2="${hx}" y2="${hy}" stroke-width="7"/><line x1="100" y1="100" x2="${mx}" y2="${my}" stroke-width="4"/><circle cx="100" cy="100" r="5" style="fill:#24122e;stroke:none"/></svg>`;
  }
  M.horloge = function (def, corps, api) {
    const t = api.etat.t = api.etat.t || [12, 0], deux = el("div", "deux"), vrai = el("figure");
    const peindre = () => { vrai.innerHTML = cadran(t[0], t[1]) + "<figcaption>La vraie horloge, devant toi</figcaption>"; };
    deux.append(el("figure", "", cadran(def.vu[0], def.vu[1], "miroir") + "<figcaption>Dans le miroir, derrière Ghoulia</figcaption>"), vrai);
    const regle = (i, d) => () => { if (i) t[1] = (t[1] + d + 60) % 60; else t[0] = (t[0] + d + 11) % 12 + 1; api.son.jouer("SFX_TIC"); peindre(); api.sauver(); };
    corps.append(deux, rangee(bouton("Heure −", "", regle(0, -1)), bouton("Heure +", "", regle(0, 1)), bouton("Minutes −", "", regle(1, -5)), bouton("Minutes +", "", regle(1, 5))),
      bouton("Relancer l'horloge", "plein", () => (t[0] % 12 === def.solution[0] % 12 && t[1] === def.solution[1]) ? api.ok() : api.erreur("Le balancier fait un tour et s'arrête. Dans le miroir, Ghoulia n'a pas cillé.")));
    peindre();
  };

  // ——— Bassins et volants
  M.vannes = function (def, corps, api) {
    let n = api.etat.n = api.etat.n || [...def.depart]; const zone = el("div", "bassins"), noms = ["Petit", "Moyen", "Grand"];
    const vues = n.map((_, i) => { const d = el("div", "", `<div class="bassin"><i></i><u></u><b></b></div><div class="petit" style="text-align:center">${noms[i]}</div>`); zone.appendChild(d); return d; });
    const peindre = () => vues.forEach((d, i) => { d.querySelector("i").style.height = n[i] / def.max * 100 + "%"; d.querySelector("b").textContent = n[i]; });
    const r = el("div", "rangee");
    def.volants.forEach(v => r.appendChild(bouton(v.nom, "volant v-" + v.nom, () => {
      const m = n.map((x, i) => x + v.effet[i]);
      if (m.some(x => x < 0 || x > def.max)) { api.son.jouer("SFX_MUR"); return api.dire("Le volant " + v.nom + " se bloque : un bassin déborderait ou se viderait trop."); }
      m.forEach((x, i) => n[i] = x); api.dire(""); api.son.jouer("SFX_ROUE"); api.son.jouer("SFX_EAU"); peindre(); api.sauver();
      if (n.every((x, i) => x === def.cible[i])) setTimeout(api.ok, 700);
    })));
    corps.append(zone, r, bouton("Tout remettre comme au début", "lien", () => { def.depart.forEach((x, i) => n[i] = x); peindre(); api.sauver(); })); peindre();
  };

  // ——— Le tuyau : labyrinthe à l'écho
  M.labyrinthe = function (def, corps, api) {
    const P = def.plan, H = P.length, W = P[0].length, T = 48, cv = el("canvas", "laby"); cv.width = W * T; cv.height = H * T; const c = cv.getContext("2d");
    let y, x; P.forEach((l, j) => { const i = l.indexOf("D"); if (i >= 0) { y = j; x = i; } });
    const e = api.etat; if (e.y) { y = e.y; x = e.x; } const vu = new Map(), passe = new Set(e.passe || []); let fini = false, anim = 0;
    const eclaire = (j, i, ms) => { if (j >= 0 && i >= 0 && j < H && i < W) vu.set(j + "," + i, performance.now() + ms); };
    const dessine = () => {
      const t = performance.now(); c.fillStyle = "#030607"; c.fillRect(0, 0, cv.width, cv.height);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const k = j + "," + i, f = Math.max(0, Math.min(1, ((vu.get(k) || 0) - t) / 1500));
        if (P[j][i] === "#") { if (f > 0) { c.fillStyle = `rgba(124,255,178,${f * .75})`; c.fillRect(i * T + 2, j * T + 2, T - 4, T - 4); } }
        else { if (passe.has(k)) { c.fillStyle = "rgba(255,140,198,.12)"; c.fillRect(i * T + 14, j * T + 14, T - 28, T - 28); } if (P[j][i] === "A" && f > 0) { c.fillStyle = `rgba(201,211,230,${f})`; c.beginPath(); c.arc(i * T + T / 2, j * T + T / 2, T * .34, 0, 7); c.fill(); } }
      }
      c.fillStyle = "#ff2e93"; const cx = x * T + T / 2, cy = y * T + T / 2 + Math.sin(t / 160) * 3; c.beginPath(); c.moveTo(cx, cy + 7); c.quadraticCurveTo(cx - 20, cy - 14, cx - 22, cy + 4); c.quadraticCurveTo(cx - 10, cy - 2, cx, cy + 7); c.quadraticCurveTo(cx + 10, cy - 2, cx + 22, cy + 4); c.quadraticCurveTo(cx + 20, cy - 14, cx, cy + 7); c.fill(); c.beginPath(); c.arc(cx, cy, 5, 0, 7); c.fill();
      if (!fini) anim = requestAnimationFrame(dessine);
    };
    const va = d => {
      if (fini) return; const [dy, dx] = { N: [-1, 0], S: [1, 0], E: [0, 1], O: [0, -1] }[d] || [0, 0], ny = y + dy, nx = x + dx;
      if (P[ny][nx] === "#") { api.son.jouer("SFX_MUR"); return eclaire(ny, nx, 1800); }
      y = ny; x = nx; passe.add(y + "," + x); e.y = y; e.x = x; e.passe = [...passe]; api.sauver();
      if (P[y][x] === "A") { fini = true; setTimeout(api.ok, 400); }
    };
    const crie = () => { api.son.jouer("SFX_CRI"); api.cri(); for (let j = y - 2; j <= y + 2; j++) for (let i = x - 2; i <= x + 2; i++) if (Math.hypot(j - y, i - x) < 2.6) eclaire(j, i, 2600); };
    const touche = ev => { const d = { ArrowUp: "N", ArrowDown: "S", ArrowRight: "E", ArrowLeft: "O" }[ev.key]; if (d) { ev.preventDefault(); va(d); } else if (ev.key === " ") { ev.preventDefault(); crie(); } };
    addEventListener("keydown", touche);
    const f = el("div", "fleches"); f.append(el("span"), bouton("▲", "", () => va("N")), el("span"), bouton("◀", "", () => va("O")), bouton("▼", "", () => va("S")), bouton("▶", "", () => va("E")), bouton("Crier (écho)", "cri", crie));
    corps.append(cv, f, el("p", "petit", api.telephone() ? "Avec l'iCoffin : penche le téléphone pour le guider, touche l'écran pour crier." : "Flèches du clavier ou boutons. Espace : crier."));
    api.tel({ t: "mode", mode: "bat" }); MF.surTel = d => { if (d.t === "dir") va(d.d); if (d.t === "cri") crie(); };
    MF.mecaStop = () => { fini = true; cancelAnimationFrame(anim); removeEventListener("keydown", touche); };
    eclaire(y, x, 1); dessine();
  };

  // ——— Orgue
  M.orgue = function (def, corps, api) {
    let joue = []; const o = el("div", "orgue"), suivi = el("p", "trace");
    def.rangs.forEach(rang => { const b = bouton("", "tuyau", () => {
      api.son.note(rang); b.classList.add("joue"); setTimeout(() => b.classList.remove("joue"), 300); joue.push(rang); suivi.textContent = "♪ ".repeat(joue.length);
      if (joue.length === def.solution.length) { const bon = joue.join() === def.solution.join(); joue = []; setTimeout(() => { suivi.textContent = ""; bon ? api.ok() : api.erreur("L'orgue se tait. Là-haut, le hurlement ne répond pas : ce n'était pas son air."); }, 700); }
    }); b.style.height = 15 - (rang - 1) * 1.7 + "rem"; o.appendChild(b); });
    corps.append(o, suivi, bouton("Reprendre au début", "lien", () => { joue = []; suivi.textContent = ""; }));
  };

  // ——— Rosace : trois anneaux couplés
  M.rosace = function (def, corps, api) {
    const p = api.etat.p = api.etat.p || [...def.depart], N = def.pas, R = [84, 58, 32], C = ["#3b1d52", "#5a2a6e", "#7a3a86"];
    const svg = el("div", "", `<svg class="rosace" viewBox="0 0 200 200">${R.map((r, i) => `<g data-a="${i}"><circle cx="100" cy="100" r="${r}" stroke="${C[i]}"/><circle cx="100" cy="${100 - r}" r="9" style="fill:#f6e9f1;stroke:none"/><circle cx="104.5" cy="${100 - r - 2}" r="7.5" style="fill:${C[i]};stroke:none"/></g>`).join("")}<path d="M100 2l5 9h-10z" style="fill:#ffb347"/></svg>`);
    const tours = [...p], peindre = () => svg.querySelectorAll("g").forEach((g, i) => { g.style.transform = `rotate(${tours[i] * 360 / N}deg)`; });
    const r = el("div", "rangee");
    def.manivelles.forEach(m => r.appendChild(bouton("Manivelle de " + m.nom, "manivelle m-" + m.nom, () => { m.tourne.forEach(i => { p[i] = (p[i] + 1) % N; tours[i]++; }); api.son.jouer("SFX_ROUE"); peindre(); api.sauver(); if (p.every(v => v === 0)) setTimeout(api.ok, 800); })));
    corps.append(svg, r, bouton("Tout remettre comme au début", "lien", () => { def.depart.forEach((v, i) => { p[i] = v; tours[i] = v; }); peindre(); api.sauver(); })); peindre();
  };

  // ——— Le miroir du hall : recoller, nommer, choisir, souffler
  M.final = function (def, corps, api) {
    const e = api.etat, D = api.D; e.etape = e.etape || 0;
    const etapes = [
      () => {   // 0 : recoller les éclats dans l'ordre des ombres
        let pose = []; const fentes = el("div", "fentes"), main = el("div", "rangee");
        const peindre = () => {
          fentes.innerHTML = ""; main.innerHTML = "";
          def.ordre.forEach((_, i) => fentes.appendChild(el("div", "fente" + (pose[i] ? " pleine" : ""), pose[i] ? `<span>${D.CARTES[pose[i]].lettres}</span>` : "")));
          def.ordre.filter(n => !pose.includes(n)).sort().forEach(n => main.appendChild(bouton(`<span>${D.CARTES[n].lettres}</span><small>${D.CARTES[n].nom.replace("Éclat de ", "")}</small>`, "fente pleine", () => {
            pose.push(n); api.son.jouer("SFX_ECLAT"); peindre();
            if (pose.length === def.ordre.length) { if (pose.join() === def.ordre.join()) { e.etape = 1; api.sauver(); setTimeout(montre, 700); } else { pose = []; setTimeout(peindre, 600); api.erreur("Les éclats ne s'ajustent pas. Il y a un ordre : celui des ombres, sur le mur."); } }
          })));
        };
        corps.append(el("p", "", "Cinq manques dans le verre, de gauche à droite. Touche les éclats dans l'ordre où tu les poses."), fentes, main, bouton("Tout reprendre", "lien", () => { pose = []; peindre(); })); peindre();
      },
      () => {   // 1 : dire son nom
        const i = el("input", "saisie"); i.autocomplete = "off"; i.spellcheck = false; i.maxLength = 16;
        const essai = () => { const v = MF.norme(i.value); i.value = "";
          if (v === def.nom) { api.poser("nomme"); e.etape = 2; api.sauver(); api.son.jouer("SFX_MIROIR"); montre(); }
          else api.erreur(v === def.faux ? "Elle rit, sans bruit. « Ça, c'est le tien. »" : "Elle penche la tête. Ce n'est pas ça."); };
        i.addEventListener("keydown", ev => { ev.stopPropagation(); if (ev.key === "Enter") essai(); });
        corps.append(el("div", "grand-miroir", `<p>Tu as tout recollé. Alors dis-le.<br>Seize siècles que personne ne m'a appelée.<br>Dis mon nom.</p><p class="lettres" style="transform:none;font-size:1.6rem">${def.ordre.map(n => D.CARTES[n].lettres).join(" ")}</p>`), i, bouton("Dire ce nom", "plein", essai));
      },
      () => {   // 2 : choisir
        const a16 = api.cartes().includes(def.bougie);
        corps.append(el("div", "grand-miroir", "<p>Tu le connais. Alors maintenant tu peux tout me demander.<br>Qu'est-ce que tu veux de moi ?</p>"),
          el("p", "", a16 ? "La seizième bougie est tiède dans ta poche." : "Tu n'as rien à lui offrir. Il manque toujours une bougie au gâteau…"),
          rangee(a16 ? bouton("« Tu es invitée. »", "plein", () => { e.choix = "invitee"; e.etape = 3; api.sauver(); montre(); }) : null, bouton("« Va-t'en. »", "", () => { e.choix = "brisee"; e.etape = 3; api.sauver(); montre(); })));
      },
      () => {   // 3 : souffler les bougies (micro, téléphone, ou bouton maintenu)
        const n = e.choix === "invitee" ? 16 : 15, rang = el("div", "bougies"); let force = 0, tenu = false, fini = false, flux = null, boucle = 0;
        for (let k = 0; k < n; k++) rang.appendChild(el("i", k === 15 ? "elle" : ""));
        const peindre = () => { const eteintes = Math.floor(force / 100 * n); [...rang.children].forEach((b, k) => b.classList.toggle("eteinte", k < eteintes)); if (force >= 100 && !fini) { fini = true; arret(); api.son.jouer("SFX_BOUGIE"); setTimeout(() => api.fin(e.choix), 900); } };
        const pousse = q => { if (fini) return; force = Math.min(100, force + q); if (q > .5) api.son.jouer("SFX_BOUGIE"); peindre(); };
        const arret = () => { clearInterval(boucle); if (flux) flux.getTracks().forEach(t => t.stop()); api.tel({ t: "mode", mode: null }); };
        const b = bouton("Souffler (maintenir)", "plein gros", () => {}); b.style.width = "auto"; b.style.borderRadius = "999px"; b.style.padding = "0 1.4em";
        b.addEventListener("pointerdown", () => tenu = true); addEventListener("pointerup", () => tenu = false);
        boucle = setInterval(() => { if (tenu) pousse(4); }, 120);
        const micro = bouton("Souffler pour de vrai (micro)", "", async () => {
          try { flux = await navigator.mediaDevices.getUserMedia({ audio: true }); const AC = G.AudioContext || G.webkitAudioContext, cx = new AC(), an = cx.createAnalyser(), d = new Uint8Array(512); cx.createMediaStreamSource(flux).connect(an);
            micro.textContent = "Micro ouvert : souffle !"; const i2 = setInterval(() => { if (fini) return clearInterval(i2); an.getByteTimeDomainData(d); let s = 0; for (const v of d) s += (v - 128) * (v - 128); if (Math.sqrt(s / d.length) > 18) pousse(3); }, 80);
          } catch (_) { micro.textContent = "Micro indisponible : maintiens le bouton."; }
        });
        corps.append(el("p", "", n === 16 ? "Seize bougies. Elle est à côté de toi. Vous prenez votre souffle." : "Quinze bougies. Tes goules comptent : trois, deux, un…"), rang, rangee(b, micro));
        api.tel({ t: "mode", mode: "souffle" }); MF.surTel = d => { if (d.t === "souffle") pousse(d.v || 3); }; MF.mecaStop = arret; peindre();
      }
    ];
    const montre = () => { corps.innerHTML = ""; api.dire(""); etapes[e.etape](); };
    montre();
  };
})(window);
