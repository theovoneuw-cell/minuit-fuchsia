// L'iCoffin côté téléphone : Manuel, et instruments (face contre table, inclinaison, souffle).
import { Client } from "./net.js";
const MF = window.MF, $ = MF.$;
const code = (new URLSearchParams(location.search).get("s") || "").toUpperCase();
let sections = ["reglement"], mode = null, capteur = false, beta = 0, gamma = 0, bas = false, lien = null;
try { sections = JSON.parse(localStorage.getItem("mf-sections-" + code)) || sections; } catch (_) {}

const plein = (id, oui) => $(id).classList.toggle("ouvert", oui);
function manuel() {
  MF.icoffin.rendre($("manuel"), { sections, ouvrir: id => { if (!sections.includes(id)) sections.push(id); try { localStorage.setItem("mf-sections-" + code, JSON.stringify(sections)); } catch (_) {} lien && lien.envoyer({ t: "section", id }); } });
}
function poserMode(m) {
  mode = m; ["cache", "bat", "souffle"].forEach(i => plein(i, m === i));
  if (m === "cache") { $("b-cache").hidden = capteur; if (navigator.vibrate) navigator.vibrate([200, 100, 200]); }
}

// ——— Capteurs : sens du téléphone (face contre table) et inclinaison
function ecouter() {
  addEventListener("deviceorientation", e => {
    if (e.beta == null) return; capteur = true; beta = e.beta; gamma = e.gamma;
    const b = Math.abs(beta) > 140; if (b !== bas) { bas = b; lien && lien.envoyer({ t: "face", bas }); $("cache").classList.toggle("bas", bas); }
  });
}
async function activer() {
  try { if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) { if (await DeviceOrientationEvent.requestPermission() === "granted") ecouter(); } else ecouter(); } catch (_) {}
  plein("accueil", false); relier();
}
$("b-activer").onclick = activer;

// Sans capteur : garder le doigt posé vaut « face contre table ».
const tenir = oui => () => { bas = oui; lien && lien.envoyer({ t: "face", bas }); };
$("b-cache").addEventListener("pointerdown", tenir(true)); $("b-cache").addEventListener("pointerup", tenir(false));

// ——— Chauve-souris
document.querySelectorAll("[data-d]").forEach(b => b.onclick = () => lien && lien.envoyer({ t: "dir", d: b.dataset.d }));
$("b-cri").onclick = () => lien && lien.envoyer({ t: "cri" });
setInterval(() => {
  if (mode !== "bat" || !capteur || !$("c-penche").checked || !lien) return;
  const d = Math.abs(gamma) > 20 && Math.abs(gamma) >= Math.abs(beta) ? (gamma > 0 ? "E" : "O") : beta > 20 ? "S" : beta < -20 ? "N" : null;
  if (d) lien.envoyer({ t: "dir", d });
}, 480);

// ——— Souffle
let tenu = false; $("b-souffle").addEventListener("pointerdown", () => tenu = true); addEventListener("pointerup", () => tenu = false);
setInterval(() => { if (mode === "souffle" && tenu && lien) lien.envoyer({ t: "souffle", v: 4 }); }, 150);
$("b-micro").onclick = async () => {
  try {
    const flux = await navigator.mediaDevices.getUserMedia({ audio: true }), AC = window.AudioContext || window.webkitAudioContext, cx = new AC(), an = cx.createAnalyser(), d = new Uint8Array(512);
    cx.createMediaStreamSource(flux).connect(an); $("b-micro").textContent = "Souffle !";
    const i = setInterval(() => { if (mode !== "souffle") { clearInterval(i); flux.getTracks().forEach(t => t.stop()); return; } an.getByteTimeDomainData(d); let s = 0; for (const v of d) s += (v - 128) * (v - 128); if (Math.sqrt(s / d.length) > 18 && lien) lien.envoyer({ t: "souffle", v: 3 }); }, 80);
  } catch (_) { $("b-micro").textContent = "Micro indisponible"; }
};

// ——— Liaison
function relier() {
  if (!code) { $("etat-texte").textContent = "Scanne le code affiché sur le grand écran."; return; }
  lien = new Client(code, {
    presentation: () => ({ capteur }),
    connecte: () => { $("etat").classList.add("ok"); $("etat-texte").textContent = "Relié à l'écran " + code; },
    coupure: () => { $("etat").classList.remove("ok"); $("etat-texte").textContent = "Liaison perdue, nouvelle tentative…"; },
    message: d => {
      if (d.t === "etat") { let neuf = false; (d.sections || []).forEach(s => { if (!sections.includes(s)) { sections.push(s); neuf = true; } }); if (neuf) manuel(); sections.forEach(id => (d.sections || []).includes(id) || lien.envoyer({ t: "section", id })); $("nettete").style.width = (d.nettete || 0) + "%"; plein("casier", !d.actif); }
      else if (d.t === "mode") poserMode(d.mode);
      else if (d.t === "fin") { poserMode(null); plein("fin", true); }
    }
  });
}
manuel();
