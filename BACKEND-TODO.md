# BACKEND-TODO.md — Points d'intégration à connecter plus tard

Ce document liste tout ce qui, dans l'état actuel du projet, est une **simulation frontend** et devra être remplacé par un vrai backend. Rien de ce qui suit n'est cassé ou manquant pour l'expérience actuelle — c'est une carte pour la prochaine étape.

---

## 1. Données astrologiques (index.html)

**État actuel** : `SIGN_META` est un objet JavaScript statique, codé en dur, identique pour tout le monde. Les 4 indicateurs (Amour/Argent/Humeur/Énergie), le texte d'affinité et les statistiques par signe ne changent jamais réellement d'un jour à l'autre ni d'un utilisateur à l'autre.

**Repère dans le code** : commentaire `=== POINT D'INTÉGRATION BACKEND ===` juste au-dessus de `const SIGN_META = {...}`.

**À faire plus tard** :
- Créer une API qui calcule un vrai horoscope du jour (à partir d'une date/heure de naissance, ou au minimum d'un vrai algorithme journalier)
- Remplacer le bloc statique par un appel `fetch()` au chargement de la page
- Prévoir un état de chargement (skeleton ou spinner discret) pendant l'appel

## 2. Date du jour

**État actuel** : déjà dynamique — calculée en JavaScript côté client (`setTodayDate()`), pas codée en dur. ✅ Rien à faire ici, sauf si le "message du jour" doit être calculé côté serveur en fonction du fuseau horaire réel de l'utilisateur.

## 3. Système Premium / freemium (les 4 écrans secondaires)

**État actuel (mis à jour)** : le faux déblocage instantané a été retiré. Le parcours est maintenant :
1. Le bouton "✦ Acheter sur Gumroad" ouvre la vraie page de vente Gumroad dans un nouvel onglet — aucun déblocage n'a lieu à ce clic.
2. Après achat, l'utilisateur reçoit un code de licence par email (mécanisme standard Gumroad) et le colle dans le champ "J'ai déjà un code Premium".
3. Le code est envoyé à `/api/verify-license` (fonction serverless Vercel, fichier `api/verify-license.js`, déjà écrit et prêt à déployer), qui le vérifie auprès de l'API officielle de Gumroad.
4. Si le code est valide, `astroGalacticPremiumUnlocked` est mis à `true` dans `localStorage` sur cet appareil et la page se recharge pour refléter le déblocage.

Le déblocage reste donc local à l'appareil (pas de compte utilisateur, pas de synchronisation entre appareils) — mais il est désormais **conditionné à un vrai achat vérifié auprès de Gumroad**, plus une simulation.

**Repère dans le code** : commentaire `=== POINT D'INTÉGRATION BACKEND / GUMROAD ===` au-dessus de `const PREMIUM_KEY` dans `compatibilite.html`, `theme-astral.html`, `cristaux.html`, `numerologie.html`, ainsi qu'en haut de `api/verify-license.js`.

**Ce qu'il reste à faire avant mise en ligne (uniquement de la configuration, pas de code)** :
- Créer le produit Premium sur Gumroad et copier son URL de vente dans `GUMROAD_PRODUCT_URL` (présent dans les 4 fichiers HTML premium).
- Copier son "permalink" Gumroad dans `GUMROAD_PRODUCT_PERMALINK` dans `api/verify-license.js` (idéalement via une variable d'environnement Vercel du même nom, pour ne pas la committer en dur).
- Déployer sur Vercel (le fichier `api/verify-license.js` est détecté automatiquement comme fonction serverless, aucune configuration `vercel.json` supplémentaire n'est nécessaire).
- Optionnel plus tard : compte utilisateur + synchronisation multi-appareils, gestion d'expiration d'abonnement si le produit Gumroad devient un abonnement récurrent plutôt qu'un achat unique.

## 4. Profil utilisateur

**État actuel** : le panneau "Profil" affiche un texte statique ("Aucun profil connecté pour l'instant").

**À faire plus tard** :
- Authentification
- Formulaire de date/heure/lieu de naissance (nécessaire pour un vrai calcul astrologique)
- Historique des horoscopes consultés

## 5. Partage

**État actuel** : le bouton "Partagez votre message du jour" utilise l'API native `navigator.share()` du téléphone (fonctionne déjà, aucune connexion serveur nécessaire), avec repli sur copie presse-papier si non supporté. ✅ Pas de backend nécessaire pour cette fonctionnalité — elle est déjà complète.

## 6. Médaillons des 12 signes

**État actuel** : les 12 illustrations sont encodées en base64 directement dans `index.html` (~180 Ko au total). Ça fonctionne très bien pour l'instant.

**Optionnel plus tard** : si le poids du fichier devient un problème, les déplacer vers un CDN/dossier d'assets séparé plutôt que de les garder en base64 inline — mais ce n'est pas urgent, ce n'est pas un bug.

---

## Ce qui NE nécessite PAS de backend (déjà fini)
- Navigation entre les 5 écrans
- Roue interactive (clic + glisser tactile)
- Menu / Profil (ouverture, fermeture, overlay)
- Animation, identité visuelle Gold Royal
- Accessibilité de base (focus clavier, aria-labels, Échap pour fermer)

---

## Correctif livré (28/08) : restauration du signe après rafraîchissement

Le signe choisi sur la roue (index.html) n'était pas restauré après un F5 : au
rechargement, l'app retombait toujours sur "Poissons" par défaut alors que le
signe était bien enregistré dans `localStorage` (`astroGalacticSign`), simplement
jamais relu au chargement. Corrigé :
- `currentSign()` lit désormais `localStorage.getItem('astroGalacticSign')` en
  repli avant le défaut "Poissons".
- Nouvelle fonction `markWheelSelection(sign)` : restaure visuellement la classe
  `is-selected` sur le bon label de la roue au chargement (et après chaque
  régénération des labels au resize, où elle était perdue).
- Vérifié : affinité, texte détaillé, les 4 stats et les 3 éléments chanceux se
  remettent bien à jour avec le signe restauré ; les Favoris/Historique (Mon
  espace) enregistrent aussi le bon signe après refresh (ils dépendaient du
  même état visuel de la roue).
- Petit durcissement en prime : garde `if(!ctx) return` sur le starfield des 5
  pages, au cas où `canvas.getContext('2d')` échouerait sur un navigateur
  atypique (aucun changement de comportement dans un navigateur normal).

Une suite de tests automatisés (jsdom) a été ajoutée dans `test/run-tests.js` :
elle vérifie la restauration du signe pour les 12 signes, l'absence d'erreurs
console sur les 5 pages, les boutons/menus/Premium/Mon espace/Favoris/Historique,
et un resize mobile (375×667). Pour la relancer : `npm install jsdom --no-save`
puis `node test/run-tests.js` à la racine du projet.
