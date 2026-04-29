namespace TransportManagementSystem.DTOs;

public class PieChartData
{
    public string Label { get; set; }
    public decimal Value { get; set; }
    public string Color { get; set; }
    public int Count { get; set; }
}

public class TripStatisticsDto
{
    public List<PieChartData> StatusDistribution { get; set; } = new();
    public List<PieChartData> TruckUtilization { get; set; } = new();
    public List<PieChartData> DeliveryByType { get; set; } = new();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public class StatisticsFilterDto
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int? TruckId { get; set; }
    public int? DriverId { get; set; }
}

// DTO pour les statistiques par chauffeur (liste)
public class DriverStatisticsDto
{
    public int DriverId { get; set; }
    public string DriverName { get; set; } = string.Empty;
    public string LicenseNumber { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    
    // Métriques principales
    public int TotalTrips { get; set; }
    public decimal TotalDistanceKm { get; set; }
    public decimal TotalDrivingHours { get; set; }
    public decimal AverageDistancePerTrip { get; set; }
    public decimal AverageDurationPerTrip { get; set; }
    
    // Performance
    public int CompletedTrips { get; set; }
    public int CancelledTrips { get; set; }
    public decimal CompletionRate { get; set; } // Pourcentage de trajets complétés
    
    // Temps d'arrêt chez le client
    public decimal TotalStopTimeHours { get; set; }
    public decimal StopTimePercentage { get; set; } // % du temps total passé en arrêt
    
    // Productivité
    public decimal ProductivityScore { get; set; } // Score de productivité (0-100)
    public decimal AverageTripsPerDay { get; set; }
    
    // Période analysée
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
}

// DTO pour les statistiques détaillées d'un chauffeur spécifique
public class DriverDetailedStatisticsDto
{
    public int DriverId { get; set; }
    public string DriverName { get; set; } = string.Empty;
    public string LicenseNumber { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    
    // Résumé global
    public DriverPerformanceSummary Summary { get; set; } = new();
    
    // Statistiques mensuelles (pour graphiques)
    public List<MonthlyStatistics> MonthlyStats { get; set; } = new();
    
    // Répartition des statuts de trajets
    public List<PieChartData> TripStatusDistribution { get; set; } = new();
    
    // Historique des trajets récents
    public List<RecentTripSummary> RecentTrips { get; set; } = new();
    
    // Indicateurs de performance
    public PerformanceIndicators PerformanceIndicators { get; set; } = new();
}

public class DriverPerformanceSummary
{
    public int TotalTrips { get; set; }
    public decimal TotalDistanceKm { get; set; }
    public decimal TotalDrivingHours { get; set; }
    public int CompletedTrips { get; set; }
    public int CancelledTrips { get; set; }
    public decimal CompletionRate { get; set; }
    public decimal TotalStopTimeHours { get; set; }
    public decimal StopTimePercentage { get; set; }
    public decimal ProductivityScore { get; set; }
    public decimal AverageTripsPerDay { get; set; }
    public decimal AverageDistancePerTrip { get; set; }
    public decimal AverageDurationPerTrip { get; set; }
}

public class MonthlyStatistics
{
    public string Month { get; set; } = string.Empty; // Format: "2024-01"
    public int TripCount { get; set; }
    public decimal TotalDistance { get; set; }
    public decimal TotalHours { get; set; }
    public int CompletedCount { get; set; }
    public decimal CompletionRate { get; set; }
}

public class RecentTripSummary
{
    public int TripId { get; set; }
    public string TripReference { get; set; } = string.Empty;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal Distance { get; set; }
    public decimal Duration { get; set; }
    public string Destination { get; set; } = string.Empty;
}

public class PerformanceIndicators
{
    // Efficacité
    public decimal EfficiencyScore { get; set; } // Basé sur la distance/temps
    public decimal OnTimeDeliveryRate { get; set; } // % de livraisons à l'heure
    
    // Qualité de service
    public decimal CustomerSatisfactionScore { get; set; } // Si disponible
    public int IncidentCount { get; set; } // Nombre d'incidents
    
    // Utilisation des ressources
    public decimal FuelEfficiency { get; set; } // Consommation moyenne (si disponible)
    public decimal VehicleUtilizationRate { get; set; } // % d'utilisation du véhicule
    
    // Tendances
    public string PerformanceTrend { get; set; } = string.Empty; // "improving", "stable", "declining"
    public decimal TrendPercentage { get; set; } // Variation par rapport au mois précédent
}