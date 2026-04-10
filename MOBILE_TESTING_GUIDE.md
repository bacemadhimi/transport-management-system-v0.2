# 📱 Guide: Tester l'Application Mobile sur Android

## 🎯 Problèmes Résolus

Ce guide vous explique comment tester l'application mobile sur votre téléphone Android après les corrections suivantes:

1. ✅ **Permissions GPS ajoutées** - `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`
2. ✅ **Configuration réseau pour appareil réel** - URL de l'API configurable via l'environnement
3. ✅ **Gestion des permissions GPS** - Demande automatique des permissions au runtime
4. ✅ **Carte optimisée pour mobile** - Taille responsive, support tactile amélioré

---

## 📋 Prérequis

### 1. Trouver l'Adresse IP de Votre Ordinateur

**Windows:**
```cmd
ipconfig
```
Cherchez **IPv4 Address** → Exemple: `192.168.1.100`

**Important:** Votre téléphone et ordinateur doivent être sur le **MÊME réseau WiFi**.

### 2. Configurer l'Environnement Device

Ouvrez le fichier:
```
TMS-MobileApp/src/environments/environment.device.ts
```

Modifiez l'URL de l'API:
```typescript
export const environment = {
  production: false,
  // REMPLACEZ par l'IP de votre ordinateur
  apiUrl: 'http://192.168.1.100:5191',  // ← Changez cette ligne!
  weatherApiKey: ''
};
```

### 3. Vérifier le Backend

Assurez-vous que le backend est accessible depuis d'autres appareils:

**Vérifier Program.cs:**
```csharp
// Le backend doit écouter sur toutes les interfaces
app.Urls.Add("http://0.0.0.0:5191");
// ou
app.Urls.Add("http://*:5191");
```

Si votre backend utilise seulement `localhost`, modifiez-le pour écouter sur `0.0.0.0`.

### 4. Configurer le Pare-feu Windows

Le pare-feu peut bloquer les connexions entrantes:

**Option 1 - Via PowerShell (Admin):**
```powershell
New-NetFirewallRule -DisplayName "TMS Backend" -Direction Inbound -LocalPort 5191 -Protocol TCP -Action Allow
```

**Option 2 - Via Interface Graphique:**
1. Ouvrez **Pare-feu Windows Defender**
2. **Paramètres avancés** → **Règles de trafic entrant**
3. **Nouvelle règle** → **Port** → **TCP** → **5191**
4. **Autoriser la connexion** → Nommez-la "TMS Backend"

---

## 🔨 Build et Déploiement

### Étape 1: Installer les Dépendances

```bash
cd TMS-MobileApp
npm install
```

### Étape 2: Ajouter la Plateforme Android (si pas déjà fait)

```bash
npx cap add android
```

### Étape 3: Build pour Device

```bash
# Build avec la configuration 'device'
ionic build --configuration=device
```

### Étape 4: Synchroniser Capacitor

```bash
npx cap sync android
```

### Étape 5: Ouvrir dans Android Studio

```bash
npx cap open android
```

### Étape 6: Exécuter sur Votre Téléphone

**Dans Android Studio:**

1. **Activez le Mode Développeur sur votre téléphone:**
   - **Paramètres** → **À propos du téléphone**
   - Tapez 7 fois sur **Numéro de build**
   - Un message confirme: "Vous êtes maintenant développeur!"

2. **Activez le Débogage USB:**
   - **Paramètres** → **Options développeur**
   - Activez **Débogage USB**

3. **Connectez votre téléphone par USB**

4. **Dans Android Studio:**
   - Sélectionnez votre appareil dans la liste déroulante
   - Cliquez sur **Run** (▶️)

---

## 🧪 Tests à Effectuer

### Test 1: Connexion au Backend ✅

**Quoi vérifier:**
- L'écran de login apparaît
- Vous pouvez vous connecter avec vos identifiants

**Logs à surveiller:**
```
✅ Connected to API
📡 Fetching trip details from API...
```

**Problème courant:**
```
❌ Error: Network Error
❌ Failed to fetch
```
→ Vérifiez l'IP dans `environment.device.ts`
→ Vérifiez que le backend est démarré
→ Vérifiez le pare-feu

---

### Test 2: Permissions GPS ✅

**Quoi vérifier:**
- Au premier lancement, une demande de permission GPS apparaît
- Acceptez la permission

**Logs à surveiller:**
```
📍 Location permission status: granted
```

**Si la permission n'apparaît pas:**
- Allez dans **Paramètres** → **Applications** → **TMS Mobile** → **Permissions**
- Activez **Localisation**

---

### Test 3: Carte et Marqueurs ✅

