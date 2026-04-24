# 🚀 Démarrage Rapide - Tests GPS Clients

> **Objectif** : Tester la fonctionnalité de gestion des coordonnées GPS des clients en 5 minutes.

---

## ⚡ Test Ultra-Rapide (2 minutes)

### 1. Ouvrir l'Application
```
http://localhost:4200
```

### 2. Aller à la Page Clients
Menu latéral → **"Clients"** ou **"Customers"**

### 3. Créer un Client TEST

Cliquer **"Ajouter"** et remplir :

**Test A - Avec GPS (doit être BLANC) :**
```
Nom: Test GPS Tunis
Matricule: TEST-GPS-001
Adresse: Avenue Habib Bourguiba, Tunis, Tunisie
Téléphone: +216 71 111 111
Email: test@gps.com
```

**Test B - Sans GPS (doit être ROUGE 🔴) :**
```
Nom: Test Sans GPS
Matricule: TEST-NOGPS-002
Adresse: Rue Imaginaire 999
Téléphone: +216 71 222 222
Email: nogps@test.com
```

### 4. Vérifier le Résultat

| Résultat | Signification |
|----------|---------------|
| ⚪ Ligne BLANCHE | ✅ GPS détecté automatiquement |
| 🔴 Ligne ROUGE + ⚠️ | ❌ GPS non trouvé (adresse invalide) |

---

## 📋 Tests Approfondis

Choisissez votre méthode préférée :

### Option 1 : Guide Complet Manuel
📖 Lire : [`CUSTOMER_GPS_TESTING_GUIDE.md`](./CUSTOMER_GPS_TESTING_GUIDE.md)
- 10 scénarios détaillés
- Vérifications pas à pas
- Checklist de validation

### Option 2 : Script SQL Automatisé
```sql
-- Ouvrir SSMS ou Azure Data Studio
-- Exécuter : scripts/test-customer-gps.sql
```
✅ Crée 5 clients de test  
✅ Vérifie les coordonnées  
✅ Affiche statistiques  

### Option 3 : Script PowerShell API
```powershell
cd scripts
.\Test-CustomerGpsApi.ps1
```
✅ Teste 6 endpoints API  
✅ Valide géocodage automatique  
✅ Vérifie mises à jour  

---

## 🎯 Points Clés à Vérifier

### Backend (.NET)
Dans la console du backend, vous devriez voir :
```
✅ Customer 'Test GPS Tunis' auto-geocoded: 36.8065, 10.1815
⚠️ Could not geocode address for customer 'Test Sans GPS': Rue Imaginaire 999...
```

### Frontend (Angular)
- ⚪ Client avec GPS → Fond normal
- 🔴 Client sans GPS → Fond rouge + icône ⚠️
- Au survol d'une ligne rouge → Rouge plus foncé

### Base de Données
```sql
SELECT Name, Latitude, Longitude FROM Customers 
WHERE Matricule LIKE 'TEST-%';
```

Résultat attendu :
```
Name              | Latitude | Longitude
------------------|----------|----------
Test GPS Tunis    | 36.8065  | 10.1815
Test Sans GPS     | NULL     | NULL
```

---

## 🐛 Problèmes Fréquents

### "Le géocodage ne fonctionne pas"
**Solution :**
```bash
# Tester l'API Nominatim
curl "https://nominatim.openstreetmap.org/search?q=Tunis&format=json&limit=1"
```
Si ça ne répond pas → Problème de connexion Internet

### "La ligne reste blanche même sans GPS"
**Solution :**
1. Ouvrir DevTools (F12)
2. Recharger la page (Ctrl+F5)
3. Vérifier que `latitude` et `longitude` sont `null` dans la réponse API

### "Erreur 401 Unauthorized"
**Solution :**
- Se déconnecter et reconnecter
- Vérifier que le token JWT est valide

---

## 📊 Validation Finale

Après les tests, répondez à ces questions :

- [ ] Les clients avec adresse tunisienne valide ont-ils des coordonnées GPS ?
- [ ] Les clients sans adresse ou adresse invalide sont-ils affichés en ROUGE ?
- [ ] La modification d'une adresse met-elle à jour les coordonnées ?
- [ ] L'import QAD fonctionne-t-il (si configuré) ?

**Si OUI à tout** → ✅ Fonctionnalité VALIDÉE

---

## 📚 Documentation Complète

Pour plus de détails :
- 📘 [`CUSTOMER_GPS_FEATURE_SUMMARY.md`](./CUSTOMER_GPS_FEATURE_SUMMARY.md) - Documentation technique complète
- 🧪 [`CUSTOMER_GPS_TESTING_GUIDE.md`](./CUSTOMER_GPS_TESTING_GUIDE.md) - Guide de test détaillé
- 💾 [`scripts/test-customer-gps.sql`](./scripts/test-customer-gps.sql) - Script SQL
- ⚡ [`scripts/Test-CustomerGpsApi.ps1`](./scripts/Test-CustomerGpsApi.ps1) - Script PowerShell

---

## 🎉 Félicitations !

Vous avez testé avec succès la gestion des coordonnées GPS des clients.

**Prochaines étapes :**
1. Former les utilisateurs finaux
2. Surveiller le taux de couverture GPS (> 80% recommandé)
3. Corriger manuellement les clients en rouge si nécessaire
4. Envisager un géocodage batch pour les anciens clients

---

**Questions ?** Consulter la documentation complète ou contacter l'équipe technique.
