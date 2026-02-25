
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

public class Notification
{
    [Key]
    public int Id { get; set; }

    [Required]
    [StringLength(50)]
    public string Type { get; set; } = string.Empty; // "STATUS_CHANGE", "TRIP_CANCELLED", "NEW_TRIP"

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

    public bool IsRead { get; set; }

    [Required]
    public int UserId { get; set; } // The user who should receive this notification

    [ForeignKey("UserId")]
    public virtual User? User { get; set; }

    [StringLength(500)]
    public string? AdditionalData { get; set; } // JSON string for extra data

    public DateTime? ReadAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}

// For bulk operations
public class NotificationBatchDto
{
    public List<int> NotificationIds { get; set; } = new();
}

public class MarkAsReadDto
{
    public int NotificationId { get; set; }
}

public class NotificationFilterDto
{
    public bool? IsRead { get; set; }
    public string? Type { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int? TripId { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}