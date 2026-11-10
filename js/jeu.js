// Le jeu : la table (lieu, bougie, cartes), les chapitres, le chrono, les indices, le Reflet, la liaison avec l'iCoffin.
import { Hote, nouveauCode, lienTelephone } from "./net.js";

const MF = window.MF, { D, $, el, son } = MF;
const CLE = "mf-partie-1", Q = new URLSearchParams(location.search);
let S = null, hote = null, telephones = new Map(), horloge = null, mecaOuvert = null, alerte = null, combine = null;

// ——————————————————————————————————————————————— État
function neuf() {
  return { chap: 0, lieu: "hall", cartes: [], faits: {}, reste: 5400, nettete: 0, indices: {}, nIndices: 0, rencontres: 0, erreurs: 0,
    sections: ["reglement"], carton: -1, mecas: {}, code: nouveauCode(), debut: Date.now(), repliques: 0 };
}
const sauver = () => { try { localStorage.setItem(CLE, JSON.stringify(S)); } catch (_) {} };
const charger = () => { try { return JSON.parse(localStorage.getItem(CLE)); } catch (_) { return null; } };
const a = f => !f || !!S.faits[f];
const chapitre = () => D.CHAPITRES[Math.min(S.chap, D.CHAPITRES.length - 1)];

function ecran(id) {
  document.querySelectorAll(".ecran").forEach(e => e.classList.toggle("actif", e.id === id));
  document.body.className = "sur-" + id;
}
const calque = (id, ouvert) => $(id).classList.toggle("ouvert", ouvert);
let bulleT = 0;
function bulle(texte, ms = 5200) { const b = $("bulle"); b.textContent = texte; b.classList.add("vue"); clearTimeout(bulleT); bulleT = setTimeout(() => b.classList.remove("vue"), ms); }

// ——————————————————————————————————————————————— Faits et cartes
function poser(f) { if (!S.faits[f]) { S.faits[f] = 1; } }
function donner(num, silencieux) {
  if (S.cartes.includes(num)) return;
  S.cartes.push(num); poser("c" + num);
  if (num === 15) dire({ t: "etat" });
  if (!silencieux) son.jouer(D.CARTES[num].type === "eclat" ? "SFX_ECLAT" : "SFX_CARTE");
  rendreMain(num); sauver();
}

// ——————————————————————————————————————————————— Le lieu
function accessible(id) { const l = D.LIEUX[id]; return l.chap <= S.chap && a(l.si); }
function rendreLieu() {
  const l = D.LIEUX[S.lieu];
  MF.poserDecor($("decor"), S.lieu, l.image);
  $("lieu-nom").textContent = l.nom; $("lieu-texte").textContent = l.texte;
  const eclaire = S.lieu === "hall" && a("lustres");
  $("scene").classList.toggle("eclaire", eclaire);
  const pts = $("points"); pts.innerHTML = "";
  for (const p of l.points) {
    if (!a(p.si) || (p.sauf && a(p.sauf))) continue;
    if (p.c && S.cartes.includes(p.c)) continue;
    if (p.m && D.MECAS[p.m].succes && D.MECAS[p.m].succes.faits && D.MECAS[p.m].succes.faits.every(a) ) continue;
    if (p.m && S.mecas[p.m] && S.mecas[p.m].fini) continue;
    const b = el("button", "point " + (p.c ? "numero" : "mecanisme"), p.c ? String(p.c) : `<i></i><span>${p.nom}</span>`);
    b.style.left = p.x + "%"; b.style.top = p.y + "%"; b.dataset.x = p.x; b.dataset.y = p.y;
    b.addEventListener("click", e => { if (!dansLaLueur(p.x, p.y) && !eclaire) { bougieVers(e); return; } p.c ? prendre(p.c) : ouvrirMeca(p.m); });
    pts.appendChild(b);
  }
  const s = $("sorties"); s.innerHTML = "";
  for (const v of l.voisins) {
    if (!accessible(v)) continue;
    const b = el("button", "sortie" + (D.LIEUX[v].chap === S.chap && v !== "hall" ? " neuve" : ""), D.LIEUX[v].nom);
    b.addEventListener("click", () => aller(v)); s.appendChild(b);
  }
  son.ambiance(l.amb);
  $("reflet-mot").textContent = "";
}
function aller(id) { if (!accessible(id)) return; S.lieu = id; son.jouer("SFX_PORTE"); rendreLieu(); sauver(); }
function prendre(num) {
  donner(num);
  rendreLieu(); ouvrirCarte(num);
}