**Quoi vérifier:**
1. La carte OpenStreetMap s'affiche
2. Vous pouvez zoomer/dézoomer avec les gestes
3. Le marqueur du camion apparaît quand le GPS est actif
4. Le marqueur de destination apparaît avec l'adresse

**Logs à surveiller:**
```
🗺️ Initializing map...
✅ Map initialized and size invalidated
✅ Map size invalidated (second pass for mobile)
📍 GPS position received: {...}
✅ Destination marker added
```

**Problèmes courants:**

| Problème | Solution |
|----------|----------|
| Carte grise/vide | Vérifiez la connexion internet |
| Marqueur invisible | Vérifiez que le GPS est activé sur le téléphone |
| Pas de destination | Vérifiez que le trip a des coordonnées de destination |

---

### Test 4: Suivi GPS en Temps Réel ✅

**Quoi vérifier:**
1. Démarrez le suivi GPS dans l'app
2. Le camion se déplace sur la carte quand vous bougez
3. La vitesse s'affiche correctement
4. La connexion SignalR est active

**Logs à surveiller:**
```
🛰️ SignalR connected
📍 Sending GPS position to server
✅ Position sent successfully
```

**Sur le Web Admin:**
- Ouvrez la page **Live GPS Tracking**
- Vous devriez voir le camion se déplacer en temps réel

---

### Test 5: Navigation Vocale ✅

**Quoi vérifier:**
1. Cliquez sur le bouton microphone
2. Les instructions vocales sont annoncées
3. L'icône montre des ondes animées quand actif

---

### Test 6: Gestion des Missions ✅

**Flux complet:**
1. **Pending** → Bouton "Accepter" fonctionne
2. **Accepted** → Bouton "Commencer Chargement" apparaît
3. **Loading** → Bouton "Commencer Livraison" apparaît
4. **Delivery** → Bouton "Terminer" apparaît
5. **Completed** → Message de félicitations

---

## 🐛 Diagnostic Avancé

### Voir les Logs de l'Application

**Via Android Studio:**
- Ouvrez **Logcat** en bas
- Filtrez par `com.yourapp.tms`

**Via Chrome DevTools:**
1. Ouvrez Chrome sur votre ordinateur
2. Allez à `chrome://inspect`
3. Cliquez sur **inspect** à côté de votre appareil

### Tester avec l'Émulateur

Si vous n'avez pas de téléphone physique:

```bash
# Créer un appareil virtuel dans Android Studio
# Tools → Device Manager → Create Virtual Device
# Sélectionnez un modèle avec Google Play
```

**Simuler des positions GPS dans l'émulateur:**
- Dans Android Studio: **Extended Controls** → **Location**
- Entrez des coordonnées et cliquez sur **Send**

---

## 📊 Checklist de Test

| Test | Statut | Notes |
|------|--------|-------|
| Login réussi | ⬜ | |
| Permissions GPS accordées | ⬜ | |
| Carte s'affiche correctement | ⬜ | |
| Marqueur camion visible | ⬜ | |
| Marqueur destination visible | ⬜ | |
| Route affichée sur la carte | ⬜ | |
| GPS en temps réel fonctionne | ⬜ | |
| Position visible sur Web Admin | ⬜ | |
| Navigation vocale fonctionne | ⬜ | |
| Workflow mission complet | ⬜ | |
| Déconnexion fonctionne | ⬜ | |

---

## 🚀 Commandes Rapides

```bash
# Build et deploy en une commande
ionic build --configuration=device && npx cap sync android && npx cap open android

# Voir les logs en temps réel
adb logcat | grep -i "gps\|map\|tracking"

# Redémarrer l'app sur le device
adb shell am force-stop com.yourapp.tms
adb shell am start -n com.yourapp.tms/.MainActivity
```

---

## 💡 Conseils

1. **Toujours reconstruire** après avoir modifié `environment.device.ts`
2. **Utilisez `--configuration=device`** pour le build sur appareil réel
3. **Testez sur WiFi 5GHz** pour de meilleures performances SignalR
4. **Gardez l'écran allumé** pendant les tests GPS (Paramètres → Développeur → Rester actif)

---

## 🆘 Support

Si vous rencontrez des problèmes:

1. Vérifiez les logs dans Chrome DevTools
2. Vérifiez que le backend répond: `http://VOTRE_IP:5191/api/health`
3. Redémarrez l'app: `adb shell am force-stop com.yourapp.tms`
4. Nettoyez le cache: `npm run clean` puis rebuild

**Logs Backend à surveiller:**
```
GPSHub: Client connected
GPSHub: SendPosition received from driver X
Broadcasting position to Admins group
```

---

**Bon testing! 🎉**
