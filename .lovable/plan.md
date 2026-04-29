Tu as confirmé que tu veux ajouter la clé Google Places. La prochaine étape doit se faire via un champ sécurisé, pas en collant la clé dans le chat.

Plan d’action dès que je peux passer à l’implémentation :

1. Demander la clé Google Places dans le gestionnaire de secrets sécurisé
   - Nom du secret attendu : `GOOGLE_PLACES_API_KEY`
   - La clé ne sera jamais affichée dans l’interface ni stockée dans le code.

2. Finaliser l’intégration Google Places côté backend
   - Utiliser la clé uniquement côté serveur.
   - Rechercher le prospect par nom d’entreprise + ville.
   - Récupérer : téléphone, site web, adresse, horaires d’ouverture, identifiant Google Place.

3. Brancher le bouton “Enrichir” dans l’application
   - Sur la base prospects : enrichissement d’un prospect depuis sa fiche/ligne.
   - Dans la session de qualification : enrichissement prospect par prospect.
   - Ne pas écraser les champs déjà renseignés manuellement, sauf si le champ est vide.

4. Ajouter des retours utilisateur propres
   - “Clé Google Places manquante” si le secret n’est pas configuré.
   - “Aucun résultat trouvé” si Google ne trouve pas l’entreprise.
   - “Quota/API indisponible” en cas d’erreur Google.
   - Confirmation visible quand les données ont été ajoutées.

Dès approbation, je demanderai la clé via le mécanisme sécurisé puis j’implémenterai le flux complet.