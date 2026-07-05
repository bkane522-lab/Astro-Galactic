// api/horoscope.js — CommonJS serverless function (Vercel)

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { signe, birthDate } = req.body || {};
  if (!signe) {
    return res.status(400).json({ error: "Signe manquant" });
  }

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const prompt = `Tu es un astrologue mystique et poétique pour l'application Astro Galactic, dans un univers cosmique doré/violet.
Génère l'horoscope du jour (${today}) pour le signe ${signe}.

Consignes :
- Ton chaleureux, inspirant, légèrement mystique, jamais générique
- 3 courts paragraphes : Amour, Travail/Énergie, Conseil du jour
- Pas de titre, pas de markdown, texte brut avec sauts de ligne entre paragraphes
- Maximum 120 mots au total
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

    return res.status(200).json({ signe, horoscope, date: today });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};
