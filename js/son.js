// Le son du jeu. Chaque son a un code (AMB_HALL, SFX_PORTE, REFLET_REGARD…).
// Si media/son/CODE.mp3 est listé dans window.__MEDIAS (js/medias.js), le fichier est joué ; sinon, une synthèse provisoire.
(function (G) {
  "use strict";
  const MF = G.MF = G.MF || {};
  const MEDIAS = new Set(G.__MEDIAS || []);
  let ctx = null, maitre, busMus, busAmb, busSfx, reverb, coupe = false;
  let amb = null, mus = null, coeurT = 0;

  function demarrer() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    const AC = G.AudioContext || G.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    maitre = ctx.createGain(); maitre.gain.value = coupe ? 0 : .9; maitre.connect(ctx.destination);
    // Une réverbération de pierre, fabriquée : bruit qui s'éteint.
    reverb = ctx.createConvolver(); const n = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
    reverb.buffer = ir; const rg = ctx.createGain(); rg.gain.value = .32; reverb.connect(rg); rg.connect(maitre);
    const bus = v => { const g = ctx.createGain(); g.gain.value = v; g.connect(maitre); g.connect(reverb); return g; };
    busMus = bus(.34); busAmb = bus(.5); busSfx = bus(.8);
  }
  function couper(oui) { coupe = oui; if (maitre) maitre.gain.setTargetAtTime(oui ? 0 : .9, ctx.currentTime, .05); }

  // ——— Fichiers réels
  const tampons = new Map();
  function tampon(code) {
    if (!MEDIAS.has(code)) return null;
    if (!tampons.has(code)) tampons.set(code, fetch(`media/son/${code}.mp3`).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(b => ctx.decodeAudioData(b)).catch(() => null));
    return tampons.get(code);
  }
  function lire(buf, bus, boucle) { const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; s.loop = !!boucle; s.connect(g); g.connect(bus); s.start(); return { s, g }; }

  // ——— Briques de synthèse
  let blanc = null;
  function bruit() { if (!blanc) { blanc = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = blanc.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } const s = ctx.createBufferSource(); s.buffer = blanc; s.loop = true; return s; }
  function ton(f, d, o = {}) {
    const t = ctx.currentTime + (o.quand || 0), osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || "sine"; osc.frequency.setValueAtTime(f, t); if (o.vers) osc.frequency.exponentialRampToValueAtTime(o.vers, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.gain || .2, t + (o.attaque || .01)); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    let sortie = g; if (o.filtre) { const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = o.filtre; g.connect(fl); sortie = fl; }
    osc.connect(g); sortie.connect(o.bus || busSfx); osc.start(t); osc.stop(t + d + .05);
  }
  function souffle(d, o = {}) {
    const t = ctx.currentTime + (o.quand || 0), s = bruit(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    fl.type = o.mode || "bandpass"; fl.frequency.setValueAtTime(o.f || 800, t); if (o.vers) fl.frequency.exponentialRampToValueAtTime(o.vers, t + d); fl.Q.value = o.q || 1;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.gain || .3, t + (o.attaque || .02)); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(fl); fl.connect(g); g.connect(o.bus || busSfx); s.start(t); s.stop(t + d + .05);
  }
  // Boîte à musique : une note de carillon (deux partiels).
  function carillon(f, quand, gain = .16, bus = busMus) { ton(f, 1.8, { quand, gain, bus, attaque: .004 }); ton(f * 2.76, .5, { quand, gain: gain * .25, bus, attaque: .004 }); }
  // Tuyau d'orgue : fondamentale + quinte + octave, souffle d'attaque.
  function orgue(f, d = .7, quand = 0) { [1, 2, 3, 4].forEach((h, i) => ton(f * h, d, { quand, gain: .14 / (i + 1), type: i ? "sine" : "triangle", attaque: .06 })); souffle(.15, { quand, f: f * 4, gain: .05 }); }
  function hurle(f, d = .7, quand = 0) { ton(f * .92, d, { quand, vers: f, gain: .16, type: "sawtooth", filtre: 1400, attaque: .12 }); ton(f * 1.01, d, { quand, gain: .08, type: "triangle", attaque: .12 }); }
  const GAMME = [146.83, 174.61, 196, 220, 261.63, 293.66, 349.23];   // ré mineur, rangs 1 à 7
  function note(rang, timbre) { demarrer(); (timbre === "hurle" ? hurle : orgue)(GAMME[rang - 1] * (timbre === "hurle" ? 2 : 1)); }
  function melodie(rangs, timbre) { demarrer(); rangs.forEach((r, i) => (timbre === "hurle" ? hurle : orgue)(GAMME[r - 1] * (timbre === "hurle" ? 2 : 1), .6, i * .62)); }
  // Les cinq gémissements du zombie : Uh, Urr, Ahh, Grr, Mmm.
  const GEMIT = {
    Uh: q => ton(110, .22, { quand: q, type: "sawtooth", filtre: 500, gain: .3, vers: 95 }),
    Urr: q => { for (let i = 0; i < 6; i++) ton(90, .07, { quand: q + i * .07, type: "sawtooth", filtre: 420, gain: .28 }); },
    Ahh: q => ton(150, .6, { quand: q, type: "sawtooth", filtre: 1100, gain: .24, vers: 125, attaque: .08 }),
    Grr: q => { ton(62, .5, { quand: q, type: "square", filtre: 300, gain: .3 }); souffle(.5, { quand: q, f: 240, q: 3, gain: .2 }); },
    Mmm: q => ton(130, .7, { quand: q, type: "triangle", filtre: 320, gain: .34, attaque: .15 })
  };
  function gemir(paires) { demarrer(); let q = 0; for (const p of paires) { const [x, y] = p.split("-"); GEMIT[x](q); GEMIT[y](q + .8); q += 2.1; } }

  // ——— Bruitages de synthèse, par code
  const SFX = {
    SFX_CARTE: () => { souffle(.12, { f: 3200, gain: .18 }); carillon(880, .03, .12, busSfx); },
    SFX_ECLAT: () => { [1568, 2093, 2637, 3136].forEach((f, i) => carillon(f, i * .07, .1, busSfx)); souffle(.5, { f: 6000, q: 6, gain: .12 }); },
    SFX_PORTE: () => { ton(70, .5, { type: "sawtooth", filtre: 300, gain: .22, vers: 120 }); souffle(.35, { f: 500, vers: 180, gain: .16, quand: .1 }); ton(52, .25, { quand: .45, gain: .4 }); },
    SFX_NON: () => { ton(160, .18, { type: "square", filtre: 600, gain: .16 }); ton(120, .28, { quand: .14, type: "square", filtre: 500, gain: .16 }); },
    SFX_OUI: () => { [523.25, 659.25, 783.99].forEach((f, i) => carillon(f, i * .09, .16, busSfx)); },
    SFX_DELIVRE: () => { souffle(.9, { f: 4000, vers: 400, q: 2, gain: .34 }); [1318, 1047, 1568, 2093, 1760].forEach((f, i) => carillon(f, .1 + i * .06, .12, busSfx)); [293.66, 369.99, 440, 587.33].forEach((f, i) => carillon(f, .7 + i * .16, .2, busSfx)); },
    SFX_MIROIR: () => { ton(1900, .9, { vers: 2400, gain: .07 }); ton(2850, .9, { vers: 2500, gain: .05 }); souffle(.6, { f: 7000, q: 8, gain: .07 }); },
    SFX_CARTON: () => { ton(73.4, 2.2, { type: "triangle", gain: .32, attaque: .02 }); ton(110, 2.2, { gain: .16 }); carillon(587.33, .05, .1, busSfx); },
    SFX_CLOCHE: () => { [0, 1.1, 2.2].forEach(q => { ton(196, 2.4, { quand: q, gain: .3, attaque: .005 }); ton(196 * 2.4, 1.6, { quand: q, gain: .1 }); ton(196 * 5.4, .7, { quand: q, gain: .04 }); }); },
    SFX_CHAUVE: () => { for (let i = 0; i < 4; i++) ton(5200 + i * 400, .05, { quand: i * .06, gain: .06, vers: 4200 }); souffle(.3, { f: 900, q: .7, gain: .1, quand: .1 }); },
    SFX_CLIC: () => ton(1200, .03, { type: "square", gain: .08, filtre: 3000 }),
    SFX_ROUE: () => { for (let i = 0; i < 5; i++) ton(300 - i * 20, .04, { quand: i * .05, type: "square", gain: .08, filtre: 900 }); },
    SFX_EAU: () => souffle(1.1, { f: 900, vers: 300, q: .8, gain: .26 }),
    SFX_GOUTTE: () => ton(1400, .09, { vers: 700, gain: .1 }),
    SFX_ARC: () => { for (let i = 0; i < 9; i++) souffle(.04, { quand: i * .05 + Math.random() * .03, f: 3000 + Math.random() * 3000, q: 4, gain: .25 }); ton(55, .6, { type: "sawtooth", gain: .12, filtre: 400 }); },
    SFX_COUP: () => { ton(58, .22, { gain: .5, vers: 40 }); },
    SFX_SOUPIR: () => souffle(.45, { f: 500, q: .6, gain: .12, attaque: .15 }),
    SFX_LIVRE: () => { souffle(.14, { f: 400, q: .8, gain: .22 }); ton(90, .1, { quand: .1, gain: .2 }); },
    SFX_TIC: () => ton(2100, .02, { type: "square", gain: .06, filtre: 4000 }),
    SFX_CRI: () => { ton(6200, .09, { vers: 3800, gain: .09 }); ton(5200, .5, { quand: .16, vers: 3000, gain: .02 }); ton(4800, .7, { quand: .34, vers: 2600, gain: .012 }); },
    SFX_MUR: () => ton(80, .1, { gain: .3 }),
    SFX_BOUGIE: () => { souffle(.5, { f: 1200, vers: 300, q: .7, gain: .28, attaque: .05 }); },
    REFLET_REGARD: () => { ton(41, 4, { type: "sawtooth", filtre: 180, gain: .4, attaque: 1.2 }); [587.33, 440, 349.23, 293.66].forEach((f, i) => carillon(f * 2, .4 + i * .5, .08, busSfx)); souffle(3, { f: 5000, q: 10, gain: .05, attaque: 1 }); },
    REFLET_VUE: () => { souffle(.7, { f: 2500, vers: 300, q: 1.5, gain: .5 }); ton(880, 1.1, { vers: 110, type: "sawtooth", filtre: 2000, gain: .25 }); for (let i = 0; i < 7; i++) carillon(2000 + Math.random() * 2500, .2 + i * .05, .08, busSfx); }
  };
  async function jouer(code) {
    if (!ctx) return;
    const p = tampon(code); if (p) { const b = await p; if (b) return void lire(b, busSfx); }
    if (SFX[code]) SFX[code]();
  }

  // ——— Ambiances : vent filtré + bourdon + petits événements propres au lieu
  const AMB = {
    AMB_HALL: { vent: 320, bourdon: 55, ev: () => Math.random() < .3 && carillon(1174.66 * (1 + Math.random() * .01), 0, .03, busAmb) },
    AMB_COULOIR: { vent: 500, bourdon: 49, ev: () => Math.random() < .25 && ton(70, .12, { gain: .12, bus: busAmb }) },
    AMB_LABO: { vent: 900, bourdon: 60, ev: () => { if (Math.random() < .5) for (let i = 0; i < 3; i++) souffle(.03, { quand: i * .06, f: 4000, q: 5, gain: .08, bus: busAmb }); } },
    AMB_BIBLIO: { vent: 220, bourdon: 43.65, ev: () => ton(1900, .015, { type: "square", gain: .03, bus: busAmb, filtre: 3000 }), cadence: 1000 },
    AMB_BASSINS: { vent: 700, bourdon: 51.9, ev: () => Math.random() < .7 && ton(1100 + Math.random() * 700, .1, { vers: 600, gain: .07, bus: busAmb }) },
    AMB_AUDITORIUM: { vent: 260, bourdon: 36.7, ev: () => Math.random() < .2 && hurle(293.66 + Math.random() * 30, 1.6) },
    AMB_TOUR: { vent: 1200, bourdon: 65.4, ev: () => Math.random() < .3 && souffle(1.8, { f: 700, vers: 1500, q: 2, gain: .1, bus: busAmb, attaque: .8 }) },
    AMB_CRYPTE: { vent: 160, bourdon: 32.7, ev: () => Math.random() < .3 && souffle(.5, { f: 3000, q: 9, gain: .04, bus: busAmb, attaque: .2 }) }
  };
  function arreter(x) { if (!x) return; clearInterval(x.i); x.g.gain.setTargetAtTime(0, ctx.currentTime, .5); setTimeout(() => x.arret.forEach(s => { try { s.stop(); } catch (_) {} }), 2500); }
  async function ambiance(code) {
    if (!ctx || (amb && amb.code === code)) return;
    arreter(amb); const g = ctx.createGain(); g.gain.value = 0; g.connect(busAmb); g.gain.setTargetAtTime(1, ctx.currentTime, .8);
    amb = { code, g, arret: [], i: 0 };
    const p = tampon(code); if (p) { const b = await p; if (b) { const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; s.connect(g); s.start(); amb.arret.push(s); return; } }
    const a = AMB[code] || AMB.AMB_HALL;
    const s = bruit(), fl = ctx.createBiquadFilter(), gv = ctx.createGain(); fl.type = "bandpass"; fl.frequency.value = a.vent; fl.Q.value = .6; gv.gain.value = .1; s.connect(fl); fl.connect(gv); gv.connect(g); s.start();
    const lfo = ctx.createOscillator(), gl = ctx.createGain(); lfo.frequency.value = .07; gl.gain.value = a.vent * .4; lfo.connect(gl); gl.connect(fl.frequency); lfo.start();
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), go = ctx.createGain(); o.frequency.value = a.bourdon; o2.frequency.value = a.bourdon * 1.503; o.type = "triangle"; go.gain.value = .22; o.connect(go); o2.connect(go); go.connect(g); o.start(); o2.start();
    amb.arret.push(s, lfo, o, o2); amb.i = setInterval(() => { if (ctx.state === "running") a.ev(); }, a.cadence || 2600);
  }

  // ——— Musique : une boîte à musique en ré mineur. Le thème du Reflet est le thème d'anniversaire joué à l'envers.
  const THEME = [0, 0, 2, 0, 5, 4, null, 0, 0, 2, 0, 7, 5, null];           // degrés, à l'endroit
  const ECHELLE = [293.66, 329.63, 349.23, 392, 440, 466.16, 523.25, 587.33];
  const MUS = { MUS_01: { tempo: 620, envers: false, oct: 1 }, MUS_02: { tempo: 520, envers: true, oct: 1 }, MUS_03: { tempo: 760, envers: false, oct: .5 }, MUS_04: { tempo: 680, envers: true, oct: .5 },
    MUS_05: { tempo: 480, envers: false, oct: 1 }, MUS_06: { tempo: 400, envers: true, oct: 1 }, MUS_FIN: { tempo: 440, envers: false, oct: 2, clair: true }, MUS_FIN_SOMBRE: { tempo: 900, envers: true, oct: .5 } };
  async function musique(code) {
    if (!ctx || (mus && mus.code === code)) return;
    if (mus) { clearInterval(mus.i); if (mus.s) { try { mus.s.stop(); } catch (_) {} } }
    mus = { code, i: 0 };
    const p = tampon(code); if (p) { const b = await p; if (b) { mus.s = lire(b, busMus, true).s; return; } }
    const m = MUS[code] || MUS.MUS_01, air = m.envers ? [...THEME].reverse() : THEME; let k = 0;
    mus.i = setInterval(() => {
      if (ctx.state !== "running") return;
      const d = air[k % air.length]; k++;
      if (d == null) return;
      const f = ECHELLE[d] * m.oct * (m.clair && d === 2 ? 1.0595 : 1);
      carillon(f, 0, .13); if (k % 4 === 1) ton(f / 4, 2.4, { gain: .14, bus: busMus, type: "triangle", attaque: .3 });
    }, m.tempo);
  }
  function coeur(oui) { clearInterval(coeurT); if (oui && ctx) coeurT = setInterval(() => { ton(52, .16, { gain: .5, vers: 38 }); ton(48, .2, { quand: .22, gain: .36, vers: 34 }); }, 900); }

  MF.son = { demarrer, couper, jouer, ambiance, musique, coeur, note, melodie, gemir, get pret() { return !!ctx; } };
})(window);
