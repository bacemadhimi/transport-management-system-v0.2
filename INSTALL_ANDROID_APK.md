# 📱 Installer l'App Mobile sur Android - Méthode Simple (APK)

## 🎯 Objectif
Générer un fichier **APK** que vous pouvez installer directement sur votre téléphone Android, sans Android Studio.

---

## 📋 Prérequis (À FAIRE UNE SEULE FOIS)

### 1️⃣ Configurer l'IP du Backend

**Sur votre PC, trouvez votre adresse IP:**
```cmd
ipconfig
```
Cherchez **Adresse IPv4** → Exemple: `192.168.1.100`

**Modifiez ce fichier:**
```
TMS-MobileApp/src/environments/environment.device.ts
```

Remplacez l'IP:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://192.168.1.100:5191',  // ← VOTRE IP ICI
  weatherApiKey: ''
};
```

---

### 2️⃣ Autoriser le Backend dans le Pare-feu

**PowerShell (Admin):**
```powershell
New-NetFirewallRule -DisplayName "TMS Backend" -Direction Inbound -LocalPort 5191 -Protocol TCP -Action Allow
```

---

## 🚀 Générer l'APK (3 Commandes)

```bash
cd TMS-MobileApp

# 1. Build l'app
ionic build --configuration=device

# 2. Synchroniser avec Android
npx cap sync android

# 3. Générer l'APK
cd android
.\gradlew assembleDebug
```

---

## 📤 Transférer l'APK sur Votre Téléphone

### Option A: Par Câble USB (Recommandé)

1. **Connectez votre téléphone par USB**
2. **Activez le débogage USB** (si demandé):
   - Paramètres → Options développeur → Débogage USB
3. **Copiez l'APK:**

```powershell
# Le fichier APK est ici:
TMS-MobileApp/android/app/build/outputs/apk/debug/app-debug.apk

# Copiez-le vers votre téléphone (ou sur le Bureau)
copy "TMS-MobileApp\android\app\build\outputs\apk\debug\app-debug.apk" "%USERPROFILE%\Desktop\TMS-Mobile.apk"
```

4. **Sur votre téléphone**, ouvrez le fichier APK et installez

---

### Option B: Par WiFi/Sans Fil

1. **Partagez l'APK** via:
   - Google Drive
   - WhatsApp
   - Email
   - Bluetooth
   - Partage de proximité (Nearby Share)

2. **Sur votre téléphone**, téléchargez et ouvrez l'APK

---

### Option C: Serveur Local (Rapide)

**Sur votre PC:**
```powershell
cd TMS-MobileApp\android\app\build\outputs\apk\debug
python -m http.server 8080
```

**Sur votre téléphone**, ouvrez Chrome et allez à:
```
http://VOTRE_IP_PC:8080/app-debug.apk
```

---

## 📲 Installer l'APK sur le Téléphone

### 1. Autoriser les Sources Inconnues

**Paramètres** → **Sécurité** → **Sources inconnues** → **Activer**

(Le chemin peut varier selon le modèle)

### 2. Ouvrir le Fichier APK

- Ouvrez le **gestionnaire de fichiers**
- Trouvez le fichier `TMS-Mobile.apk`
- **Cliquez dessus** → **Installer**

### 3. Accepter les Permissions

L'application va demander:
- ✅ **Localisation** (GPS)
- ✅ **Accès Internet**
- ✅ **Stockage**

**Acceptez tout!**

---

## ✅ Tester l'Application

### 1. Démarrer le Backend

**Dans un autre terminal:**
```bash
cd backend/TransportManagementSystem
dotnet run
```

### 2. Ouvrir l'App sur le Téléphone

- Trouvez l'icône **TMS** sur votre téléphone
- **Cliquez** pour lancer

### 3. Vérifier la Connexion

L'app doit pouvoir:
- ✅ Afficher l'écran de login
- ✅ Se connecter au backend
- ✅ Demander la permission GPS

---

## 🔄 Recompiler (Quand Vous Modifiez le Code)

Chaque fois que vous modifiez le code:

```bash
cd TMS-MobileApp
ionic build --configuration=device
npx cap sync android
cd android
.\gradlew assembleDebug
```

Puis réinstallez le nouvel APK sur le téléphone.

---

## 📍 Emplacement de l'APK

```
TMS-MobileApp/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🐛 Problèmes Fréquents

| Problème | Solution |
|----------|----------|
| "APK non installé" | Autorisez "Sources inconnues" |
| "App ne se connecte pas" | Vérifiez l'IP dans `environment.device.ts` |
| "GPS ne marche pas" | Activez la localisation sur le téléphone |
| "Permission refusée" | Paramètres → Apps → TMS → Permissions → Activer |
| "Backend inaccessible" | Vérifiez que `dotnet run` tourne + pare-feu |

---

## 💡 Astuce: Voir les Logs

**Via Chrome DevTools:**
1. Connectez le téléphone par USB
2. Ouvrez Chrome sur le PC
3. Allez à `chrome://inspect`
4. Cliquez sur **inspect** à côté de l'app TMS

---

**Résumé: 3 commandes → 1 APK → Installez → Testez! 🎉**
