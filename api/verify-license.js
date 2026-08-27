// api/verify-license.js
// Fonction serverless Vercel — proxy de vérification de licence Gumroad.
//
// Rôle : reçoit un code de licence saisi par l'utilisateur dans l'app, le transmet
// à l'API officielle de vérification de licence de Gumroad, et renvoie sa réponse
// telle quelle au frontend (compatibilite.html, theme-astral.html, cristaux.html,
// numerologie.html appellent tous ce endpoint via fetch('/api/verify-license')).
//
// Pourquoi un proxy plutôt qu'un appel direct depuis le navigateur ?
// - Évite les blocages CORS potentiels sur api.gumroad.com.
// - Garde un point unique où ajouter plus tard de la logique serveur (incrément du
//   compteur d'utilisation, journalisation des activations, limite d'appareils, etc.).
//
// === POINT D'INTÉGRATION BACKEND / GUMROAD — À FAIRE AVANT MISE EN LIGNE ===
// 1. Aller dans le dashboard Gumroad du produit Premium > Settings > Advanced,
//    copier le "permalink" du produit (ex: 'astro-galactic-premium').
// 2. Renseigner GUMROAD_PRODUCT_PERMALINK ci-dessous, OU définir la variable
//    d'environnement Vercel GUMROAD_PRODUCT_PERMALINK (recommandé, évite de committer
//    la valeur en dur) dans Vercel > Project Settings > Environment Variables.
// 3. Déployer : ce fichier est déjà au bon endroit (/api/verify-license.js), Vercel le
//    détecte automatiquement comme fonction serverless, aucune configuration
//    supplémentaire n'est nécessaire dans vercel.json.
//
// Aucune clé secrète Gumroad n'est nécessaire pour cet appel : la vérification de
// licence standard de Gumroad ne demande que le permalink du produit (public) et le
// code de licence fourni par l'utilisateur.

const GUMROAD_PRODUCT_PERMALINK =
  process.env.GUMROAD_PRODUCT_PERMALINK || 'REMPLACER_PAR_VOTRE_PERMALINK';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Méthode non autorisée.' });
    return;
  }

  if (GUMROAD_PRODUCT_PERMALINK === 'REMPLACER_PAR_VOTRE_PERMALINK') {
    res.status(500).json({
      success: false,
      message: "Produit Gumroad non configuré (GUMROAD_PRODUCT_PERMALINK manquant côté serveur).",
    });
    return;
  }

  const licenseKey =
    req.body && typeof req.body.license_key === 'string' ? req.body.license_key.trim() : '';

  if (!licenseKey) {
    res.status(400).json({ success: false, message: 'Code de licence manquant.' });
    return;
  }

  try {
    const body = new URLSearchParams();
    body.set('product_permalink', GUMROAD_PRODUCT_PERMALINK);
    body.set('license_key', licenseKey);
    // Ne pas incrémenter le compteur d'utilisation à chaque vérification (l'utilisateur peut
    // recharger la page / réinstaller l'app) : on vérifie sans compter une "activation" de plus.
    body.set('increment_uses_count', 'false');

    const gumroadRes = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await gumroadRes.json();
    // Gumroad renvoie { success: true, purchase: {...}, uses: N } si le code est valide,
    // ou { success: false, message: '...' } sinon. On relaie tel quel.
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({
      success: false,
      message: 'Vérification indisponible pour le moment. Réessayez.',
    });
  }
};
