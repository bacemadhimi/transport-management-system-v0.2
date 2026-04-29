namespace TransportManagementSystem.Models;

/// <summary>
/// DTO pour les arrêts de voyage (multi-clients et multi-points)
/// </summary>
public class TripStopDto
{
    public int Id { get; set; }
    public int TripId { get; set; }
    public int Sequence { get; set; }
    
    /// <summary>
    /// Type d'arrêt : Commande ou Manuel
    /// </summary>
    public string Type { get; set; } = string.Empty;
    
    /// <summary>
    /// ID de la commande associée (si Type = Commande)
    /// </summary>
    public int? OrderId { get; set; }
    public string? OrderReference { get; set; }
    
    /// <summary>
    /// Client associé à cet arrêt
    /// </summary>
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    
    /// <summary>
    /// Adresse et coordonnées GPS
    /// </summary>
    public string Address { get; set; } = string.Empty;
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Geolocation { get; set; }
    
    /// <summary>
    /// Notes spécifiques à cet arrêt
    /// </summary>
    public string? Notes { get; set; }
    
    /// <summary>
    /// Statut de l'arrêt
    /// </summary>
    public string Status { get; set; } = string.Empty;
    
    /// <summary>
    /// Horaires prévus et réels
    /// </summary>
    public DateTime? EstimatedArrivalTime { get; set; }
    public DateTime? ActualArrivalTime { get; set; }
    public DateTime? ActualDepartureTime { get; set; }
}
