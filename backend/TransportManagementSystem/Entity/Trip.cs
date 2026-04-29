
using System.Text.Json.Serialization;

namespace TransportManagementSystem.Entity;

public class Trip
{
    public int Id { get; set; }
    public string BookingId { get; set; }

    public string TripReference { get; set; } // Référence métier
    public decimal EstimatedDistance { get; set; } // en km
    public decimal EstimatedDuration { get; set; } // en heures
    public DateTime? ActualStartDate { get; set; } // Réel vs planifié
    public DateTime? ActualEndDate { get; set; }
    public DateTime? EstimatedStartDate { get; set; }
    public DateTime? EstimatedEndDate { get; set; }

    // GPS coordinates for trip start and end
    public double? EndLatitude { get; set; }
    public double? EndLongitude { get; set; }
    public double? StartLatitude { get; set; }
    public double? StartLongitude { get; set; }


    public int TruckId { get; set; }
    public Truck Truck { get; set; } 

    public int DriverId { get; set; }
    public Driver Driver { get; set; } 

    public TripStatus TripStatus { get; set; } = TripStatus.Planned;

    public string? Message { get; set; } 

    public ICollection<Delivery> Deliveries { get; set; } = new List<Delivery>();

    // Multi-stops support for multi-client and multi-point trips
    public ICollection<TripStop> TripStops { get; set; } = new List<TripStop>();

    public int? TrajectId { get; set; }
    public Traject? Traject { get; set; }

    public int? ConvoyeurId { get; set; }
    public Convoyeur? Convoyeur { get; set; }

    public int? CreatedById { get; set; }
    public DateTime? CreatedAt { get; set; }
    public int? UpdatedById { get; set; }
    public DateTime? UpdatedAt { get; set; }

    [JsonIgnore]
    internal User? CreatedBy { get; set; }

    [JsonIgnore]
    internal User? UpdatedBy { get; set; }

    // GPS Tracking fields
    public string? CurrentLatitude { get; set; } // Position actuelle du chauffeur
    public string? CurrentLongitude { get; set; }
    public DateTime? LastPositionUpdate { get; set; } // Dernière mise à jour GPS

    // Assignment tracking
    public bool IsAssigned { get; set; } = false;
    public DateTime? AssignedAt { get; set; }
    public DateTime? AcceptedAt { get; set; }

}

/// <summary>
/// Statut complet du voyage pour le workflow mobile
/// </summary>
public enum TripStatus
{
    Pending,              // En attente d'assignment (nouveau)
    Assigned,             // Assigné à un chauffeur (en attente d'acceptation)
    Accepted,             // Accepté par le chauffeur
    Loading,              // Chargement en cours
    InDelivery,           // En cours de livraison (sur la route)
    Arrived,              // Arrivé à destination
    Completed,            // Livraison terminée
    Cancelled,            // Annulé
    Refused,              // Refusé par le chauffeur
    // Anciens noms pour compatibilité (deprecated)
    Planned = Pending,
    LoadingInProgress = Loading,
    DeliveryInProgress = InDelivery,
    Receipt = Arrived
}