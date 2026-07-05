// ===== ASTRO GALACTIC — app.js =====

const ZODIAC = [
  { key:"belier",     name:"Bélier",     emoji:"♈", symbol:"♈", start:[3,21],  end:[4,19] },
  { key:"taureau",    name:"Taureau",    emoji:"♉", symbol:"♉", start:[4,20],  end:[5,20] },
  { key:"gemeaux",    name:"Gémeaux",    emoji:"♊", symbol:"♊", start:[5,21],  end:[6,20] },
  { key:"cancer",     name:"Cancer",     emoji:"♋", symbol:"♋", start:[6,21],  end:[7,22] },
  { key:"lion",       name:"Lion",       emoji:"♌", symbol:"♌", start:[7,23],  end:[8,22] },
  { key:"vierge",     name:"Vierge",     emoji:"♍", symbol:"♍", start:[8,23],  end:[9,22] },
  { key:"balance",    name:"Balance",    emoji:"♎", symbol:"♎", start:[9,23],  end:[10,22] },
  { key:"scorpion",   name:"Scorpion",   emoji:"♏", symbol:"♏", start:[10,23], end:[11,21] },
  { key:"sagittaire", name:"Sagittaire", emoji:"♐", symbol:"♐", start:[11,22], end:[12,21] },
  { key:"capricorne", name:"Capricorne", emoji:"♑", symbol:"♑", start:[12,22], end:[1,19] },
  { key:"verseau",    name:"Verseau",    emoji:"♒", symbol:"♒", start:[1,20],  end:[2,18] },
  { key:"poissons",   name:"Poissons",   emoji:"♓", symbol:"♓", start:[2,19],  end:[3,20] },
];

function getSignByDate(month, day) {
  for (const z of ZODIAC) {
    const [sm, sd] = z.start, [em, ed] = z.end;
    if (sm > em) {
      if ((month === sm && day >= sd) || (month === em && day <= ed)) return z;
    } else {
      if ((month === sm && day >= sd) || (month === em && day <= ed)) return z;
    }
  }
  return ZODIAC[0];
}
function formatSignDates(z) {
  const months = ["jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"];
  return `${z.start[1]} ${months[z.start[0]-1]} - ${z.end[1]} ${months[z.end[0]-1]}`;
}

// ---- Dessin de la roue SVG sur le portail ----
function drawWheel() {
  const symbolsG = document.getElementById("symbols");
  const spokesG = document.getElementById("spokes");
  if (!symbolsG) return;
  const cx = 140, cy = 140, rSymbol = 116, rSpokeInner = 60, rSpokeOuter = 105;

  ZODIAC.forEach((z, i) => {
    const angle = (i * 30 - 90) * Math.PI / 180;
    const x = cx + rSymbol * Math.cos(angle);
    const y = cy + rSymbol * Math.sin(angle);
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("class", "zodiac-symbol");
    t.textContent = z.symbol;
    symbolsG.appendChild(t);

    const spokeAngle = ((i * 30) - 90 + 15) * Math.PI / 180;
    const x1 = cx + rSpokeInner * Math.cos(spokeAngle);
    const y1 = cy + rSpokeInner * Math.sin(spokeAngle);
    const x2 = cx + rSpokeOuter * Math.cos(spokeAngle);
    const y2 = cy + rSpokeOuter * Math.sin(spokeAngle);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1); line.setAttribute("y1", y1);
    line.setAttribute("x2", x2); line.setAttribute("y2", y2);
    line.setAttribute("class", "wheel-spoke");
    spokesG.appendChild(line);
  });
}

// ---- Persistance ----
function saveBirthData(data) { try { localStorage.setItem("astroGalacticBirth", JSON.stringify(data)); } catch(e){} }
function loadBirthData() { try { return JSON.parse(localStorage.getItem("astroGalacticBirth")); } catch(e){ return null; } }

// ---- Énergie du jour pseudo-aléatoire seedée (signe + date) pour affichage rapide ----
function seededPercent(seedStr) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) { h = (h * 31 + seedStr.charCodeAt(i)) >>> 0; }
  return 45 + (h % 51); // entre 45 et 95
}

// ---- Éléments DOM ----
const portalScreen = document.getElementById("portalScreen");
const galaxyScreen = document.getElementById("galaxyScreen");
const portalIntro = document.getElementById("portalIntro");
const portalForm = document.getElementById("portalForm");
const startBtn = document.getElementById("startBtn");
const knowSignBtn = document.getElementById("knowSignBtn");
const wheelWrap = document.getElementById("wheelWrap");

const birthDateInput = document.getElementById("birthDate");
const birthTimeInput = document.getElementById("birthTime");
const birthPlaceInput = document.getElementById("birthPlace");

const gSignEmoji = document.getElementById("gSignEmoji");
const gSignName = document.getElementById("gSignName");
const gSignDates = document.getElementById("gSignDates");

const moduleModal = document.getElementById("moduleModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");
const modalOracleInput = document.getElementById("modalOracleInput");
const oracleQuestion = document.getElementById("oracleQuestion");
const oracleAskBtn = document.getElementById("oracleAskBtn");
const shareBtn = document.getElementById("shareBtn");

let currentSign = null;
let currentBirthData = null;

// ---- Navigation portail ----
startBtn.addEventListener("click", () => {
  portalIntro.classList.add("hidden");
  portalForm.classList.add("active");
});

