# 📱 Guide: Tester l'APK Mobile Android sans Toucher au Backend Web

## 🎯 Objectif
Tester l'application mobile TMS sur votre téléphone Android tout en gardant le backend et la version web fonctionnels.

---

## ✅ Configuration Déjà Faite

### 1. **Adresse IP configurée**
Votre PC a l'adresse IP: **192.168.68.186**

Les fichiers suivants ont été mis à jour:
- ✅ `TMS-MobileApp/src/environments/environment.device.ts`
- ✅ `TMS-MobileApp/src/environments/environment.ts`
- ✅ `TMS-MobileApp/src/assets/api-config.json`
- ✅ `TMS-MobileApp/src/app/pages/login/login.page.ts`

Tous pointent maintenant vers `http://192.168.68.186:5191` au lieu de `http://fida:5191`

### 2. **Backend Configuration**
Le backend écoute déjà sur `0.0.0.0:5191` (toutes les interfaces), ce qui permet les connexions externes.

---

## 📋 Étapes à Suivre

### ÉTAPE 1: Configurer le Pare-feu Windows (IMPORTANT!) ⚠️

**Vous devez exécuter cette commande en tant qu'Administrateur:**

1. Ouvrez PowerShell ou CMD **en tant qu'administrateur**
2. Exécutez:
```powershell
netsh advfirewall firewall add rule name="TMS Backend" dir=in action=allow protocol=TCP localport=5191 profile=any
```

**Alternative via l'interface graphique:**
1. Ouvrez "Pare-feu Windows avec fonctions de sécurité avancées"
2. Cliquez sur "Règles de trafic entrant" → "Nouvelle règle"
3. Sélectionnez "Port" → TCP → Port spécifique: `5191`
4. Autorisez la connexion → Appliquez à tous les profils
5. Nommez la règle: "TMS Backend"

---

### ÉTAPE 2: Démarrer le Backend

```bash
cd backend/TransportManagementSystem
dotnet run
```

**Vérification:**
- Le backend doit démarrer sur `http://0.0.0.0:5191`
- Vous devriez voir: `Now listening on: http://0.0.0.0:5191`
- **Ne fermez PAS cette fenêtre!**

**Tester depuis votre téléphone Android:**
1. Ouvrez Chrome sur votre téléphone
2. Allez à: `http://192.168.68.186:5191/swagger`
3. Si la page Swagger s'affiche, ✅ le backend est accessible!

---

### ÉTAPE 3: Vérifier que le Web Frontend Marche Toujours

La version web est **complètement indépendante** dans le dossier `frontend/transport-management-system-web/`.

Pour démarrer le web frontend (optionnel):
```bash
cd frontend/transport-management-system-web
ng serve
```

La web app sera disponible sur `http://localhost:4200` et **n'est pas affectée** par les changements mobile.

---

### ÉTAPE 4: Construire l'APK Android

```bash
cd TMS-MobileApp

# 1. Construire l'app avec la configuration device
ionic build --configuration=device

# 2. Synchroniser Capacitor (copie les assets vers le projet Android)
npx cap sync android

# 3. Construire l'APK debug
cd android
.\gradlew assembleDebug
```

**L'APK sera généré ici:**
```
TMS-MobileApp/android/app/build/outputs/apk/debug/app-debug.apk
```

**Temps de build estimé:** 2-5 minutes

---

### ÉTAPE 5: Transférer l'APK sur Votre Téléphone

**Méthode 1: Câble USB**
1. Connectez votre téléphone avec un câble USB
2. Activez "Débogage USB" dans les Options Développeur
3. Copiez le fichier `app-debug.apk` sur le téléphone
4. Installez-le avec un gestionnaire de fichiers

**Méthode 2: Via le réseau (recommandé)**
1. Installez une app comme "ShareDrop" ou utilisez Google Drive
2. Transférez l'APK vers votre téléphone
3. Installez depuis le gestionnaire de fichiers

**Méthode 3: ADB (Android Debug Bridge)**
```bash
adb install TMS-MobileApp/android/app/build/outputs/apk/debug/app-debug.apk
```

---

### ÉTAPE 6: Autoriser l'Installation d'APK Inconnus

Sur votre téléphone Android:
1. **Paramètres** → **Sécurité** → **Sources inconnues**
2. Autorisez l'installation depuis votre gestionnaire de fichiers
3. Ou suivez les invites lors de l'installation

---

### ÉTAPE 7: Tester la Connexion Login 🚀

**Avant de lancer l'app:**
- ✅ Backend doit être en cours d'exécution sur votre PC
- ✅ Votre téléphone et PC doivent être sur le **MÊME réseau WiFi**
- ✅ Pare-feu doit autoriser le port 5191