// ——— La bougie : la lueur suit la souris ou le doigt ; les numéros ne se voient et ne se touchent que dedans.
let bx = 50, by = 55;
// Les points sont placés en % de l'image (#points a le cadrage « cover » du décor) ; la lueur, elle, en % de la scène.
function bougieVers(e) {
  const r = $("scene").getBoundingClientRect();
  bx = (e.clientX - r.left) / r.width * 100; by = (e.clientY - r.top) / r.height * 100;
  $("scene").style.setProperty("--bx", bx + "%"); $("scene").style.setProperty("--by", by + "%");
  if (Q.has("regle") && e.type === "click") { const i = $("points").getBoundingClientRect(), ix = (e.clientX - i.left) / i.width * 100, iy = (e.clientY - i.top) / i.height * 100; console.log(`x: ${ix.toFixed(0)}, y: ${iy.toFixed(0)}`); bulle(`x: ${ix.toFixed(0)}, y: ${iy.toFixed(0)}`); }
}
function dansLaLueur(x, y) {
  const r = $("scene").getBoundingClientRect(), i = $("points").getBoundingClientRect();
  const dx = i.left + x / 100 * i.width - (r.left + bx / 100 * r.width), dy = i.top + y / 100 * i.height - (r.top + by / 100 * r.height);
  return Math.hypot(dx, dy) < r.width * (r.width < 760 ? .26 : .13);
}

// ——————————————————————————————————————————————— La main
const PICTO = { objet: "◆", document: "❧", eclat: "✦" };
function vignette(num) {
  const c = D.CARTES[num], img = (window.__IMAGES || []).includes("k-" + num);
  return `<span class="carte-num">${num}</span>${img ? `<img src="img/k-${num}.jpg" alt="">` : `<span class="carte-picto">${PICTO[c.type]}</span>`}<span class="carte-nom">${c.nom}</span>`;
}
function rendreMain(nouvelle) {
  const m = $("main"); m.innerHTML = "";
  for (const num of S.cartes) {
    const b = el("button", "carte type-" + D.CARTES[num].type + (num === nouvelle ? " nouvelle" : "") + (combine === num ? " choisie" : ""), vignette(num));
    b.addEventListener("click", () => { if (combine && combine !== num) combiner(combine, num); else ouvrirCarte(num); });
    m.appendChild(b);
  }
  m.classList.toggle("combine", !!combine);
}
function corpsCarte(num) {
  const c = D.CARTES[num]; let h = `<p>${c.texte.replace(/\n/g, "<br>")}</p>`;
  if (c.miroir) h += `<p class="manuscrit ${a("invitLue") ? "" : "envers"}">${c.miroir}</p>`;
  if (c.zombie) h += `<p class="zombie">${c.zombie.map(z => `<span>${z}</span>`).join(" ")}</p><button class="lien" data-ecoute>Écouter Ghoulia</button>`;
  if (c.courbe) h += `<svg class="courbe" viewBox="0 0 140 90">${[1, 2, 3, 4, 5, 6, 7].map(i => `<line x1="6" x2="134" y1="${86 - i * 11}" y2="${86 - i * 11}"/>`).join("")}<polyline points="${c.courbe.map((v, i) => `${18 + i * 21},${86 - v * 11}`).join(" ")}"/>${c.courbe.map((v, i) => `<circle cx="${18 + i * 21}" cy="${86 - v * 11}" r="3.4"/>`).join("")}</svg><button class="lien" data-hurle>Écouter le hurlement</button>`;
  if (c.signes) h += `<p class="signes">${c.signes.map(s => D.GLYPHES[s]).join("")}</p>`;
  if (c.lettres) h += `<p class="lettres">${c.lettres}</p>`;
  return h;
}
function ouvrirCarte(num) {
  const c = D.CARTES[num], g = $("carte-grande");
  g.className = "carte-grande type-" + c.type;
  const illu = (window.__IMAGES || []).includes("k-" + num) ? `<img class="carte-illu" src="img/k-${num}.jpg" alt="">` : "";
  g.innerHTML = `<span class="carte-num">${num}</span>${illu}<h3>${c.nom}</h3><div class="carte-corps">${corpsCarte(num)}</div><div class="carte-actions"><button id="c-combiner">Combiner</button><button id="c-fermer" class="plein">Fermer</button></div>`;
  $("c-fermer").onclick = () => calque("carte", false);
  $("c-combiner").onclick = () => { combine = num; calque("carte", false); rendreMain(); bulle(`Touche une autre carte pour y glisser « ${c.nom} ».`); };
  const e = g.querySelector("[data-ecoute]"); if (e) e.onclick = () => son.gemir(c.zombie);
  const h = g.querySelector("[data-hurle]"); if (h) h.onclick = () => son.melodie(c.courbe, "hurle");
  calque("carte", true);
}
function combiner(x, y) {
  combine = null;
  const k = D.COMBOS.find(c => (c.a === x && c.b === y) || (c.a === y && c.b === x));
  if (!k || (k.sauf && a(k.sauf))) { son.jouer("SFX_NON"); bulle("Ça ne donne rien."); rendreMain(); return; }
  if (k.fait) poser(k.fait);
  (k.donne || []).forEach(n => donner(n, true));
  son.jouer("SFX_MIROIR"); rendreMain(); rendreLieu(); bulle(k.texte, 9000); sauver();
  if (k.fait === "invitLue") ouvrirCarte(12);
  if (k.donne) ouvrirCarte(k.donne[0]);
}

