# 🚀 Setup Rapide - Test Mobile Android

## ⚡ Prochaines Étapes (5 minutes)

### 1️⃣ Trouver Votre Adresse IP

```cmd
ipconfig
```

Notez l'adresse **IPv4** (ex: `192.168.1.100`)

---

### 2️⃣ Configurer l'Environnement Device

**Fichier:** `TMS-MobileApp/src/environments/environment.device.ts`

Remplacez:
```typescript
apiUrl: 'http://192.168.1.100:5191'
```

Par VOTRE adresse IP:
```typescript
apiUrl: 'http://VOTRE_IP_ICI:5191'
```

---

### 3️️ Configurer le Backend pour Écouter sur le Réseau

Le backend écoute déjà sur toutes les interfaces. Vérifiez dans `launchSettings.json`:

**Fichier:** `backend/TransportManagementSystem/Properties/launchSettings.json`

Assurez-vous qu'il contient:
```json
{
  "profiles": {
    "http": {
      "commandName": "Project",
      "launchUrl": "swagger",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      },
      "dotnetRunMessages": true,
      "applicationUrl": "http://0.0.0.0:5191"
    }
  }
}
```

**Si c'est `localhost`, changez-le en `0.0.0.0`**

---

### 4️⃣ Autoriser le Port dans le Pare-feu

**PowerShell (Admin):**
```powershell
New-NetFirewallRule -DisplayName "TMS Backend" -Direction Inbound -LocalPort 5191 -Protocol TCP -Action Allow
```

---

### 5️⃣ Démarrer le Backend

```bash
cd backend/TransportManagementSystem
dotnet run
```

Vérifiez qu'il démarre sur `http://0.0.0.0:5191`

---

### 6️⃣ Build et Déployer sur Android

```bash
cd TMS-MobileApp

# Build avec la config device
ionic build --configuration=device

# Synchroniser
npx cap sync android

# Ouvrir dans Android Studio
npx cap open android
```

**Dans Android Studio:**
1. Sélectionnez votre appareil Android
2. Cliquez sur **Run** ▶️

---

## ✅ Vérification Rapide

### Tester la Connexion depuis le Téléphone

Ouvrez le navigateur Chrome sur votre téléphone et allez à:
```
http://VOTRE_IP:5191/swagger
```

Vous devvez voir la page Swagger du backend.

**Si ça ne marche pas:**
- ❌ Vérifiez l'IP (doit être celle du WiFi, pas Ethernet si les deux existent)
- ❌ Vérifiez que le backend est démarré
- ❌ Vérifiez le pare-feu
- ❌ Vérifiez que téléphone et PC sont sur le même WiFi

---

## 🎯 Résumé des Corrections Appliquées

| Fichier | Correction |
|---------|-----------|
| `AndroidManifest.xml` | ✅ Ajout permissions GPS (`ACCESS_FINE_LOCATION`, etc.) |
| `environment.device.ts` | ✅ Création fichier config pour appareil réel |
| `gps-tracking.service.ts` | ✅ Remplacement `localhost` par `environment.apiUrl` |
| `gps-tracking.page.ts` | ✅ Remplacement `localhost` + import environment |
| `gps.service.ts` | ✅ Ajout demande explicite de permissions |
| `gps-tracking.page.scss` | ✅ Carte responsive (60vh) + optimisations mobile |
| `gps-tracking.page.ts` | ✅ Map initialization améliorée (touch, double invalidateSize) |
| `angular.json` | ✅ Ajout configuration `device` |

---

## 📖 Guide Complet

Pour un guide détaillé avec tests et diagnostic, voir:
👉 **[MOBILE_TESTING_GUIDE.md](./MOBILE_TESTING_GUIDE.md)**

---

## 🐛 Problèmes Fréquents

### "Carte grise qui ne charge pas"
→ Vérifiez la connexion internet du téléphone
→ Vérifiez que les tuiles OSM ne sont pas bloquées

### "Truck marker n'apparaît pas"
→ Vérifiez que le GPS est activé sur le téléphone
→ Vérifiez les logs dans Chrome DevTools (`chrome://inspect`)

### "Backend inaccessible"
→ Vérifiez l'IP avec `ipconfig`
→ Vérifiez le pare-feu Windows
→ Vérifiez que le backend écoute sur `0.0.0.0` et pas `localhost`

---

**Prêt à tester! 🎉**
