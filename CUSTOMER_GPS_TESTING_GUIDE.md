# 🧪 Guide de Test Pratique - Gestion GPS des Clients

> **Objectif** : Valider que le système détecte, stocke et affiche correctement les coordonnées GPS des clients.

---

## 📋 Prérequis

### 1. Environnement de Développement
- [ ] Backend (.NET 9) démarré sur `https://localhost:5001` ou `http://localhost:5000`
- [ ] Frontend Angular démarré sur `http://localhost:4200`
- [ ] Base de données accessible et migrée
- [ ] Compte utilisateur avec permission `CUSTOMER_ADD`, `CUSTOMER_EDIT` connecté

### 2. Outils Nécessaires
- [ ] Navigateur web (Chrome/Firefox recommandé)
- [ ] DevTools ouverts (F12) pour voir la console
- [ ] (Optionnel) Postman/Insomnia pour tests API directs
- [ ] (Optionnel) SQL Server Management Studio ou Azure Data Studio

---

## 🎯 Scénario 1 : Création d'un Client avec Adresse Valide (Tunisie)

### Étapes à Suivre

1. **Ouvrir l'application web**
   ```
   http://localhost:4200
   ```

2. **Naviguer vers la page Clients**
   - Menu latéral → "Gestion des Clients" ou "Customers"

3. **Cliquer sur le bouton "Ajouter"** (bouton vert en haut à droite)

4. **Remplir le formulaire** avec ces données TEST :
   ```
   Nom: Client Test Tunis Centre
   Matricule: CLI-TUN-TEST-001
   Adresse: Avenue Habib Bourguiba, Tunis 1000, Tunisie
   Téléphone: +216 71 123 456
   Email: test.tunis@example.com
   Contact: Mohamed Ben Ali
   ```

5. **Soumettre le formulaire** (cliquer sur "Enregistrer" ou "Save")

### ✅ Résultats Attendus

#### Interface Utilisateur :
- [ ] Message de succès affiché ("Customer created successfully")
- [ ] Le modal se ferme automatiquement
- [ ] La liste des clients se rafraîchit
- [ ] **Le nouveau client apparaît avec fond BLANC** (pas en rouge)

#### Console Backend (terminal .NET) :
Rechercher ce message :
```
✅ Customer 'Client Test Tunis Centre' auto-geocoded: 36.8065, 10.1815
```

#### Console Frontend (F12 → Console) :
- [ ] Aucune erreur JavaScript
- [ ] Requête POST `/api/Customer` avec statut 201 Created

#### Vérification dans le Tableau :
- [ ] La ligne du client s'affiche NORMALEMENT (fond blanc/gris clair)
- [ ] Pas d'icône ⚠️ à gauche
- [ ] Colonnes Latitude/Longitude visibles si affichées

---

## 🔴 Scénario 2 : Création d'un Client avec Adresse Invalide

### Étapes à Suivre

1. **Cliquer sur "Ajouter"** à nouveau

2. **Remplir avec une adresse inexistante** :
   ```
   Nom: Client Sans Coordonnées
   Matricule: CLI-NOGPS-002
   Adresse: Rue Imaginaire 999, Ville Inexistante 00000
   Téléphone: +216 71 999 999
   Email: nogps@example.com
   ```

3. **Soumettre**

### ❌ Résultats Attendus

