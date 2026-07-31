# Astro Galactic — Dossier à reprendre avec Claude Max

## Objectif
Ne pas refaire l'application depuis zéro.

Base visuelle actuelle :
- écran premium Astro Galactic
- style royal or / bleu nuit
- roue zodiacale
- message des étoiles
- stats dynamiques
- écran mobile vertical

## Problème Vercel corrigé ici
Erreur précédente :
`api/assetlinks.js` entre en conflit avec `api/assetlinks.json`.

Correction appliquée :
- dossier `api/` supprimé
- `assetlinks.json` gardé uniquement en statique :
  - `assetlinks.json`
  - `.well-known/assetlinks.json`
- `vercel.json` configuré sans build :
```json
{
  "framework": null,
  "buildCommand": "",
  "outputDirectory": "."
}
```

## À ne pas modifier
- ne pas changer l’identité visuelle
- ne pas remplacer le design par une app classique
- ne pas ajouter React/Vite/build
- ne pas recréer de dossier `api/assetlinks.*`
- ne pas casser le PWA simple HTML/CSS/JS

## À vérifier
1. Upload GitHub à la racine.
2. Supprimer tout ancien dossier `api/` dans GitHub.
3. Redéployer Vercel.
4. Tester :
   https://astro-galactic.vercel.app/?v=25-1

## À améliorer ensuite
Uniquement après déploiement réussi :
- ajustement taille écran mobile
- éviter chevauchements
- garder la roue et les infos dynamiques
- préparer une V26 plus stable
