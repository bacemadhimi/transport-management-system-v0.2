# 📍 Gestion des Coordonnées GPS des Clients - Documentation Complète

## 🎯 Vue d'Ensemble

Cette fonctionnalité permet au système TMS de **détecter automatiquement**, **stocker** et **afficher visuellement** les coordonnées GPS des clients pour optimiser la planification des livraisons et le suivi géographique.

---

## ✨ Fonctionnalités Implémentées

### 1. Détection Automatique (Backend)

**Lors de la création ou modification d'un client :**
- ✅ Le système appelle l'API **Nominatim OpenStreetMap** pour géocoder l'adresse
- ✅ Restriction géographique à la **Tunisie** (`countrycodes=tn`)
- ✅ Stockage automatique de `Latitude` et `Longitude` dans la base de données
- ✅ Gestion d'erreur robuste : le client est créé même si le géocodage échoue

**Code concerné :** [`CustomerController.cs`](file://c:\Users\khamm\transport-management-system-v0.2\backend\TransportManagementSystem\Controllers\CustomerController.cs#L235-L260)

```csharp
// Auto-geocode address if coordinates are missing and address is provided
if ((!customer.Latitude.HasValue || !customer.Longitude.HasValue) && !string.IsNullOrWhiteSpace(customer.Address))
{
    try
    {
        var geocodeResult = await GeocodeAddress(customer.Address);
        if (geocodeResult != null && geocodeResult.ContainsKey("lat") && geocodeResult.ContainsKey("lon"))
        {
            customer.Latitude = Convert.ToDouble(geocodeResult["lat"]);
            customer.Longitude = Convert.ToDouble(geocodeResult["lon"]);
            Console.WriteLine($"✅ Customer '{customer.Name}' auto-geocoded: {customer.Latitude}, {customer.Longitude}");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error geocoding customer '{customer.Name}': {ex.Message}");
    }
}
```

### 2. Affichage Visuel (Frontend)

**Dans la liste des clients :**
- ⚪ **Fond BLANC/Normal** : Client AVEC coordonnées GPS valides
- 🔴 **Fond ROUGE + Icône ⚠️** : Client SANS coordonnées GPS

**Code concerné :** 
- [`table.ts`](file://c:\Users\khamm\transport-management-system-v0.2\frontend\transport-management-system-web\src\app\components\table\table.ts#L162-L175) - Logique de détection
- [`table.html`](file://c:\Users\khamm\transport-management-system-v0.2\frontend\transport-management-system-web\src\app\components\table\table.html#L87) - Application de la classe CSS
- [`table.scss`](file://c:\Users\khamm\transport-management-system-v0.2\frontend\transport-management-system-web\src\app\components\table\table.scss#L319-L344) - Styles visuels

```typescript
shouldHighlightMissingGps(row: any): boolean {
  if (row && typeof row === 'object') {
    if ('latitude' in row || 'longitude' in row) {
      const hasLat = row.latitude != null && !isNaN(row.latitude);
      const hasLon = row.longitude != null && !isNaN(row.longitude);
      return !(hasLat && hasLon); // true = afficher en rouge
    }
  }
  return false;
}
```

### 3. Import depuis QAD (ERP Externe)

**Lors de la synchronisation ERP :**
- ✅ Les clients importés de QAD subissent le même processus de géocodage
- ✅ Si adresse présente → tentative de géocodage automatique
- ✅ Si géocodage échoue → affichage en rouge pour correction manuelle
- ✅ Filtre "Source" permet de distinguer TMS vs QAD

---

## 🧪 Comment Tester en Pratique

### Méthode 1 : Test Manuel via Interface Web

**Scénario A : Création avec adresse valide**
1. Ouvrir `http://localhost:4200` → Page "Clients"
2. Cliquer "Ajouter"
3. Remplir :
   - Nom : `Client Test Tunis`
   - Matricule : `CLI-TEST-001`
   - Adresse : `Avenue Habib Bourguiba, Tunis 1000, Tunisie`
   - Téléphone : `+216 71 123 456`
4. Sauvegarder
5. **Résultat attendu** : Ligne affichée en BLANC (GPS détecté)

**Scénario B : Création avec adresse invalide**
1. Cliquer "Ajouter"
2. Remplir :
   - Nom : `Client Sans GPS`
   - Matricule : `CLI-NOGPS-001`
   - Adresse : `Rue Imaginaire 999, Ville Inexistante`
3. Sauvegarder
4. **Résultat attendu** : Ligne affichée en 🔴 ROUGE avec icône ⚠️

**Scénario C : Correction d'un client sans GPS**
1. Identifier une ligne rouge dans le tableau
2. Cliquer "Modifier" (icône crayon vert)
3. Corriger l'adresse avec une adresse tunisienne valide
4. Sauvegarder
5. **Résultat attendu** : La ligne passe du ROUGE au BLANC après rafraîchissement

---

### Méthode 2 : Script SQL Automatisé

**Emplacement :** [`scripts/test-customer-gps.sql`](file://c:\Users\khamm\transport-management-system-v0.2\scripts\test-customer-gps.sql)

**Exécution :**
```sql
-- Ouvrir SSMS ou Azure Data Studio
-- Se connecter à la base TransportManagementSystem
-- Exécuter le script complet

-- Le script va :
-- 1. Nettoyer les anciennes données de test
-- 2. Créer 5 clients de test (avec/sans GPS, TMS/QAD)
-- 3. Vérifier les coordonnées stockées
-- 4. Simuler la logique frontend (lignes rouges)
-- 5. Afficher un rapport statistique
```

**Résultats attendus :**
```
Total clients de test : 5
Avec coordonnées GPS  : 3
Sans coordonnées GPS  : 2
Taux de couverture    : 60.00%

Détails par client :
# | Name                        | GPS | Display
1 | Client Test Tunis Centre    | ✅  | ⚪ Normal
2 | Client Sans Coordonnées     | ❌  | 🔴 Rouge
3 | Client Test Sfax            | ✅  | ⚪ Normal
4 | Client QAD Sousse           | ✅  | ⚪ Normal
5 | Client QAD Sans GPS         | ❌  | 🔴 Rouge
```

---

### Méthode 3 : Script PowerShell API

**Emplacement :** [`scripts/Test-CustomerGpsApi.ps1`](file://c:\Users\khamm\transport-management-system-v0.2\scripts\Test-CustomerGpsApi.ps1)

**Prérequis :**
- Token JWT valide
- Backend démarré sur `https://localhost:5001`

**Exécution :**
```powershell
# Ouvrir PowerShell en mode Administrateur
cd c:\Users\khamm\transport-management-system-v0.2\scripts

# Modifier le token dans le script
notepad Test-CustomerGpsApi.ps1
# Remplacer : $token = "VOTRE_TOKEN_JWT_ICI"

# Exécuter
.\Test-CustomerGpsApi.ps1
```

**Le script teste automatiquement :**
1. ✅ Création d'un client avec adresse valide (Tunis)
2. ✅ Création d'un client avec adresse invalide
3. ✅ Récupération de la liste complète
4. ✅ Filtrage des clients avec coordonnées
5. ✅ Modification d'un client (ajout d'adresse)
6. ✅ Vérification détaillée d'un client

---

## 📊 Validation des Résultats

### Dans l'Interface Web

**Vérifications visuelles :**
- [ ] Clients avec GPS → Fond blanc/gris normal
- [ ] Clients sans GPS → Fond rouge clair + bordure gauche rouge
- [ ] Icône ⚠️ visible sur lignes problématiques
- [ ] Au survol d'une ligne rouge → fond rouge plus foncé

**Dans DevTools (F12) :**
```html
<!-- Client SANS GPS -->
<tr class="mat-row row-missing-gps">
  <td>...</td>
</tr>

<!-- Client AVEC GPS -->
<tr class="mat-row">
  <td>...</td>
</tr>
```

### Dans la Base de Données

**Requête de vérification :**
```sql
SELECT 
    Id,
    Name,
    Address,
    Latitude,
    Longitude,
    CASE 
        WHEN Latitude IS NOT NULL AND Longitude IS NOT NULL 
        THEN '✅ HAS GPS' 
        ELSE '❌ MISSING' 
    END AS Status
FROM Customers
ORDER BY 
    CASE WHEN Latitude IS NULL THEN 0 ELSE 1 END;
```

### Dans les Logs Backend

**Succès de géocodage :**
```
✅ Customer 'Client Test Tunis' auto-geocoded: 36.8065, 10.1815
```

**Échec de géocodage :**
```
⚠️ Could not geocode address for customer 'Client Sans GPS': Rue Imaginaire 999...
```

---

## 🔧 Dépannage

### Problème : Géocodage ne fonctionne pas

**Vérifications :**
```bash
# Tester l'API Nominatim directement
curl "https://nominatim.openstreetmap.org/search?q=Tunis&format=json&limit=1&countrycodes=tn"
```

**Solutions :**
1. Vérifier la connectivité Internet
2. Vérifier que l'adresse est bien formatée
3. Consulter les logs backend pour erreurs détaillées
4. Tester avec une adresse simple : `Tunis, Tunisie`

### Problème : Style rouge non appliqué

**Vérifications :**
1. Ouvrir DevTools (F12) → Onglet "Elements"
2. Clic droit sur une ligne sans GPS → "Inspecter"
3. Vérifier la présence de la classe `row-missing-gps`

**Si absente :**
- Vérifier que `latitude` et `longitude` sont bien `null` dans les données
- Vérifier la méthode [`shouldHighlightMissingGps()`](file://c:\Users\khamm\transport-management-system-v0.2\frontend\transport-management-system-web\src\app\components\table\table.ts#L162-L175)
- Recharger la page (Ctrl+F5)

### Problème : Erreur 401 Unauthorized

**Solution :**
- Se reconnecter dans l'application
- Vérifier que le token JWT n'a pas expiré
- Rafraîchir la page (F5)

---

## 📈 Statistiques et Monitoring

### Requête SQL de Monitoring

```sql
-- Taux de couverture GPS par source
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

**Objectif :** Maintenir un taux de couverture > 80%

---

## 🚀 Améliorations Futures

### 1. Géocodage Batch
Créer un endpoint pour relancer le géocodage de tous les clients sans GPS :
```csharp
[HttpPost("geocode-all-missing")]
public async Task<IActionResult> GeocodeAllMissing()
{
    var customersWithoutGps = await dbContext.Customers
        .Where(c => c.Latitude == null || c.Longitude == null)
        .ToListAsync();
    
    int successCount = 0;
    foreach (var customer in customersWithoutGps)
    {
        if (!string.IsNullOrWhiteSpace(customer.Address))
        {
            var coords = await GeocodeAddress(customer.Address);
            if (coords != null)
            {
                customer.Latitude = Convert.ToDouble(coords["lat"]);
                customer.Longitude = Convert.ToDouble(coords["lon"]);
                successCount++;
            }
        }
    }
    
    await dbContext.SaveChangesAsync();
    return Ok(new { Processed = customersWithoutGps.Count, Success = successCount });
}
```

### 2. Correction Manuelle sur Carte
Interface permettant de :
- Afficher une carte Leaflet
- Cliquer pour placer un marker
- Enregistrer les coordonnées manuellement

### 3. Historique des Modifications
Tracker les changements de coordonnées :
```sql
CREATE TABLE CustomerGpsHistory (
    Id INT IDENTITY PRIMARY KEY,
    CustomerId INT FOREIGN KEY REFERENCES Customers(Id),
    OldLatitude FLOAT NULL,
    OldLongitude FLOAT NULL,
    NewLatitude FLOAT NULL,
    NewLongitude FLOAT NULL,
    ChangedAt DATETIME DEFAULT GETUTCDATE(),
    ChangedBy NVARCHAR(100)
);
```

### 4. Validation Multi-Pays
Supprimer la restriction `countrycodes=tn` si expansion internationale prévue.

### 5. Cache de Géocodage
Mettre en cache les résultats pour éviter appels répétés à l'API :
```csharp
private static ConcurrentDictionary<string, Dictionary<string, string>> _geocodeCache = new();
```

---

## 📚 Références Techniques

### API Utilisées

**Nominatim OpenStreetMap**
- URL : `https://nominatim.openstreetmap.org/search`
- Documentation : https://nominatim.org/release-docs/latest/api/Search/
- Rate Limiting : 1 requête/seconde
- User-Agent requis : `TMS-App/1.0` (déjà configuré)

### Fichiers Clés

| Fichier | Rôle |
|---------|------|
| [`CustomerController.cs`](file://c:\Users\khamm\transport-management-system-v0.2\backend\TransportManagementSystem\Controllers\CustomerController.cs) | Backend - Géocodage automatique |
| [`Customer.cs`](file://c:\Users\khamm\transport-management-system-v0.2\backend\TransportManagementSystem\Entity\Customer.cs) | Entity - Définition Latitude/Longitude |
| [`CustomerDto.cs`](file://c:\Users\khamm\transport-management-system-v0.2\backend\TransportManagementSystem\Models\CustomerDto.cs) | DTO - Transfert des coordonnées |
| [`customer.ts`](file://c:\Users\khamm\transport-management-system-v0.2\frontend\transport-management-system-web\src\app\pages\customer\customer.ts) | Frontend - Méthode `hasValidGpsCoordinates()` |
| [`table.ts`](file://c:\Users\khamm\transport-management-system-v0.2\frontend\transport-management-system-web\src\app\components\table\table.ts) | Composant Table - Méthode `shouldHighlightMissingGps()` |
| [`table.scss`](file://c:\Users\khamm\transport-management-system-v0.2\frontend\transport-management-system-web\src\app\components\table\table.scss) | Styles - Classe `.row-missing-gps` |

### Scripts de Test

| Script | Usage |
|--------|-------|
| [`CUSTOMER_GPS_TESTING_GUIDE.md`](file://c:\Users\khamm\transport-management-system-v0.2\CUSTOMER_GPS_TESTING_GUIDE.md) | Guide de test manuel complet |
| [`scripts/test-customer-gps.sql`](file://c:\Users\khamm\transport-management-system-v0.2\scripts\test-customer-gps.sql) | Test automatisé via SQL |
| [`scripts/Test-CustomerGpsApi.ps1`](file://c:\Users\khamm\transport-management-system-v0.2\scripts\Test-CustomerGpsApi.ps1) | Test automatisé via API |

---

## ✅ Checklist de Validation Finale

Avant de considérer la fonctionnalité comme prête pour la production :

### Backend
- [x] Géocodage automatique implémenté
- [x] Gestion d'erreur robuste (création sans GPS possible)
- [x] Logs clairs et informatifs
- [x] Endpoint `/api/Customer/with-coordinates` fonctionnel
- [x] Mise à jour des coordonnées lors de modification

### Frontend
- [x] Méthode `hasValidGpsCoordinates()` opérationnelle
- [x] Classe CSS `.row-missing-gps` appliquée dynamiquement
- [x] Icône ⚠️ visible sur lignes problématiques
- [x] Style rouge conforme aux spécifications
- [x] Rafraîchissement automatique après modifications

### Tests
- [x] Guide de test manuel créé
- [x] Script SQL de validation disponible
- [x] Script PowerShell API disponible
- [x] Scénarios de test couvrant tous les cas

### Documentation
- [x] Documentation technique complète
- [x] Guide d'utilisation pratique
- [x] Procédures de dépannage
- [x] Références aux fichiers clés

---

## 🎓 Formation Utilisateurs

### Message à Communiquer aux Utilisateurs

> **"Les lignes ROUGES indiquent des clients sans coordonnées GPS.**
> 
> **Pour corriger :**
> 1. Cliquez sur "Modifier" (icône crayon)
> 2. Vérifiez/corrigez l'adresse
> 3. Assurez-vous que l'adresse inclut la ville et la Tunisie
> 4. Sauvegardez
> 5. La ligne devrait devenir BLANCHE après rafraîchissement
> 
> **Exemples de bonnes adresses :**
> - ✅ `Avenue Habib Bourguiba, Tunis 1000, Tunisie`
> - ✅ `Rue de la République, Sfax 3000`
> - ❌ `Rue 123` (trop vague)
> - ❌ `Adresse inconnue` (invalide)"

---

## 📞 Support

Pour toute question ou problème :
1. Consulter ce document
2. Exécuter les scripts de test
3. Vérifier les logs backend
4. Contacter l'équipe technique avec :
   - Captures d'écran
   - Logs d'erreur
   - Matricule du client concerné

---

**Document créé le :** 2026-04-24  
**Version :** 1.0  
**Statut :** ✅ PRÊT POUR TESTS ET VALIDATION
