const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PAGES = [
  "index.html",
  "compatibilite.html",
  "theme-astral.html",
  "cristaux.html",
  "numerologie.html",
];

async function loadPage(page, { localStorageSeed } = {}) {
  const html = fs.readFileSync(path.join(ROOT, page), "utf8");
  const errors = [];
  const dom = new JSDOM(html, {
    url: `http://localhost/${page}`,
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    beforeParse(window) {
      // navigator.share / serviceWorker n'existent pas dans jsdom : on les stub
      // pour ne pas faire planter les scripts qui les référencent.
      window.navigator.share = undefined;
      // jsdom n'implémente pas le canvas 2D nativement (nécessiterait le paquet natif
      // "canvas") : on fournit un faux contexte pour pouvoir exécuter le starfield
      // exactement comme un vrai navigateur le ferait, sans fausser le test.
      window.HTMLCanvasElement.prototype.getContext = function () {
        return {
          clearRect() {},
          beginPath() {},
          arc() {},
          fill() {},
          set fillStyle(_) {},
        };
      };
      // Le starfield boucle indéfiniment via requestAnimationFrame (normal, c'est une
      // animation de fond). On le laisse s'exécuter une fois (donc "draw" est bien testé)
      // puis on coupe la boucle pour que le process de test se termine proprement —
      // ça ne change rien au comportement réel dans un navigateur.
      let rafCalls = 0;
      const realRaf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => {
        rafCalls += 1;
        if (rafCalls > 2) return 0;
        return realRaf(cb);
      };
      Object.defineProperty(window.navigator, "serviceWorker", {
        value: { register: () => Promise.resolve() },
        configurable: true,
      });
      window.console.error = (...args) => errors.push(args.map(String).join(" "));
      window.console.warn = (...args) => errors.push("[warn] " + args.map(String).join(" "));
      window.onerror = (msg) => errors.push("[onerror] " + msg);
      window.addEventListener("error", (e) => {
        errors.push("[window error] " + (e.error ? (e.error.stack || e.error.message) : e.message));
      });
      if (localStorageSeed) {
        for (const [k, v] of Object.entries(localStorageSeed)) {
          window.localStorage.setItem(k, v);
        }
      }
    },
  });
  // laisser le temps aux DOMContentLoaded / load / timers / MutationObservers de se déclencher
  await new Promise((r) => setTimeout(r, 300));
  return { dom, errors };
}

// Le starfield tourne en boucle via requestAnimationFrame (comme dans un vrai navigateur,
// c'est voulu) : on stoppe ce timer après chaque test pour laisser le process Node se terminer.
function stopAnimation(dom) {
  try {
    dom.window.cancelAnimationFrame = () => {};
    dom.window.requestAnimationFrame = () => 0;
  } catch (e) {}
}

function report(name, ok, detail) {
  const status = ok ? "OK  " : "FAIL";
  console.log(`[${status}] ${name}${detail ? " — " + detail : ""}`);
  if (!ok) process.exitCode = 1;
}

async function testConsoleCleanForAllPages() {
  for (const page of PAGES) {
    const { errors } = await loadPage(page);
    report(`console propre : ${page}`, errors.length === 0, errors.join(" | "));
  }
}

