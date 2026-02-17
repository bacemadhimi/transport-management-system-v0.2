using System.ComponentModel;
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


    public int TruckId { get; set; }
    public Truck Truck { get; set; } 

    public int DriverId { get; set; }
    public Driver Driver { get; set; } 

    public TripStatus TripStatus { get; set; } = TripStatus.Planned;

    public string? Message { get; set; } 

    public ICollection<Delivery> Deliveries { get; set; } = new List<Delivery>();

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



}

public enum TripStatus
{
    Planned,              // Planifié (par l'opérateur)
    Accepted,            // Accepté (par le chauffeur mobile)
    LoadingInProgress,   // En cours de chargement (après confirmation)
    DeliveryInProgress,  // En cours de livraison (en route)
    Receipt,             // Réception (Livrée - arrivée destination)
    Cancelled            // Annulé
}