**Dans l'app mobile:**
1. Ouvrez l'app TMS
2. Entrez vos identifiants (email + mot de passe)
3. Cliquez sur "Login"
4. L'app va se connecter à `http://192.168.68.186:5191/api/Auth/login`

**Si ça ne marche pas:**
- Vérifiez que le backend tourne: ouvrez `http://192.168.68.186:5191/swagger` sur le téléphone
- Vérifiez le WiFi: téléphone et PC sur le même réseau
- Vérifiez le pare-feu: règle pour le port 5191
- Regardez les logs dans Android Studio Logcat

---

## 🔍 Dépannage

### ❌ "Connection Refused" ou "Network Error"
**Cause:** Le backend n'est pas accessible depuis le téléphone

**Solutions:**
1. Vérifiez que le backend tourne sur votre PC
2. Testez depuis le téléphone: `http://192.168.68.186:5191/swagger`
3. Vérifiez le pare-feu Windows (étape 1)
4. Vérifiez que téléphone et PC sont sur le même WiFi

### ❌ "CORS Error"
**Solution:** Le backend a déjà CORS configuré pour accepter tout, donc ce ne devrait pas être le problème.

### ❌ Login réussit mais pas de données
**Vérification:**
- L'utilisateur a-t-il le rôle "Driver"?
- Vérifiez les logs du backend pour voir les erreurs

### ❌ SignalR ne se connecte pas
**Vérification:**
- Les hubs SignalR sont sur: `/triphub`, `/gpshub`, `/notificationhub`, `/chathub`
- Le token JWT doit être passé dans le query string: `?access_token=YOUR_TOKEN`

---

## 📊 Architecture du Projet

```
transport-management-system-v0.2/
├── backend/TransportManagementSystem/        # .NET 9 Web API (PORT 5191)
│   ├── Controllers/                          # 41 controllers (Auth, Trips, GPS, etc.)
│   ├── Hubs/                                 # 4 SignalR hubs
│   └── appsettings.json                      # JWT key, DB connection
│
├── frontend/transport-management-system-web/ # Angular 21 Web Admin (PORT 4200)
│   └── src/                                  # COMPLÈTEMENT INDÉPENDANT
│
└── TMS-MobileApp/                            # Ionic 8 + Angular + Capacitor
    ├── src/
    │   ├── environments/                     # Config API URL
    │   │   ├── environment.ts                # Runtime detection
    │   │   ├── environment.device.ts         # Pour build APK
    │   │   └── environment.prod.ts           # Production
    │   ├── app/pages/
    │   │   └── login/                        # Login page
    │   └── app/services/
    │       ├── auth.service.ts               # Mock (non utilisé)
    │       ├── signalr.service.ts            # SignalR /triphub
    │       └── gps-tracking.service.ts       # SignalR /gpshub
    └── android/                              # Projet Android natif
        └── app/build/outputs/apk/debug/
            └── app-debug.apk                 # APK à installer
```

---

## 🔄 Workflow de Développement

### Quand vous changez l'adresse IP du PC:
1. Mettez à jour les 4 fichiers de configuration
2. Rebuild: `ionic build --configuration=device && npx cap sync android`
3. Rebuild APK: `cd android && .\gradlew assembleDebug`

### Quand vous changez le code Angular du mobile:
```bash
cd TMS-MobileApp
ionic build --configuration=device
npx cap sync android
cd android
.\gradlew assembleDebug
```

### Le backend web n'est JAMAIS affecté par les builds mobile!

---

## 🎉 Vérification Finale

** Checklist avant de tester: **
- [ ] Backend démarré sur `http://0.0.0.0:5191`
- [ ] Pare-feu Windows configuré pour le port 5191
- [ ] Téléphone et PC sur le même WiFi
- [ ] APK construit et installé
- [ ] Test depuis téléphone: `http://192.168.68.186:5191/swagger` fonctionne
- [ ] Login dans l'app mobile réussit

**Si tout est vert, vous êtes prêt! 🚀**

---

## 📝 Notes Importantes

1. **L'adresse IP `192.168.68.186` peut changer** si vous vous connectez à un autre WiFi
2. **Le backend utilise LocalDB** (Windows uniquement, ne marche pas sur Linux/Mac)
3. **La version web est 100% indépendante** - aucun impact des builds mobile
4. **L'APK utilise HTTP (pas HTTPS)** - c'est pourquoi `usesCleartextTraffic="true"` dans AndroidManifest.xml

---

## 🆘 Support

Si vous avez des problèmes:
1. Vérifiez les logs du backend (fenêtre où `dotnet run` est exécuté)
2. Vérifiez les logs Android avec Logcat ou Android Studio
3. Testez la connectivité avec Postman depuis le téléphone

**Commande utile pour voir les logs backend en temps réel:**
```bash
# Les logs apparaissent dans la fenêtre où dotnet run est exécuté
```