async function testSignRestoreAfterRefresh() {
  // 1) premier chargement, aucun signe stocké -> défaut Poissons, rien sélectionné visuellement
  {
    const { dom, errors } = await loadPage("index.html");
    const doc = dom.window.document;
    const affinityTitle = doc.querySelector(".affinity .title")?.textContent || "";
    // Poissons est le signe par défaut quand rien n'est en localStorage ; son affinité
    // déclarée dans SIGN_META est Taureau.
    report(
      "index.html premier chargement (aucun localStorage) -> Poissons par défaut",
      affinityTitle.includes("Taureau"),
      "titre affinité = " + JSON.stringify(affinityTitle)
    );
    report("aucune erreur console au 1er chargement", errors.length === 0, errors.join(" | "));
  }

  // 2) on simule le clic sur le label "LION" (comme un vrai utilisateur), puis on vérifie
  //    que ça écrit bien dans localStorage
  {
    const { dom } = await loadPage("index.html");
    const doc = dom.window.document;
    const labels = [...doc.querySelectorAll("#signLabels .sign")];
    const lionLabel = labels.find((el) => el.querySelector(".name")?.textContent === "LION");
    if (!lionLabel) {
      report("label LION trouvé sur la roue", false, "labels: " + labels.map(l=>l.querySelector('.name')?.textContent).join(","));
    } else {
      lionLabel.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));
      const stored = dom.window.localStorage.getItem("astroGalacticSign");
      report("clic sur LION -> localStorage mis à jour", stored === "Lion", "valeur stockée = " + stored);
      const selectedNow = doc.querySelector(".sign.is-selected .name")?.textContent;
      report("clic sur LION -> classe is-selected posée sur LION", selectedNow === "LION", "sélectionné = " + selectedNow);
    }
  }

  // 3) on recharge une page fraîche (nouveau DOM, comme un vrai F5) avec Lion déjà en localStorage
  //    et on vérifie que TOUT est restauré : roue visuelle + affinité + texte + stats + éléments chanceux
  {
    const { dom, errors } = await loadPage("index.html", { localStorageSeed: { astroGalacticSign: "Lion" } });
    const doc = dom.window.document;

    const selected = doc.querySelector(".sign.is-selected .name")?.textContent;
    report("après refresh : roue visuelle restaurée sur LION", selected === "LION", "sélectionné = " + selected);

    const affinityTitle = doc.querySelector(".affinity .title")?.textContent || "";
    // Lion -> affinity: Sagittaire (à vérifier dans SIGN_META, texte affiché = "Affinité du jour : Sagittaire")
    report("après refresh : affinité correspond au signe restauré (Lion -> Sagittaire)", affinityTitle.includes("Sagittaire"), "titre = " + JSON.stringify(affinityTitle));

    const sub = doc.querySelector("#affinitySub")?.textContent || doc.querySelector(".affinity .sub")?.textContent || "";
    report("après refresh : texte détaillé non vide", sub.trim().length > 0, "texte = " + JSON.stringify(sub));

    const statVals = [...doc.querySelectorAll(".stats-row .stat .stat-val")].map(e => e.textContent);
    report("après refresh : 4 stats affichées", statVals.length === 4 && statVals.every(v => /\d+%/.test(v)), "stats = " + statVals.join(","));

    const luckyVals = [...doc.querySelectorAll(".lucky-row .lucky-col .val")].map(e => e.textContent);
    report("après refresh : 3 éléments chanceux affichés (nombre/couleur/pierre)", luckyVals.length === 3 && luckyVals.every(v => v.trim().length > 0), "lucky = " + luckyVals.join(","));

    report("après refresh : aucune erreur console", errors.length === 0, errors.join(" | "));

    // window.ASTRO_ACTIVE_SIGN doit aussi refléter Lion (cohérence interne)
    report("après refresh : window.ASTRO_ACTIVE_SIGN = Lion", dom.window.ASTRO_ACTIVE_SIGN === "Lion", "valeur = " + dom.window.ASTRO_ACTIVE_SIGN);
  }

  // 4) round-trip complet sur les 12 signes : sélection -> relecture localStorage -> reload -> vérifie restauration
  {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    const allNames = [...html.matchAll(/name:'([A-ZÉ]+)'/g)].map(m => m[1]);
    for (const name of allNames) {
      const canon = name.charAt(0) + name.slice(1).toLowerCase();
      const canonFixed = canon
        .replace("Belier", "Bélier")
        .replace("Gemeaux", "Gémeaux")
        .replace("Verseau", "Verseau");
      const { dom } = await loadPage("index.html", { localStorageSeed: { astroGalacticSign: canonFixed } });
      const doc = dom.window.document;
      const selected = doc.querySelector(".sign.is-selected .name")?.textContent;
      report(`round-trip ${canonFixed} : roue restaurée`, selected === name, "sélectionné = " + selected);
    }
  }
}

