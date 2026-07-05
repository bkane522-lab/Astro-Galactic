// api/horoscope.js — CommonJS serverless function (Vercel)

const MODULE_PROMPTS = {
  horoscope: (signe, today) =>
    `Génère l'horoscope complet du jour (${today}) pour le signe ${signe}. 3 courts paragraphes : Amour, Travail/Énergie, Conseil du jour. Maximum 120 mots au total.`,
  amour: (signe, today) =>
    `Génère un message d'amour et de relations du jour (${today}) pour le signe ${signe}. Ton chaleureux et inspirant. Maximum 70 mots.`,
  argent: (signe, today) =>
    `Génère un message sur l'argent et les opportunités matérielles du jour (${today}) pour le signe ${signe}. Maximum 70 mots.`,
  energie: (signe, today) =>
    `Génère un message sur l'énergie vitale et le bien-être du jour (${today}) pour le signe ${signe}. Maximum 70 mots.`,
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { signe, module: moduleType } = req.body || {};
  if (!signe) {
    return res.status(400).json({ error: "Signe manquant" });
  }

  const key = MODULE_PROMPTS[moduleType] ? moduleType : "horoscope";
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const basePrompt = MODULE_PROMPTS[key](signe, today);
  const prompt = `Tu es un astrologue mystique et poétique pour l'application Astro Galactic, univers or/nuit profond, sacré et apaisant.
${basePrompt}

Consignes :
- Ton chaleureux, inspirant, légèrement mystique, jamais générique
- Pas de titre, pas de markdown, texte brut
- Varie le style à chaque génération pour que ce soit unique
- Écris en français`;

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        max_tokens: 300,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq error:", errText);
      return res.status(502).json({ error: "Erreur IA" });
    }

    const data = await groqRes.json();
    const horoscope = data.choices?.[0]?.message?.content?.trim() || "Les astres se taisent aujourd'hui...";

    return res.status(200).json({ signe, module: key, horoscope, date: today });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};
