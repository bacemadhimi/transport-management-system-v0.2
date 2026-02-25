// Entities/Notification.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using TransportManagementSystem.Entity;

public class Notification
{
    [Key]
    public int Id { get; set; }

    [Required]
    [StringLength(50)]
    public string Type { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [StringLength(500)]
    public string Message { get; set; } = string.Empty;

    public DateTime Timestamp { get; set; }

    public int? TripId { get; set; }

    [StringLength(50)]
    public string? TripReference { get; set; }

    [StringLength(50)]
    public string? OldStatus { get; set; }

    [StringLength(50)]
    public string? NewStatus { get; set; }

    [StringLength(100)]
    public string? DriverName { get; set; }

    [StringLength(50)]
    public string? TruckImmatriculation { get; set; }

    // REMOVE THESE LINES:
    // public bool IsRead { get; set; }
    // public int UserId { get; set; }
    // public DateTime? ReadAt { get; set; }

    [StringLength(500)]
    public string? AdditionalData { get; set; }

    public DateTime CreatedAt { get; set; }

    // Navigation property for user notifications
    public virtual ICollection<UserNotification> UserNotifications { get; set; } = new List<UserNotification>();
}

// Add this new entity
public class UserNotification
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int NotificationId { get; set; }

    [Required]
    public int UserId { get; set; }

    public bool IsRead { get; set; }

    public DateTime? ReadAt { get; set; }

    [ForeignKey("NotificationId")]
    public virtual Notification? Notification { get; set; }

    [ForeignKey("UserId")]
    public virtual User? User { get; set; }
}