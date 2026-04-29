using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

/// <summary>
/// Représente un arrêt dans un voyage (point de livraison ou point d'arrêt manuel)
/// Supporte les voyages multi-clients et multi-points
/// </summary>
public class TripStop
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    /// <summary>
    /// ID du voyage auquel cet arrêt appartient
    /// </summary>
    [Required]
    public int TripId { get; set; }

    [ForeignKey("TripId")]
    public Trip Trip { get; set; } = null!;

    /// <summary>
    /// Ordre de l'arrêt dans le voyage (1, 2, 3, etc.)
    /// Détermine l'ordre d'affichage et de navigation
    /// </summary>
    [Required]
    public int Sequence { get; set; }

    /// <summary>
    /// Type d'arrêt : Commande (depuis une commande existante) ou Manuel (adresse ajoutée manuellement)
    /// </summary>
    [Required]
    public StopType Type { get; set; } = StopType.Commande;

    /// <summary>
    /// ID de la commande associée (si Type = Commande)
    /// Peut être null si c'est un arrêt manuel
    /// </summary>
    public int? OrderId { get; set; }

    [ForeignKey("OrderId")]
    public Order? Order { get; set; }

    /// <summary>
    /// ID du client associé à cet arrêt
    /// </summary>
    [Required]
    public int CustomerId { get; set; }

    [ForeignKey("CustomerId")]
    public Customer Customer { get; set; } = null!;

    /// <summary>
    /// Adresse complète de l'arrêt
    /// </summary>
    [Required]
    [StringLength(500)]
    public string Address { get; set; } = string.Empty;

    /// <summary>
    /// Latitude GPS de l'arrêt
    /// </summary>
    public double? Latitude { get; set; }

    /// <summary>
    /// Longitude GPS de l'arrêt
    /// </summary>
    public double? Longitude { get; set; }

    /// <summary>
    /// Géolocalisation formatée (lat,lng) pour compatibilité
    /// </summary>
    [StringLength(100)]
    public string? Geolocation { get; set; }

    /// <summary>
    /// Notes spécifiques à cet arrêt
    /// </summary>
    [StringLength(1000)]
    public string? Notes { get; set; }

    /// <summary>
    /// Statut de l'arrêt (en attente, atteint, terminé, etc.)
    /// </summary>
    public StopStatus Status { get; set; } = StopStatus.EnAttente;

    /// <summary>
    /// Heure prévue d'arrivée à cet arrêt
    /// </summary>
    public DateTime? EstimatedArrivalTime { get; set; }

    /// <summary>
    /// Heure réelle d'arrivée à cet arrêt
    /// </summary>
    public DateTime? ActualArrivalTime { get; set; }

    /// <summary>
    /// Heure réelle de départ de cet arrêt
    /// </summary>
    public DateTime? ActualDepartureTime { get; set; }

    /// <summary>
    /// Date de création de l'arrêt
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date de dernière modification
    /// </summary>
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>
/// Type d'arrêt dans un voyage
/// </summary>
public enum StopType
{
    /// <summary>
    /// Arrêt provenant d'une commande existante
    /// </summary>
    Commande = 0,

    /// <summary>
    /// Arrêt ajouté manuellement par l'administrateur
    /// </summary>
    Manuel = 1
}

/// <summary>
/// Statut d'un arrêt dans un voyage
/// </summary>
public enum StopStatus
{
    /// <summary>
    /// En attente (non encore atteint)
    /// </summary>
    EnAttente = 0,

    /// <summary>
    /// En cours (chauffeur en route vers cet arrêt)
    /// </summary>
    EnCours = 1,

    /// <summary>
    /// Atteint (chauffeur arrivé à l'arrêt)
    /// </summary>
    Atteint = 2,

    /// <summary>
    /// Terminé (livraison/arrêt complété)
    /// </summary>
    Termine = 3,

    /// <summary>
    /// Annulé
    /// </summary>
    Annule = 4
}