knowSignBtn.addEventListener("click", () => {
  openSignPicker();
});

portalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!birthDateInput.value) { birthDateInput.focus(); return; }
  const data = {
    birthDate: birthDateInput.value,
    birthTime: birthTimeInput.value || null,
    birthPlace: birthPlaceInput.value || null,
  };
  saveBirthData(data);
  enterGalaxy(data);
});

function openSignPicker() {
  modalTitle.textContent = "Choisis ton signe";
  modalOracleInput.classList.add("hidden");
  shareBtn.classList.add("hidden");
  modalBody.innerHTML = "";
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(3, 1fr)";
  grid.style.gap = "10px";
  ZODIAC.forEach(z => {
    const btn = document.createElement("button");
    btn.style.cssText = "padding:12px 4px;border-radius:12px;border:1px solid rgba(212,175,55,0.35);background:rgba(212,175,55,0.06);color:#f5ecd2;font-size:0.85rem;cursor:pointer;";
    btn.innerHTML = `<div style="font-size:1.3rem;">${z.emoji}</div>${z.name}`;
    btn.addEventListener("click", () => {
      closeModal();
      const data = { birthDate: null, signOverride: z.key };
      saveBirthData(data);
      enterGalaxy(data);
    });
    grid.appendChild(btn);
  });
  modalBody.appendChild(grid);
  moduleModal.classList.remove("hidden");
}

function enterGalaxy(data) {
  currentBirthData = data;
  let z;
  if (data.signOverride) {
    z = ZODIAC.find(s => s.key === data.signOverride);
  } else {
    const [y, m, d] = data.birthDate.split("-").map(Number);
    z = getSignByDate(m, d);
  }
  currentSign = z;

  gSignEmoji.textContent = z.emoji;
  gSignName.textContent = z.name;
  gSignDates.textContent = formatSignDates(z);

  portalScreen.classList.add("hidden");
  galaxyScreen.classList.remove("hidden");

  const seed = z.key + new Date().toDateString();
  document.getElementById("energyHoroscope").textContent = seededPercent(seed+"h") + "%";
  document.getElementById("energyAmour").textContent = seededPercent(seed+"a") + "%";
  document.getElementById("energyArgent").textContent = seededPercent(seed+"g") + "%";
  document.getElementById("energyEnergie").textContent = seededPercent(seed+"e") + "%";
}

// ---- Modules ----
document.querySelectorAll(".module-card").forEach(card => {
  card.addEventListener("click", () => {
    const mod = card.dataset.module;
    if (card.classList.contains("locked")) {
      openLockedModule(mod);
    } else if (mod === "oracle") {
      openOracle();
    } else {
      openModule(mod);
    }
  });
});

function closeModal() { moduleModal.classList.add("hidden"); }
modalClose.addEventListener("click", closeModal);

const MODULE_LABELS = {
  horoscope: "Horoscope du jour",
  amour: "Amour",
  argent: "Argent",
  energie: "Énergie du jour",
};

async function openModule(mod) {
  modalTitle.textContent = MODULE_LABELS[mod] || mod;
  modalOracleInput.classList.add("hidden");
  shareBtn.classList.remove("hidden");
  modalBody.innerHTML = `<div class="loading"><div class="spinner"></div> Consultation des étoiles...</div>`;
  moduleModal.classList.remove("hidden");

  try {
    const res = await fetch("/api/horoscope", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signe: currentSign.name, module: mod }),
    });
    if (!res.ok) throw new Error();
    const json = await res.json();
    modalBody.textContent = json.horoscope;
  } catch (err) {
    modalBody.textContent = "✨ Les étoiles sont momentanément voilées. Réessaie dans un instant.";
  }
}

function openLockedModule(mod) {
  modalTitle.textContent = mod === "theme" ? "Thème astral complet" : "Compatibilité amoureuse";
  modalOracleInput.classList.add("hidden");
  shareBtn.classList.add("hidden");
  modalBody.innerHTML = `Cette fonctionnalité fait partie de l'offre Premium.<br><br>Débloque ton thème astral détaillé et ta compatibilité amoureuse pour quelques euros.`;
  moduleModal.classList.remove("hidden");
}

function openOracle() {
  modalTitle.textContent = "Oracle IA";
  modalOracleInput.classList.remove("hidden");
  shareBtn.classList.add("hidden");
  modalBody.textContent = "Pose ta question à l'univers, l'oracle te répondra à la lumière de ton signe.";
  moduleModal.classList.remove("hidden");
}

oracleAskBtn.addEventListener("click", async () => {
  const q = oracleQuestion.value.trim();
  if (!q) return;
  modalBody.innerHTML = `<div class="loading"><div class="spinner"></div> L'oracle consulte les astres...</div>`;
  try {
    const res = await fetch("/api/oracle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q, signe: currentSign.name }),
    });
    if (!res.ok) throw new Error();
    const json = await res.json();
    modalBody.textContent = json.reponse;
  } catch (err) {
    modalBody.textContent = "✨ L'oracle est silencieux pour l'instant. Réessaie bientôt.";
  }
});

// ---- Init ----
window.addEventListener("DOMContentLoaded", () => {
  drawWheel();
  const saved = loadBirthData();
  if (saved) {
    if (saved.birthDate) { birthDateInput.value = saved.birthDate; }
    enterGalaxy(saved);
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
