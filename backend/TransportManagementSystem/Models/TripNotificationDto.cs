namespace TransportManagementSystem.Models;

public class NotificationDto
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public int? TripId { get; set; }
    public string? TripReference { get; set; }
    public string? OldStatus { get; set; }
    public string? NewStatus { get; set; }

    // Driver information
    public string? DriverName { get; set; }
    public int? DriverId { get; set; }

    // Convoyeur information
    public string? ConvoyeurName { get; set; }
    public int? ConvoyeurId { get; set; }

    // Truck information
    public string? TruckImmatriculation { get; set; }
    public int? TruckId { get; set; }

    public bool IsRead { get; set; }
    public string? AdditionalData { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class NotificationFilterDto
{
    public bool? IsRead { get; set; }
    public string? Type { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int? TripId { get; set; }
    public int? DriverId { get; set; } // Added for filtering by driver
    public int? ConvoyeurId { get; set; } // Added for filtering by convoyeur
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class TripNotificationDto
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty; // "STATUS_CHANGE", "TRIP_CANCELLED", "NEW_TRIP", etc.
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public int? TripId { get; set; }
    public string? TripReference { get; set; }
    public string? OldStatus { get; set; }
    public string? NewStatus { get; set; }

    // Driver information
    public string? DriverName { get; set; }
    public int? DriverId { get; set; }

    // Convoyeur information
    public string? ConvoyeurName { get; set; }
    public int? ConvoyeurId { get; set; }

    // Truck information
    public string? TruckImmatriculation { get; set; }
    public int? TruckId { get; set; }

    public int? CancelledTripsCount { get; set; }
    public bool IsRead { get; set; }
    public string? UserId { get; set; }
    public Dictionary<string, object>? AdditionalData { get; set; }
}

public class TripStatusChangeDto
{
    public int TripId { get; set; }
    public string TripReference { get; set; } = string.Empty;
    public string OldStatus { get; set; } = string.Empty;
    public string NewStatus { get; set; } = string.Empty;

    // Driver information
    public string? DriverName { get; set; }
    public int? DriverId { get; set; }

    // Convoyeur information
    public string? ConvoyeurName { get; set; }
    public int? ConvoyeurId { get; set; }

    // Truck information
    public string? TruckImmatriculation { get; set; }
    public int? TruckId { get; set; }

    public string? Message { get; set; }
    public DateTime ChangedAt { get; set; }
    public string ChangedBy { get; set; } = string.Empty;
}