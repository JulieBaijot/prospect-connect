Je vais corriger l’orientation trop “SST secourisme” pour refléter ton activité réelle : formation et conseil en santé/sécurité au travail, avec une logique commerciale plus ouverte et adaptable.

## Objectif

Transformer le playbook actuel en approche “prévention / santé-sécurité au travail” qui permet de détecter plusieurs types de besoins :
- formations SST FI / MAC,
- DUERP et plan d’actions prévention,
- QVCT / RPS / conditions de travail,
- SSCT pour CSE,
- accompagnement réglementaire,
- conseil et formations sur mesure.

## Changements prévus

### 1. Repositionner les offres et catégories
Je remplacerai les libellés trop centrés SST par des intitulés plus larges.

Exemples :
- “B – Socle SST” deviendra plutôt “B – Socle prévention” ou équivalent.
- Les offres proposées évolueront vers :
  - “Formation SST”
  - “DUERP”
  - “QVCT / RPS”
  - “SSCT / CSE”
  - “Conseil prévention”
  - “Sur mesure”

Je garderai la compatibilité avec les données existantes autant que possible pour éviter de casser les prospects déjà créés.

### 2. Réécrire les nœuds du process commercial
Le process ne partira plus du principe que le besoin est forcément SST. Il suivra plutôt une logique de diagnostic :

```text
J1 Premier contact
  → Identifier le bon interlocuteur prévention / RH / direction / CSE
  → Ouvrir sur les sujets santé-sécurité au sens large

J2 Relance douce
  → Comprendre qui pilote les sujets formation, DUERP, prévention, QVCT, CSE

J4 Qualification besoin
  → Identifier la porte d’entrée : SST, DUERP, QVCT, SSCT, audit, sur mesure

J6 Apport de valeur
  → Envoyer un angle utile selon le sujet détecté : obligation DUERP, renouvellement SST, SSCT, plan prévention, QVCT

J10 Demande RDV
  → Proposer un diagnostic court plutôt qu’un rendez-vous “SST”

J15 Proposition
  → Transformer en devis, accompagnement, plan d’action ou formation ciblée

J21 Reprise / archivage
  → Garder une relance longue sur les fenêtres réglementaires ou budgétaires
```

### 3. Adapter les scripts d’appel
Les scripts seront reformulés pour être moins restrictifs.

Par exemple, au lieu de :
“Je voulais vérifier qui pilote les formations sécurité chez vous et voir si le sujet SST est d'actualité…”

Je passerai sur une formulation du type :
“Je voulais identifier la personne qui pilote les sujets formation, prévention et santé-sécurité au travail chez vous : SST, DUERP, QVCT, CSE ou besoins sur mesure.”

### 4. Adapter les issues des nœuds
Les boutons d’issue seront également élargis.

Exemples :
- “Qualification SST” deviendra “Qualification prévention”.
- “Sujet SST identifié” deviendra “Besoin prévention identifié”.
- “Besoin urgent” pourra couvrir DUERP à mettre à jour, demande CSE, tension QVCT, renouvellement formation, audit ou accompagnement.
- “Déjà couvert” gardera une relance future, mais sans présumer d’un prestataire SST uniquement.

### 5. Mettre à jour les intitulés visibles dans l’app
Je mettrai à jour les endroits où l’app affiche encore “PRM SST” ou “freelance SST” pour refléter une activité plus large :
- titres des pages,
- description de l’application,
- en-tête du cockpit,
- métadonnées des pages,
- calendrier de RDV par défaut.

Exemple : “PRM Santé-Sécurité” ou “PRM Prévention SST” selon le ton retenu dans l’app.

## Points techniques

Fichiers concernés :
- `src/lib/prm.ts` : types d’offres, catégories, playbook nodes, scripts, priorisation, titre calendrier.
- `src/routes/process.tsx` : titre/description de la page Process.
- `src/routes/session-appels.tsx` : titres et descriptions de la session d’appels.
- `src/routes/prospects.tsx`, `src/routes/integration-prospects.tsx`, `src/routes/journal.tsx`, `src/routes/stats.tsx`, `src/routes/__root.tsx`, `src/components/prm/AppLayout.tsx` : libellés visibles et valeurs par défaut encore trop centrées SST.

Je ne prévois pas de migration de base de données pour cette correction immédiate, car les colonnes existantes stockent ces valeurs en texte. L’objectif est d’abord de rendre le process et l’interface cohérents avec ton positionnement réel.

## Résultat attendu

Après modification, l’app ne donnera plus l’impression d’être un outil uniquement pour vendre des formations SST. Elle deviendra un cockpit de prospection pour ton offre globale : formation, conseil et accompagnement en santé-sécurité au travail, avec la SST comme une porte d’entrée parmi d’autres.