// ——————————————————————————————————————————————— Mécanismes
function ouvrirMeca(id) {
  const def = D.MECAS[id];
  if (def.besoin && !S.cartes.includes(def.besoin)) { son.jouer("SFX_NON"); bulle(def.manque); return; }
  mecaOuvert = id; S.mecas[id] = S.mecas[id] || {};
  $("meca-titre").textContent = def.titre; $("meca-texte").textContent = def.texte || ""; $("meca-retour").textContent = ""; $("meca-retour").className = "meca-retour";
  const corps = $("meca-corps"); corps.innerHTML = ""; corps.className = "meca-" + def.type;
  MF.surTel = null;
  MF.mecas[def.type](def, corps, {
    etat: S.mecas[id], sauver, son, a, cartes: () => S.cartes, D,
    ok: () => reussir(id), erreur: m => rater(m), dire: t => { $("meca-retour").textContent = t; },
    cri: () => { S.nettete = Math.min(100, S.nettete + D.REFLET.parCri); jauge(); },
    tel: m => dire(m), telephone: () => telephones.size > 0, fin: quoi => finir(quoi), poser: f => { poser(f); sauver(); }
  });
  calque("meca", true);
}
function fermerMeca() { calque("meca", false); mecaOuvert = null; MF.surTel = null; dire({ t: "mode", mode: null }); if (MF.mecaStop) { MF.mecaStop(); MF.mecaStop = null; } }
function rater(message) {
  S.erreurs++; S.nettete = Math.min(100, S.nettete + D.REFLET.parErreur); jauge(); son.jouer("SFX_NON");
  const r = $("meca-retour"); r.textContent = message || "Rien ne se passe."; r.className = "meca-retour non"; sauver();
}
function reussir(id) {
  const def = D.MECAS[id], s = def.succes; S.mecas[id].fini = true;
  (s.faits || []).forEach(poser); (s.cartes || []).forEach(n => donner(n, true));
  son.jouer(s.fin ? "SFX_DELIVRE" : "SFX_OUI");
  $("meca-corps").innerHTML = ""; $("meca-texte").textContent = "";
  const r = $("meca-retour"); r.className = "meca-retour oui"; r.textContent = s.texte;
  const b = el("button", "plein", "Continuer"); $("meca-corps").appendChild(b);
  b.onclick = () => {
    fermerMeca(); rendreLieu(); rendreMain();
    if (s.cartes) bulle("Nouvelle carte : " + s.cartes.map(n => D.CARTES[n].nom).join(", ") + ".");
    const suite = () => { if (a(chapitre().fin) && S.chap < D.CHAPITRES.length - 1) { S.chap++; sauver(); carton(); } };
    if (s.reflet) regard(suite); else suite();
  };
  sauver();
}