async function testWheelDragDoesNotResetSelection() {
  // Le drag de la roue (initWheelDrag) ne doit pas effacer la sélection texte/affinité
  const { dom } = await loadPage("index.html", { localStorageSeed: { astroGalacticSign: "Scorpion" } });
  const doc = dom.window.document;
  const wheel = doc.querySelector(".wheel");
  if (wheel) {
    const down = new dom.window.PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100, pointerId: 1 });
    const move = new dom.window.PointerEvent("pointermove", { bubbles: true, clientX: 120, clientY: 80, pointerId: 1 });
    const up = new dom.window.PointerEvent("pointerup", { bubbles: true, pointerId: 1 });
    wheel.dispatchEvent(down);
    wheel.dispatchEvent(move);
    wheel.dispatchEvent(up);
  }
  const selected = doc.querySelector(".sign.is-selected .name")?.textContent;
  report("drag de la roue n'efface pas la sélection (Scorpion)", selected === "SCORPION", "sélectionné = " + selected);
}

async function testButtonsAndPanels() {
  const { dom, errors } = await loadPage("index.html");
  const doc = dom.window.document;
  const win = dom.window;

  const menuBtn = doc.getElementById("menuBtn");
  const menuPanel = doc.getElementById("menuPanel");
  if (menuBtn && menuPanel) {
    menuBtn.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
    report("bouton menu ouvre le panneau", menuPanel.classList.contains("is-open"));
    menuBtn.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
    report("bouton menu referme le panneau (toggle)", !menuPanel.classList.contains("is-open"));
  } else {
    report("bouton menu + panneau présents", false, "menuBtn=" + !!menuBtn + " menuPanel=" + !!menuPanel);
  }

  const profileBtn = doc.getElementById("profileBtn");
  const profilePanel = doc.getElementById("profilePanel");
  if (profileBtn && profilePanel) {
    profileBtn.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
    report("bouton profil (Mon espace) ouvre le panneau", profilePanel.classList.contains("is-open"));
  } else {
    report("bouton profil + panneau présents", false, "profileBtn=" + !!profileBtn + " profilePanel=" + !!profilePanel);
  }

  const shareBtn = doc.getElementById("shareBtn");
  report("bouton partage présent", !!shareBtn);

  const premiumLink = doc.getElementById("premiumBadgeLink");
  const premiumModal = doc.getElementById("premiumModal");
  if (premiumLink && premiumModal) {
    premiumLink.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
    report("badge Premium ouvre la modale", premiumModal.classList.contains("is-open"));
  } else {
    report("badge Premium + modale présents", false, "link=" + !!premiumLink + " modal=" + !!premiumModal);
  }

  report("aucune erreur console pendant les interactions boutons/panneaux", errors.length === 0, errors.join(" | "));
}

