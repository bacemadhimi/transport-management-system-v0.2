using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

/// <summary>
/// Représente une assignment de voyage à un chauffeur
/// Utilisé pour le workflow d'acceptation/refus
/// </summary>
public class TripAssignment
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int TripId { get; set; }

    [ForeignKey("TripId")]
    public virtual Trip? Trip { get; set; }

    [Required]
    public int DriverId { get; set; }

    [ForeignKey("DriverId")]
    public virtual Driver? Driver { get; set; }

    /// <summary>
    /// Statut de l'assignment (Pending, Accepted, Rejected)
    /// </summary>
    [Required]
    public AssignmentStatus Status { get; set; } = AssignmentStatus.Pending;

    /// <summary>
    /// Raison du refus (si rejeté)
    /// </summary>
    [StringLength(500)]
    public string? RejectionReason { get; set; }

    /// <summary>
    /// Code de la raison (BadWeather, Unavailable, Medical, Other)
    /// </summary>
    [StringLength(50)]
    public string? RejectionReasonCode { get; set; }

    /// <summary>
    /// Date d'assignment
    /// </summary>
    [Required]
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date de réponse du chauffeur
    /// </summary>
    public DateTime? RespondedAt { get; set; }

    /// <summary>
    /// Date limite pour répondre (optionnel)
    /// </summary>
    public DateTime? ExpiresAt { get; set; }

    /// <summary>
    /// Nombre de tentatives d'assignment
    /// </summary>
    public int AttemptCount { get; set; } = 1;

    /// <summary>
    /// ID du chauffeur précédent (si réassignment)
    /// </summary>
    public int? PreviousDriverId { get; set; }

    /// <summary>
    /// Notification envoyée (true/false)
    /// </summary>
    public bool NotificationSent { get; set; } = false;

    /// <summary>
    /// Date de création
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date de mise à jour
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Statut de l'assignment
/// </summary>
public enum AssignmentStatus
{
    Pending,      // En attente de réponse du chauffeur
    Accepted,     // Chauffeur a accepté
    Rejected,     // Chauffeur a refusé
    Expired,      // Délai dépassé
    Cancelled     // Assignment annulée par admin
}

/// <summary>
/// Raisons de refus possibles
/// </summary>
public enum RejectionReasonCode
{
    BadWeather,           // Mauvais temps
    Unavailable,          // Camion/Chauffeur non disponible
    Medical,              // Raison médicale
    PersonalEmergency,    // Urgence personnelle
    RouteIssue,           // Problème d'itinéraire
    VehicleMaintenance,   // Maintenance véhicule
    Other                 // Autre
}