#### Interface Utilisateur :
- [ ] Message de succès affiché (le client EST créé malgré l'absence de GPS)
- [ ] Le modal se ferme
- [ ] La liste se rafraîchit

#### Console Backend :
Rechercher ce message d'avertissement :
```
⚠️ Could not geocode address for customer 'Client Sans Coordonnées': Rue Imaginaire 999...
```

#### Vérification dans le Tableau :
- [ ] 🔴 **La ligne du client s'affiche en ROUGE** (fond rouge très clair)
- [ ] ⚠️ **Icône d'avertissement visible** à gauche de la première colonne
- [ ] Bordure gauche rouge de 4px
- [ ] Au survol : fond rouge légèrement plus foncé

---

## 🔄 Scénario 3 : Modification d'un Client sans GPS → Ajout d'Adresse Valide

### Étapes à Suivre

1. **Identifier le client "Client Sans Coordonnées"** (ligne rouge) dans le tableau

2. **Cliquer sur l'icône "Modifier"** (crayon vert) sur cette ligne

3. **Dans le modal, modifier l'adresse** :
   ```
   Ancienne adresse: Rue Imaginaire 999, Ville Inexistante 00000
   Nouvelle adresse: Avenue de la Liberté, Sfax 3000, Tunisie
   ```

4. **Sauvegarder**

### ✅ Résultats Attendus

#### Console Backend :
```
✅ Customer 'Client Sans Coordonnées' auto-geocoded on update: 34.7406, 10.7603
```

#### Interface :
- [ ] Message de succès "Customer updated successfully"
- [ ] Après rafraîchissement : **la ligne passe du ROUGE au BLANC**
- [ ] L'icône ⚠️ disparaît

---

## 📥 Scénario 4 : Importation depuis QAD (si configuré)

### Étapes à Suivre

1. **Naviguer vers "Sync ERP"** dans le menu

2. **Cliquer sur "Synchroniser"**

3. **Attendre la fin du processus** (barre de progression à 100%)

4. **Retourner à la page "Clients"**

5. **Utiliser le filtre "Source"** en haut :
   - Sélectionner "QAD"

### ✅ Résultats Attendus

#### Tableau filtré :
- [ ] Seuls les clients importés de QAD s'affichent
- [ ] Colonne "Source" montre "QAD" (badge rouge)
- [ ] Certains clients peuvent être en ROUGE (sans GPS)
- [ ] D'autres sont en BLANC (géocodage réussi)

#### Console Backend :
Messages de géocodage pour chaque client QAD avec adresse :
```
✅ Customer '[Nom Client QAD]' auto-geocoded: ...
```
ou
```
⚠️ Could not geocode address for customer '[Nom Client QAD]'...
```

---

## 🔍 Scénario 5 : Vérification Base de Données

### Requête SQL à Exécuter

Ouvrir SSMS/Azure Data Studio et exécuter :

```sql
-- Vérifier les clients créés lors des tests
SELECT 
    Id,
    Name,
    Matricule,
    Address,
    Latitude,
    Longitude,
    SourceSystem,
    CASE 
        WHEN Latitude IS NOT NULL AND Longitude IS NOT NULL 
        THEN '✅ HAS GPS' 
        ELSE '❌ MISSING GPS' 
    END AS GpsStatus,
    CreatedAt
FROM Customers
WHERE Matricule IN ('CLI-TUN-TEST-001', 'CLI-NOGPS-002')
ORDER BY CreatedAt DESC;
```

### ✅ Résultats Attendus

| Id | Name | Latitude | Longitude | GpsStatus |
|----|------|----------|-----------|-----------|
| X | Client Test Tunis Centre | 36.8065 | 10.1815 | ✅ HAS GPS |
| Y | Client Sans Coordonnées | NULL | NULL | ❌ MISSING GPS |

**Après modification (Scénario 3) :**
```sql
-- Re-vérifier après modification
SELECT Latitude, Longitude 
FROM Customers 
WHERE Matricule = 'CLI-NOGPS-002';
-- Doit retourner : Latitude ≈ 34.7406, Longitude ≈ 10.7603
```

---

## 📊 Scénario 6 : Statistiques de Couverture GPS

### Requête SQL

```sql
SELECT 
    SourceSystem,
    COUNT(*) AS TotalCustomers,
    SUM(CASE WHEN Latitude IS NOT NULL AND Longitude IS NOT NULL THEN 1 ELSE 0 END) AS WithGPS,
    SUM(CASE WHEN Latitude IS NULL OR Longitude IS NULL THEN 1 ELSE 0 END) AS WithoutGPS,
    ROUND(
        100.0 * SUM(CASE WHEN Latitude IS NOT NULL AND Longitude IS NOT NULL THEN 1 ELSE 0 END) / 
        NULLIF(COUNT(*), 0), 
        2
    ) AS CoveragePercentage
FROM Customers
GROUP BY SourceSystem
ORDER BY SourceSystem;
```

### ✅ Résultats Attendus

| SourceSystem | TotalCustomers | WithGPS | WithoutGPS | CoveragePercentage |
|--------------|----------------|---------|------------|--------------------|
| TMS | 50 | 45 | 5 | 90.00 |
| QAD | 30 | 20 | 10 | 66.67 |

---

## 🧪 Scénario 7 : Test API Direct (Postman/cURL)

### Test 1 : Créer un client via API

```bash
curl -X POST https://localhost:5001/api/Customer \
  -H "Authorization: Bearer VOTRE_TOKEN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test Client Sousse",
    "matricule": "API-TEST-SOU-001",
    "address": "Avenue Léopold Sédar Senghor, Sousse 4000, Tunisie",
    "phone": "+216 73 123 456",
    "email": "api.sousse@test.com",
    "contact": "Test API"
  }'
```

### ✅ Réponse Attendue

```json
{
  "success": true,
  "message": "Customer created successfully",
  "data": {
    "id": 123,
    "name": "API Test Client Sousse",
    "matricule": "API-TEST-SOU-001",
    "latitude": 35.8256,
    "longitude": 10.6369,
    "sourceSystem": "TMS",
    ...
  }
}
```

### Test 2 : Récupérer les clients AVEC coordonnées

```bash
curl -X GET https://localhost:5001/api/Customer/with-coordinates \
  -H "Authorization: Bearer VOTRE_TOKEN_JWT"
```

### ✅ Réponse Attendue

```json
[
  {
    "id": 123,
    "name": "API Test Client Sousse",
    "geographicalEntities": [
      {
        "latitude": 35.8256,
        "longitude": 10.6369,
        ...
      }
    ]
  },
  ...
]
```

---

## 🎨 Scénario 8 : Validation Visuelle du Style Rouge

### Étapes

1. **Ouvrir DevTools** (F12)
2. **Aller à l'onglet "Elements"** (Chrome) ou "Inspecteur" (Firefox)
3. **Sélectionner une ligne rouge** dans le tableau des clients
4. **Vérifier le HTML généré**

### ✅ Code HTML Attendu

```html
<tr class="mat-row row-missing-gps" ...>
  <td class="mat-cell" ...>
    <!-- Contenu de la cellule -->
  </td>
  ...
</tr>
```

### Vérifications CSS (onglet "Styles" dans DevTools) :

```css
tr.row-missing-gps {
  background-color: rgba(239, 68, 68, 0.08) !important;
  border-left: 4px solid #ef4444 !important;
}

tr.row-missing-gps td {
  color: #991b1b !important;
}

tr.row-missing-gps td:first-child::before {
  content: '⚠️';
  position: absolute;
  left: -20px;
}
```

---

## 📤 Scénario 9 : Export des Données

### Étapes

1. **Sur la page Clients**, cliquer sur l'un des boutons d'export :
   - **XLS** (Excel)
   - **CSV**
   - **PDF**

2. **Ouvrir le fichier téléchargé**

### ✅ Vérifications

#### Fichier Excel/CSV :
- [ ] Toutes les colonnes présentes : ID, Nom, Téléphone, Email, Contact, Entité(s), Matricule, Source
- [ ] Les clients sans GPS ont des cellules vides ou "null" pour Latitude/Longitude (si exportées)
- [ ] Les données sont correctes

#### Fichier PDF :
- [ ] Mise en page correcte
- [ ] Tous les clients listés
- [ ] Pas d'erreurs de génération

---

## ⚡ Scénario 10 : Test de Performance

### Étapes

1. **Créer 10 clients d'affilée** avec différentes adresses tunisiennes valides
2. **Chronométrer le temps de réponse** pour chaque création

### ✅ Résultats Attendus

- [ ] Chaque création prend **moins de 3 secondes** (incluant géocodage)
- [ ] Aucun timeout ou erreur
- [ ] Interface reste réactive pendant le géocodage
- [ ] Pas de blocage UI

### Adresses de Test Rapides :

```
1. Avenue Habib Bourguiba, Tunis
2. Rue de la République, Sfax
3. Avenue Léopold Sédar Senghor, Sousse
4. Rue Mongi Slim, Nabeul
5. Avenue Farhat Hached, Bizerte
6. Rue Ali Belhouane, Kairouan
7. Avenue de l'Indépendance, Gabès
8. Rue Hédi Chaker, Gafsa
9. Avenue Habib Thameur, Monastir
10. Rue Tahar Sfar, Mahdia
```

---

## 🐛 Dépannage Rapide

### Problème : Géocodage ne fonctionne pas

**Vérifications :**
```bash
# Tester l'API Nominatim directement
curl "https://nominatim.openstreetmap.org/search?q=Avenue+Habib+Bourguiba,+Tunis&format=json&limit=1&countrycodes=tn"
```

**Résultat attendu :**
```json
[
  {
    "lat": "36.8065",
    "lon": "10.1815",
    "display_name": "Avenue Habib Bourguiba, Tunis, ..."
  }
]
```

### Problème : Style rouge non appliqué

**Vérifications DevTools :**
1. Clic droit sur une ligne sans GPS → "Inspecter"
2. Vérifier que la classe `row-missing-gps` est présente
3. Si absente : vérifier la méthode `shouldHighlightMissingGps()` dans `table.ts`
4. Vérifier que `row.latitude` et `row.longitude` sont bien `null` ou `undefined`

### Problème : Erreur 401 Unauthorized

**Solution :**
- Se reconnecter dans l'application
- Vérifier que le token JWT est valide
- Rafraîchir la page (F5)

---

## ✅ Checklist de Validation Finale

Cochez chaque élément après test :

### Backend
- [ ] Géocodage automatique fonctionne pour adresses tunisiennes
- [ ] Gestion d'erreur robuste (client créé même sans GPS)
- [ ] Logs console clairs et informatifs
- [ ] API retourne latitude/longitude dans les DTOs
- [ ] Endpoint `/api/Customer/with-coordinates` fonctionnel

### Frontend
- [ ] Méthode `hasValidGpsCoordinates()` retourne valeurs correctes
- [ ] Classe CSS `.row-missing-gps` appliquée dynamiquement
- [ ] Icône ⚠️ visible sur lignes problématiques
- [ ] Style rouge conforme aux spécifications
- [ ] Rafraîchissement automatique après création/modification

### Base de Données
- [ ] Colonnes `Latitude` et `Longitude` acceptent NULL
- [ ] Contraintes de type `double?` respectées
- [ ] Données persistées correctement
- [ ] Index éventuels sur Latitude/Longitude (optionnel)

### Intégration QAD
- [ ] Import QAD déclenche géocodage
- [ ] Clients QAD sans adresse gérés correctement
- [ ] Filtre "Source" fonctionne (TMS vs QAD)

### Performance
- [ ] Temps de réponse < 3s par opération
- [ ] Pas de blocage UI pendant géocodage
- [ ] Rate limiting API Nominatim respecté

### Export
- [ ] Export Excel inclut toutes les données
- [ ] Export CSV formaté correctement
- [ ] Export PDF lisible

---

## 📝 Rapport de Test

Après avoir exécuté tous les scénarios, remplissez ce rapport :

```
Date du test : _______________
Testeur : _______________

Résultats :
✅ Scénario 1 (Création avec GPS) : PASS / FAIL
✅ Scénario 2 (Création sans GPS) : PASS / FAIL
✅ Scénario 3 (Modification) : PASS / FAIL
✅ Scénario 4 (Import QAD) : PASS / FAIL / N/A
✅ Scénario 5 (Vérification BDD) : PASS / FAIL
✅ Scénario 6 (Statistiques) : PASS / FAIL
✅ Scénario 7 (API Direct) : PASS / FAIL / N/A
✅ Scénario 8 (Style Rouge) : PASS / FAIL
✅ Scénario 9 (Export) : PASS / FAIL
✅ Scénario 10 (Performance) : PASS / FAIL

Issues trouvées :
1. _______________________________________
2. _______________________________________
3. _______________________________________

Commentaires :
_________________________________________
_________________________________________
_________________________________________

Conclusion : Fonctionnalité PRÊTE POUR PROD / BESOIN CORRECTIONS
```

---

## 🚀 Prochaines Étapes

Si tous les tests passent :
1. ✅ Documenter la fonctionnalité dans le manuel utilisateur
2. ✅ Former les utilisateurs à l'interprétation des lignes rouges
3. ✅ Prévoir un endpoint batch pour relancer le géocodage des clients existants sans GPS
4. ✅ Ajouter une option de correction manuelle des coordonnées sur une carte interactive

Si des tests échouent :
1. 🐛 Corriger les bugs identifiés
2. 🔄 Re-exécuter les scénarios concernés
3. 📊 Mettre à jour le rapport de test

---

**Bon testing ! 🎉**
