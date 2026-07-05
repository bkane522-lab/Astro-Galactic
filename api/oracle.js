// api/oracle.js — CommonJS serverless function (Vercel)

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { question, signe } = req.body || {};
  if (!question || !signe) {
    return res.status(400).json({ error: "Question ou signe manquant" });
  }
  if (question.length > 300) {
    return res.status(400).json({ error: "Question trop longue" });
  }

  const prompt = `Tu es l'Oracle d'Astro Galactic, une entité mystique qui répond aux questions des utilisateurs à la lumière de leur signe astrologique.

Signe de la personne : ${signe}
Question posée : "${question}"

Consignes :
- Réponds avec sagesse, bienveillance et un léger mystère, sans être vague au point d'être inutile
- Appuie ta réponse sur les traits typiques du signe ${signe}
- Ne donne jamais de conseil médical, financier ou juridique précis
- 2 à 4 phrases maximum, pas de markdown, texte brut
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
        temperature: 0.95,
        max_tokens: 200,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq error:", errText);
      return res.status(502).json({ error: "Erreur IA" });
    }

    const data = await groqRes.json();
    const reponse = data.choices?.[0]?.message?.content?.trim() || "L'univers reste silencieux pour l'instant...";

    return res.status(200).json({ reponse });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};