async function testMonEspaceTabsFavorisHistorique() {
  const { dom, errors } = await loadPage("index.html", { localStorageSeed: { astroGalacticSign: "Lion" } });
  const doc = dom.window.document;
  const win = dom.window;

  const profileBtn = doc.getElementById("profileBtn");
  if (profileBtn) profileBtn.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));

  const tabFav = doc.getElementById("meTabFavoris");
  const tabHist = doc.getElementById("meTabHistorique");
  const panelFav = doc.getElementById("meFavorisPanel");
  const panelHist = doc.getElementById("meHistoriquePanel");
  report("onglets Mon espace (Favoris/Historique) présents", !!(tabFav && tabHist && panelFav && panelHist));

  if (tabHist) {
    tabHist.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
    report("clic onglet Historique -> devient actif", tabHist.classList.contains("is-active"));
    report("clic onglet Historique -> panneau Favoris masqué", panelFav.style.display === "none");
  }
  if (tabFav) {
    tabFav.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
    report("clic onglet Favoris -> redevient actif", tabFav.classList.contains("is-active"));
    report("clic onglet Favoris -> panneau Historique masqué", panelHist.style.display === "none");
  }

  const favListEl = doc.getElementById("meFavorisList");
  const histListEl = doc.getElementById("meHistoriqueList");
  report("liste Favoris (meFavorisList) présente", !!favListEl);
  report("liste Historique (meHistoriqueList) présente", !!histListEl);

  // épingler le message du jour du signe restauré (Lion) doit l'ajouter aux favoris
  // avec le BON signe (et non "Poissons" par défaut comme avant le correctif)
  const pinBtn = doc.getElementById("pinMsgBtn");
  if (pinBtn) {
    pinBtn.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));
    const favorites = JSON.parse(win.localStorage.getItem("astroGalacticFavorites") || win.localStorage.getItem("astro_favorites") || "null") || [];
    const rows = [...(favListEl ? favListEl.querySelectorAll(".me-entry-sign") : [])].map(e => e.textContent);
    // getCurrentSignFromDOM() lit le texte affiché tel quel (ex. "LION" en majuscules,
    // le même format que le libellé sur la roue) — c'est le format utilisé de façon
    // cohérente dans tout le sous-système Favoris/Historique.
    report("épingler ajoute une entrée dans Favoris avec le signe restauré (Lion)", rows.includes("LION"), "entrées favoris = " + rows.join(","));
    report("bouton épingler prend l'état 'is-pinned' après clic", pinBtn.classList.contains("is-pinned"));
  } else {
    report("bouton épingler présent", false);
  }

  report("aucune erreur console (Mon espace / Favoris / Historique)", errors.length === 0, errors.join(" | "));
}

async function testMobileViewport() {
  for (const page of PAGES) {
    const { dom, errors } = await loadPage(page);
    dom.window.innerWidth = 375;
    dom.window.innerHeight = 667;
    dom.window.dispatchEvent(new dom.window.Event("resize"));
    await new Promise((r) => setTimeout(r, 100));
    report(`resize mobile (375x667) sans erreur : ${page}`, errors.length === 0, errors.join(" | "));
  }
}

async function testPremiumPagesLocalStorageAndConsole() {
  const premiumPages = ["compatibilite.html", "theme-astral.html", "cristaux.html", "numerologie.html"];
  for (const page of premiumPages) {
    const { dom, errors } = await loadPage(page, { localStorageSeed: { astroGalacticSign: "Balance" } });
    const doc = dom.window.document;
    report(`${page} charge sans erreur console`, errors.length === 0, errors.join(" | "));
    // vérifie qu'il existe un bouton retour / navigation cohérente
    const backLink = doc.querySelector('a[href="index.html"], a[href="/index.html"], .back-btn, [data-back]');
    report(`${page} a un lien de retour vers l'accueil`, !!backLink);
  }
}

(async () => {
  console.log("=== Console propre sur les 5 pages (chargement simple) ===");
  await testConsoleCleanForAllPages();

  console.log("\n=== Restauration du signe après refresh (coeur du fix demandé) ===");
  await testSignRestoreAfterRefresh();

  console.log("\n=== Le drag de la roue ne casse pas la sélection ===");
  await testWheelDragDoesNotResetSelection();

  console.log("\n=== Boutons / menus / Mon espace / Premium (index) ===");
  await testButtonsAndPanels();

  console.log("\n=== Mon espace : onglets, Favoris, Historique ===");
  await testMonEspaceTabsFavorisHistorique();

  console.log("\n=== Viewport mobile sur les 5 pages ===");
  await testMobileViewport();

  console.log("\n=== Pages Premium : console + navigation ===");
  await testPremiumPagesLocalStorageAndConsole();

  console.log("\n=== FIN DES TESTS ===");
})();