// ——————————————————————————————————————————————— Chapitres
function carton() {
  const c = chapitre(); S.carton = S.chap;
  $("carton-num").textContent = "Chapitre " + c.num; $("carton-titre").textContent = c.titre; $("carton-texte").textContent = c.carton; $("carton-obj").textContent = c.objectif;
  son.musique(c.musique); son.jouer("SFX_CARTON");
  calque("carton", true); entete(); sauver();
}
function entete() {
  const c = chapitre(); $("chap-num").textContent = c.num; $("chap-titre").textContent = c.titre; $("objectif").textContent = c.objectif;
  $("b-icoffin").hidden = !a("c15");
}
$("carton-ok").onclick = () => { calque("carton", false); rendreLieu(); dire({ t: "etat" }); };

// ——————————————————————————————————————————————— Le temps
function heure() {
  const ecoule = 5400 - S.reste, t = 22 * 60 + 30 + Math.floor(ecoule / 60), h = Math.floor(t / 60) % 24, m = t % 60;
  $("heure").textContent = `${h} h ${String(m).padStart(2, "0")}`;
  const r = Math.max(0, S.reste); $("reste").textContent = r >= 3600 ? `${Math.floor(r / 3600)} h ${String(Math.floor(r % 3600 / 60)).padStart(2, "0")}` : `${Math.floor(r / 60)} min ${String(r % 60).padStart(2, "0")}`;
  $("jeu").classList.toggle("presse", S.reste < 600);
}
function jauge() { $("nettete").style.width = S.nettete + "%"; $("jeu").classList.toggle("nette", S.nettete > 66); }
function tic() {
  if (!S || !$("jeu").classList.contains("actif") || $("fin").classList.contains("ouvert") || $("carton").classList.contains("ouvert")) return;
  if (alerte) return;
  S.reste--; if (S.reste % 20 === 0 && S.nettete > 0) S.nettete = Math.max(0, S.nettete - 2);
  heure(); jauge();
  if (S.reste % 15 === 0) { sauver(); dire({ t: "etat" }); }
  if (S.reste === 600) { son.jouer("SFX_CLOCHE"); bulle("Dix minutes avant minuit."); }
  if (S.reste <= 0) return finir("minuit");
  if (S.nettete >= 100 && !mecaOuvert) regard();
}

