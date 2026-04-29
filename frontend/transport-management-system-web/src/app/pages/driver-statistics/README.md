# Statistiques par Chauffeur - Driver Statistics Dashboard

## 📊 Vue d'ensemble

Cette page fournit une analyse détaillée des performances et de l'activité de chaque chauffeur dans le système de gestion de transport.

## 🎯 Fonctionnalités

### Métriques Principales
- **Nombre total de kilomètres parcourus** : Distance cumulative de tous les trajets
- **Nombre d'heures de conduite** : Temps total passé sur la route
- **Pourcentage de temps d'arrêt chez le client** : Temps estimé passé en livraison/attente
- **Taux de complétion** : Pourcentage de trajets terminés avec succès
- **Score de productivité** : Indice composite (0-100) basé sur plusieurs facteurs

### Indicateurs de Performance
- **Efficacité** : Basée sur la vitesse moyenne optimale (60-80 km/h)
- **Ponctualité** : Taux de livraisons dans les délais
- **Utilisation du véhicule** : Pourcentage d'utilisation du temps disponible
- **Tendance de performance** : Évolution par rapport au mois précédent

### Visualisations
- **Graphique à barres** : Indicateurs de performance clés
- **Graphique circulaire** : Répartition des statuts de trajets
- **Graphique linéaire** : Évolution mensuelle des trajets et distances
- **Tableau interactif** : Liste complète des chauffeurs avec tri et pagination

## 🔧 Architecture Technique

### Backend (.NET 8)

#### Endpoints API
```
GET /api/statistics/driver-statistics
- Paramètres: startDate, endDate (optionnels)
- Retourne: Liste de DriverStatisticsDto

GET /api/statistics/driver-statistics/{driverId}
- Paramètres: driverId, startDate, endDate (optionnels)
- Retourne: DriverDetailedStatisticsDto
```

#### Modèles de Données
- `DriverStatisticsDto` : Statistiques résumées pour la liste
- `DriverDetailedStatisticsDto` : Statistiques complètes avec graphiques
- `MonthlyStatistics` : Données agrégées par mois
- `PerformanceIndicators` : Indicateurs avancés de performance

#### Logique de Calcul
- **Temps d'arrêt** : Estimé à 20% du temps total de trajet
- **Score de productivité** : 
  - 40% Taux de complétion
  - 30% Distance moyenne par trajet
  - 30% Nombre de trajets par jour
- **Efficacité** : Basée sur la vitesse moyenne (optimal: 60-80 km/h)

### Frontend (Angular 17)

#### Composant
- **Location** : `/frontend/transport-management-system-web/src/app/pages/driver-statistics/`
- **Route** : `/driver-statistics`
- **Navigation** : Menu principal > Statistiques > Statistiques Chauffeurs

#### Technologies Utilisées
- **Chart.js** : Graphiques interactifs
- **Angular Material** : Composants UI
- **RxJS** : Gestion des appels HTTP

#### Fichiers
```
driver-statistics/
├── driver-statistics.component.ts      # Logique TypeScript
├── driver-statistics.component.html    # Template HTML
└── driver-statistics.component.scss    # Styles SCSS
```

## 🚀 Utilisation

### Accès à la Page
1. Connectez-vous à l'application web
2. Naviguez vers **Statistiques** > **Statistiques Chauffeurs**
3. Ou accédez directement à `/driver-statistics`

### Filtrage des Données
- **Par période** : Sélectionnez les dates de début et fin
- **Par chauffeur** : Utilisez la barre de recherche (nom, permis, téléphone)
- **Actualisation** : Cliquez sur "Actualiser" pour recharger les données

### Analyse Détaillée
1. Cliquez sur **"Détails"** pour un chauffeur spécifique
2. Consultez les onglets :
   - **Résumé** : Vue d'ensemble des métriques
   - **Graphiques** : Visualisations interactives
   - **Historique** : Liste des trajets récents
   - **Performance** : Indicateurs avancés

## 📈 Interprétation des Scores

### Score de Productivité (0-100)
- **80-100** : Excellent 🟢
- **60-79** : Bon 🟡
- **< 60** : À améliorer 🔴

### Taux de Complétion
- **≥ 90%** : Excellent
- **70-89%** : Bon
- **< 70%** : Nécessite attention

### Temps d'Arrêt
- **≤ 20%** : Normal
- **20-30%** : Acceptable
- **> 30%** : Vérifier les retards

## 🔍 Formules de Calcul

### Productivité
```typescript
productivityScore = (completionRate * 0.4) + 
                    (min(avgDistance / 10, 100) * 0.3) + 
                    (min(tripsPerDay * 20, 100) * 0.3)
```

### Efficacité
```typescript
avgSpeed = totalDistance / totalDuration

if (avgSpeed >= 60 && avgSpeed <= 80):
    score = 100
elif (avgSpeed < 60):
    score = (avgSpeed / 60) * 100
else:
    score = max(0, 100 - ((avgSpeed - 80) * 2))
```

### Tendance
```typescript
change = ((currentMonth.trips - previousMonth.trips) * 100) / previousMonth.trips

if change > 5%: trend = "improving" ↑
if change < -5%: trend = "declining" ↓
else: trend = "stable" →
```

## 🛠️ Personnalisation

### Modifier les Poids de Productivité
Dans `StatisticsService.cs`, ajustez les coefficients :
```csharp
var productivityScore = Math.Round(
    (completionRate * 0.4m) +    // Modifier 0.4
    (Math.Min(avgDistance / 10, 100) * 0.3m) +  // Modifier 0.3
    (Math.Min(tripsPerDay * 20, 100) * 0.3m),   // Modifier 0.3
    2
);
```

### Changer le Pourcentage de Temps d'Arrêt
Dans `StatisticsService.cs` :
```csharp
var stopTimeHours = Math.Round(stat.TotalDuration * 0.2m, 2); // Modifier 0.2
```

### Ajouter de Nouvelles Métriques
1. Ajoutez les propriétés dans les DTOs (`TripStatisticsDto.cs`)
2. Implémentez la logique dans `StatisticsService.cs`
3. Mettez à jour le template HTML et les graphiques

## 🐛 Dépannage

### Les statistiques ne s'affichent pas
- Vérifiez que le backend est en cours d'exécution sur `http://localhost:5000`
- Assurez-vous qu'il y a des trajets assignés aux chauffeurs
- Vérifiez la console du navigateur pour les erreurs

### Graphiques non visibles
- Vérifiez que Chart.js est installé : `npm list chart.js`
- Rechargez la page après avoir ouvert le modal

### Données incorrectes
- Vérifiez les filtres de date appliqués
- Assurez-vous que les trajets ont des dates valides
- Contrôlez les logs du backend pour les erreurs SQL

## 📝 Notes Importantes

1. **Données Réelles** : Toutes les statistiques sont calculées à partir des données réelles de la base de données
2. **Mise à Jour** : Les statistiques sont recalculées à chaque chargement de page
3. **Performance** : Les requêtes sont optimisées avec LINQ et Entity Framework
4. **Sécurité** : L'accès est protégé par AuthGuard (authentification requise)

## 🔄 Futures Améliorations

- [ ] Export PDF/Excel des rapports
- [ ] Comparaison entre chauffeurs
- [ ] Alertes automatiques pour basse performance
- [ ] Intégration des données de carburant
- [ ] Évaluations clients
- [ ] Suivi des incidents
- [ ] Prédictions basées sur l'historique

## 👥 Support

Pour toute question ou problème, contactez l'équipe de développement TMS.
