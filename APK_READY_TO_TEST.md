# 📱 APK Mobile - Prêt pour Test Android

## ✅ Ce qui a été fait

### 1. **Configuration Update**
- ✅ Adresse IP mise à jour: `192.168.68.186`
- ✅ 4 fichiers modifiés pour pointer vers votre IP au lieu de `fida`
- ✅ Le backend web n'est **PAS affecté**

### 2. **APK Build Succès**
- ✅ APK généré avec succès
- ✅ Emplacement: `TMS-MobileApp\android\app\build\outputs\apk\debug\app-debug.apk`
- ✅ Taille: **57.8 MB**

### 3. **Java Version Fix**
- ✅ Capacitor voulait Java 21, mais vous avez Java 17
- ✅ Fichier `capacitor.build.gradle` modifié pour utiliser Java 17
- ⚠️ **Note:** Ce fichier sera regénéré à chaque `cap sync`, il faudra le remodifier

---

## 🚀 Prochaines Étapes (À FAIRE MANUELLEMENT)

### ÉTAPE 1: Configurer le Pare-feu Windows

**Ouvrez PowerShell en tant qu'Administrateur et exécutez:**

```powershell
netsh advfirewall firewall add rule name="TMS Backend" dir=in action=allow protocol=TCP localport=5191 profile=any
```

### ÉTAPE 2: Démarrer le Backend

```bash
cd backend/TransportManagementSystem
dotnet run
```

**✅ Vérification:** Le backend doit afficher `Now listening on: http://0.0.0.0:5191`

### ÉTAPE 3: Tester depuis votre Téléphone

1. Ouvrez Chrome sur votre téléphone Android
2. Allez à: **`http://192.168.68.186:5191/swagger`**
3. Si la page Swagger s'affiche, le backend est accessible! ✅

### ÉTAPE 4: Transférer l'APK sur votre Téléphone

**L'APK est ici:**
```
c:\Users\khamm\transport-management-system-v0.2\TMS-MobileApp\android\app\build\outputs\apk\debug\app-debug.apk
```

**Méthodes de transfert:**
- **USB:** Connectez le téléphone, copiez le fichier, installez
- **ADB:** `adb install TMS-MobileApp\android\app\build\outputs\apk\debug\app-debug.apk`
- **Cloud:** Google Drive, OneDrive, etc.
- **WiFi:** Apps comme ShareDrop, Send Anywhere

### ÉTAPE 5: Installer et Tester

1. **Activez "Sources inconnues"** sur votre téléphone si demandé
2. **Installez l'APK** depuis le gestionnaire de fichiers
3. **Ouvrez l'app TMS**
4. **Connectez-vous** avec vos identifiants driver

---

## ⚠️ Points Importants

### Réseau
- ✅ Téléphone et PC doivent être sur le **MÊME WiFi**
- ✅ Votre IP actuelle: `192.168.68.186`
- ⚠️ Si vous changez de réseau, l'IP changera - il faudra rebuild l'APK

### Backend
- ✅ Le backend **DOIT être en cours d'exécution** pour que le login marche
- ✅ Le backend écoute sur `0.0.0.0:5191` (accessible depuis l'extérieur)
- ✅ La version web (`frontend/`) est **indépendante** et n'est pas affectée

### Rebuild APK
Si vous modifiez le code mobile et devez rebuild:

```bash
cd TMS-MobileApp
ionic build --configuration=device
npx cap sync android

# IMPORTANT: Modifier capacitor.build.gradle avant le build Gradle
# Changer JavaVersion.VERSION_21 en VERSION_17 dans:
# TMS-MobileApp\android\app\capacitor.build.gradle

cd android
.\gradlew assembleDebug
```

**Ou utilisez le script PowerShell:**
```powershell
.\build-apk.ps1
```

---

## 🔍 Dépannage Rapide

| Problème | Solution |
|----------|----------|
| "Connection Refused" | Vérifiez que le backend tourne et que le pare-feu est configuré |
| "Network Error" | Vérifiez que téléphone et PC sont sur le même WiFi |
| Login ne marche pas | Testez `http://192.168.68.186:5191/swagger` depuis le téléphone |
| L'app plante au démarrage | Vérifiez les logs avec `adb logcat` |
| APK ne s'installe pas | Activez "Sources inconnues" dans les paramètres |

---

## 📋 Checklist Finale

Avant de tester, vérifiez:

- [ ] **Pare-feu Windows configuré** (port 5191 autorisé)
- [ ] **Backend démarré** (`dotnet run` dans une fenêtre)
- [ ] **Téléphone et PC sur le même WiFi**
- [ ] **APK transféré sur le téléphone**
- [ ] **Test de connexion:** `http://192.168.68.186:5191/swagger` depuis le téléphone
- [ ] **App installée et ouverte**
- [ ] **Login testé avec succès**

---

## 🎯 Résumé

**Votre APK est PRÊT!** 🎉

**Emplacement:** `TMS-MobileApp\android\app\build\outputs\apk\debug\app-debug.apk`

**Ce qu'il reste à faire:**
1. Configurer le pare-feu (1 commande en admin)
2. Démarrer le backend (`dotnet run`)
3. Transférer l'APK sur le téléphone
4. Installer et tester le login!

**Le backend web n'est PAS affecté** - il continue de marcher indépendamment! 🚀