// ——————————————————————————————————————————————— Le Reflet : « Ne bouge plus »
function regard(apres) {
  if (alerte) return;
  const R = D.REFLET, mot = R.repliques[S.repliques++ % R.repliques.length];
  alerte = { t0: performance.now(), perdu: false, bouge: 0, face: false, apres };
  $("alerte-mot").textContent = mot; $("alerte-texte").textContent = R.alerte + (telephones.size ? " L'iCoffin face contre la table." : "");
  calque("alerte", true); son.jouer("REFLET_REGARD"); son.coeur(true); dire({ t: "mode", mode: "cache" });
  const fin = ok => {
    clearInterval(alerte.i); removeEventListener("pointermove", bouge); removeEventListener("pointerdown", touche); removeEventListener("keydown", touche);
    son.coeur(false); dire({ t: "mode", mode: null });
    if (ok) { S.nettete = Math.min(S.nettete, 20); $("alerte-texte").textContent = R.passee; son.jouer("SFX_OUI"); }
    else { S.rencontres++; S.reste -= R.perte; S.nettete = 30; $("alerte-texte").textContent = R.vue; son.jouer("REFLET_VUE"); $("alerte").classList.add("vue"); }
    const suite = alerte.apres;
    setTimeout(() => { calque("alerte", false); $("alerte").classList.remove("vue"); alerte = null; heure(); jauge(); sauver(); if (suite) suite(); }, ok ? 1800 : 3200);
  };
  const grace = () => performance.now() - alerte.t0 < 2500;
  const bouge = e => { if (grace()) return; alerte.bouge += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0); if (alerte.bouge > 30) fin(false); };
  const touche = () => { if (!grace()) fin(false); };
  addEventListener("pointermove", bouge); addEventListener("pointerdown", touche); addEventListener("keydown", touche);
  alerte.i = setInterval(() => {
    const t = (performance.now() - alerte.t0) / 1000; $("alerte-jauge").style.width = Math.min(100, t / R.duree * 100) + "%";
    // Le téléphone relié doit être retourné au bout de cinq secondes (s'il sait dire dans quel sens il est).
    if (t > 5 && [...telephones.values()].some(x => x.capteur && !x.face)) return fin(false);
    if (t >= R.duree) fin(true);
  }, 200);
}

// ——————————————————————————————————————————————— Indices
function ouvrirIndice() {
  const c = chapitre(), i = c.etapes.findIndex(e => !a(e.fait)), corps = $("indice-corps"); corps.innerHTML = "";
  if (i < 0) { corps.innerHTML = "<p>Comte Fabulous hausse les ailes : tu sais déjà tout.</p>"; return calque("indice", true); }
  const cle = S.chap + "-" + i, vus = S.indices[cle] || 0, e = c.etapes[i];
  e.indices.slice(0, vus).forEach((t, k) => corps.appendChild(el("p", "indice", `<b>${k + 1}.</b> ${t}`)));
  if (vus < 3) {
    const b = el("button", "plein", vus ? "Un indice de plus (− 2 min)" : "Demander un indice (− 2 min)");
    b.onclick = () => { S.indices[cle] = vus + 1; S.nIndices++; S.reste -= 120; son.jouer("SFX_CHAUVE"); heure(); sauver(); ouvrirIndice(); };
    corps.appendChild(b);
  }
  calque("indice", true);
}

// ——————————————————————————————————————————————— Fin
function finir(quoi) {
  if (mecaOuvert) fermerMeca();
  const f = D.FINS[quoi]; poser("fini");
  $("fin-titre").textContent = f.titre; $("fin-texte").innerHTML = f.texte.map(t => `<p>${t}</p>`).join("");
  const joue = 5400 - S.reste, min = Math.floor(joue / 60);
  $("fin-bilan").innerHTML = quoi === "minuit" ? "" : `<span><b>${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}</b> de jeu</span><span><b>${S.nIndices}</b> indice${S.nIndices > 1 ? "s" : ""}</span><span><b>${S.rencontres}</b> regard${S.rencontres > 1 ? "s" : ""} croisé${S.rencontres > 1 ? "s" : ""}</span>`;
  const c = D.CADEAU; $("fin-dedicace").innerHTML = quoi === "minuit" ? "" : (c.prenom ? `<b>${c.prenom},</b> ` : "") + c.message + (c.de ? `<br><i>${c.de}</i>` : "");
  const b = $("fin-rejouer");
  if (quoi === "minuit") { b.textContent = "Remonter l'horloge d'un quart d'heure"; b.onclick = () => { S.reste = 900; delete S.faits.fini; calque("fin", false); heure(); sauver(); }; }
  else { b.textContent = "Retour au titre"; b.onclick = () => { try { localStorage.removeItem(CLE); } catch (_) {} location.href = location.pathname; }; }
  son.musique(quoi === "invitee" ? "MUS_FIN" : "MUS_FIN_SOMBRE"); son.jouer(quoi === "minuit" ? "SFX_CLOCHE" : "SFX_DELIVRE");
  calque("fin", true); dire({ t: "fin", quoi }); sauver();
}

