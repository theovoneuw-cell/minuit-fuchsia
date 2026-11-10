// L'iCoffin : le Manuel de l'élève monstrueux. Même rendu sur le téléphone (tel.html) et dans le panneau de l'écran.
(function (G) {
  "use strict";
  const MF = G.MF = G.MF || {}, el = MF.el;
  MF.icoffin = {
    // o : { sections: [ids ouverts], ouvrir(id), son }
    rendre(corps, o) {
      const M = MF.M; corps.innerHTML = "";
      corps.appendChild(el("header", "tel-tete", `<b>iCoffin</b><span>Manuel de l'élève monstrueux</span>`));
      const liste = el("div", "tel-liste"); corps.appendChild(liste);
      M.forEach(p => {
        const ouvert = !p.mdp || o.sections.includes(p.id), d = el("details", "tel-chapitre" + (ouvert ? "" : " ferme"));
        d.appendChild(el("summary", "", `${p.titre}${ouvert ? "" : " <i>mot de passe</i>"}`));
        if (ouvert) d.appendChild(el("div", "tel-page", p.html));
        else {
          const f = el("div", "tel-page"), i = el("input", "saisie"), r = el("p", "petit");
          i.placeholder = "mot de passe"; i.autocomplete = "off"; i.autocapitalize = "characters"; i.spellcheck = false;
          const essai = () => { if (MF.norme(i.value) === p.mdp) { o.ouvrir(p.id); o.sections.includes(p.id) || o.sections.push(p.id); if (o.son) o.son.jouer("SFX_OUI"); MF.icoffin.rendre(corps, o); corps.querySelector(`[data-id="${p.id}"]`).open = true; } else { i.value = ""; r.textContent = "Mot de passe refusé."; if (o.son) o.son.jouer("SFX_NON"); } };
          i.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") essai(); });
          const b = el("button", "plein", "Ouvrir"); b.addEventListener("click", essai); f.append(i, b, r); d.appendChild(f);
        }
        d.dataset.id = p.id; liste.appendChild(d);
      });
    }
  };
})(window);
