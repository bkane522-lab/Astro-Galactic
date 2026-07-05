// ===== ASTRO GALACTIC — app.js =====

const ZODIAC = [
  { name: "Capricorne", emoji: "♑", start: [12,22], end: [1,19] },
  { name: "Verseau",    emoji: "♒", start: [1,20],  end: [2,18] },
  { name: "Poissons",   emoji: "♓", start: [2,19],  end: [3,20] },
  { name: "Bélier",     emoji: "♈", start: [3,21],  end: [4,19] },
  { name: "Taureau",    emoji: "♉", start: [4,20],  end: [5,20] },
  { name: "Gémeaux",    emoji: "♊", start: [5,21],  end: [6,20] },
  { name: "Cancer",     emoji: "♋", start: [6,21],  end: [7,22] },
  { name: "Lion",       emoji: "♌", start: [7,23],  end: [8,22] },
  { name: "Vierge",     emoji: "♍", start: [8,23],  end: [9,22] },
  { name: "Balance",    emoji: "♎", start: [9,23],  end: [10,22] },
  { name: "Scorpion",   emoji: "♏", start: [10,23], end: [11,21] },
  { name: "Sagittaire", emoji: "♐", start: [11,22], end: [12,21] },
];

function getSign(month, day) {
  for (const z of ZODIAC) {
    const [sm, sd] = z.start;
    const [em, ed] = z.end;
    if (sm === em) {
      if (month === sm && day >= sd && day <= ed) return z;
    } else if (sm > em) {
      // Capricorne à cheval sur l'année
      if ((month === sm && day >= sd) || (month === em && day <= ed)) return z;
    } else {
      if ((month === sm && day >= sd) || (month === em && day <= ed)) return z;
    }
  }
  return ZODIAC[0];
}

function formatSignDates(z) {
  const [sm, sd] = z.start;
  const [em, ed] = z.end;
  const months = ["jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"];
  return `${sd} ${months[sm-1]} - ${ed} ${months[em-1]}`;
}

// ---- Persistance locale (juste pour éviter de resaisir à chaque visite) ----
function saveBirthData(data) {
  try { localStorage.setItem("astroGalacticBirth", JSON.stringify(data)); } catch(e) {}
}
function loadBirthData() {
  try { return JSON.parse(localStorage.getItem("astroGalacticBirth")); } catch(e) { return null; }
}

// ---- Éléments DOM ----
const setupScreen = document.getElementById("setupScreen");
const resultScreen = document.getElementById("resultScreen");
const birthDateInput = document.getElementById("birthDate");
const birthTimeInput = document.getElementById("birthTime");
const birthPlaceInput = document.getElementById("birthPlace");
const revealBtn = document.getElementById("revealBtn");
const changeBtn = document.getElementById("changeBtn");
const premiumBtn = document.getElementById("premiumBtn");

const signEmoji = document.getElementById("signEmoji");
const signName = document.getElementById("signName");
const signDates = document.getElementById("signDates");
const horoscopeContent = document.getElementById("horoscopeContent");

function showResultScreen(data) {
  const [y, m, d] = data.birthDate.split("-").map(Number);
  const z = getSign(m, d);

  signEmoji.textContent = z.emoji;
  signName.textContent = z.name;
  signDates.textContent = formatSignDates(z);

  setupScreen.classList.add("hidden");
  resultScreen.classList.remove("hidden");

  fetchHoroscope(z.name, data);
}

async function fetchHoroscope(signeName, data) {
  horoscopeContent.innerHTML = `<div class="loading"><div class="spinner"></div> Consultation des étoiles...</div>`;
  try {
    const res = await fetch("/api/horoscope", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signe: signeName,
        birthDate: data.birthDate,
      }),
    });
    if (!res.ok) throw new Error("Erreur serveur");
    const json = await res.json();
    horoscopeContent.innerHTML = `<div class="horoscope-text">${escapeHtml(json.horoscope)}</div>`;
  } catch (err) {
    horoscopeContent.innerHTML = `<div class="horoscope-text">✨ Les étoiles sont momentanément voilées. Réessaie dans un instant.</div>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

revealBtn.addEventListener("click", () => {
  if (!birthDateInput.value) {
    birthDateInput.focus();
    return;
  }
  const data = {
    birthDate: birthDateInput.value,
    birthTime: birthTimeInput.value || null,
    birthPlace: birthPlaceInput.value || null,
  };
  saveBirthData(data);
  showResultScreen(data);
});

changeBtn.addEventListener("click", () => {
  resultScreen.classList.add("hidden");
  setupScreen.classList.remove("hidden");
});

premiumBtn.addEventListener("click", () => {
  window.location.href = "/premium.html";
});

// ---- Au chargement : si une date est déjà enregistrée, on saute direct à l'horoscope ----
window.addEventListener("DOMContentLoaded", () => {
  const saved = loadBirthData();
  if (saved) {
    birthDateInput.value = saved.birthDate;
    if (saved.birthTime) birthTimeInput.value = saved.birthTime;
    if (saved.birthPlace) birthPlaceInput.value = saved.birthPlace;
    showResultScreen(saved);
  }
});

// ---- Service worker PWA ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