// ——————————————————————————————————————————————— L'iCoffin : téléphone relié, ou panneau sur l'écran
function dire(m) {
  if (!hote) return;
  if (m.t === "etat") m = { t: "etat", chap: S.chap, sections: S.sections, nettete: S.nettete, actif: a("c15") };
  hote.diffuser(m);
}
function relier() {
  if (hote || typeof Peer === "undefined") return;
  hote = new Hote(S.code, {
    arrivee: (id, d) => { telephones.set(id, { capteur: !!d.capteur, face: false }); $("mise-etat").textContent = "iCoffin relié."; $("mise-etat").classList.add("ok"); son.jouer("SFX_OUI"); dire({ t: "etat" }); if ($("jeu").classList.contains("actif")) bulle("iCoffin relié."); },
    depart: id => { telephones.delete(id); },
    message: (id, d) => {
      const t = telephones.get(id); if (!t) return;
      if (d.t === "face") { t.face = d.bas; t.capteur = true; }
      else if (d.t === "section") { if (!S.sections.includes(d.id)) { S.sections.push(d.id); sauver(); } }
      else if (MF.surTel) MF.surTel(d);
    }
  });
}
function mise() {
  const url = lienTelephone(S.code);
  $("mise-code").textContent = S.code; $("mise-url").textContent = url.replace(/^https?:\/\//, "");
  $("qr").innerHTML = ""; if (typeof QRCode !== "undefined") new QRCode($("qr"), { text: url, width: 168, height: 168, colorDark: "#0b0710", colorLight: "#f6e9f1" });
  relier(); ecran("mise");
}
function ouvrirIcoffin() {
  MF.icoffin.rendre($("icoffin-corps"), { sections: S.sections, ouvrir: id => { if (!S.sections.includes(id)) { S.sections.push(id); sauver(); dire({ t: "etat" }); } }, son });
  calque("icoffin", true);
}

// ——————————————————————————————————————————————— Départ
function entrer() {
  son.demarrer(); ecran("jeu"); entete(); heure(); jauge(); rendreMain(); rendreLieu();
  if (S.carton < S.chap) carton(); else son.musique(chapitre().musique);
  clearInterval(horloge); horloge = setInterval(tic, Q.has("vite") ? 20 : 1000);
}
MF.poserDecor($("titre-fond"), "titre", "c-titre");
$("b-reprendre").hidden = !charger();
$("b-nouvelle").onclick = () => { son.demarrer(); son.jouer("SFX_CARTON"); S = neuf(); sauver(); mise(); };
$("b-reprendre").onclick = () => { son.demarrer(); S = charger(); relier(); entrer(); };
$("b-entrer").onclick = entrer;
$("b-comment").onclick = () => calque("comment", true);
$("b-indice").onclick = ouvrirIndice; $("b-icoffin").onclick = ouvrirIcoffin;
$("b-son").onclick = e => { const coupe = e.currentTarget.getAttribute("aria-pressed") === "true"; e.currentTarget.setAttribute("aria-pressed", String(!coupe)); son.couper(coupe); };
$("meca-fermer").onclick = fermerMeca;
for (const id of ["icoffin", "indice", "comment"]) $(id + "-fermer").onclick = () => calque(id, false);
$("carte").addEventListener("click", e => { if (e.target.id === "carte") calque("carte", false); });
$("scene").addEventListener("pointermove", bougieVers); $("scene").addEventListener("pointerdown", bougieVers); $("scene").addEventListener("click", bougieVers);
addEventListener("keydown", e => { if (e.key === "Escape") { ["carte", "indice", "comment", "icoffin"].forEach(i => calque(i, false)); if (mecaOuvert && !S.mecas[mecaOuvert].fini) fermerMeca(); if (combine) { combine = null; rendreMain(); } } });

// Essais : ?essai=1 expose de quoi piloter une partie (tests de l'atelier).
if (Q.has("essai")) window.__mf = { get S() { return S; }, aller, prendre, ouvrirMeca, combiner, donner, regard, finir, fermerMeca, D };
