using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Models;

public class TripListDto
{
    public int Id { get; set; }
    public string BookingId { get; set; }
    public string TripReference { get; set; }
    public TripStatus TripStatus { get; set; }
    public DateTime EstimatedStartDate { get; set; }
    public DateTime EstimatedEndDate { get; set; }
    public DateTime? ActualStartDate { get; set; }
    public DateTime? ActualEndDate { get; set; }
    public decimal EstimatedDistance { get; set; }
    public decimal EstimatedDuration { get; set; }

    // Truck information
    public string? Truck { get; set; }
    public int? TruckId { get; set; } // Added for reference

    // Driver information (Employee with category "DRIVER")
    public string? Driver { get; set; }
    public int? DriverId { get; set; } // Added for reference
    public string? DriverPhone { get; set; } // Optional additional info
    public string? DriverPermisNumber { get; set; } // Driver's license/permit

    // Convoyeur information (Employee with category "CONVOYEUR")
    public string? Convoyeur { get; set; }
    public int? ConvoyeurId { get; set; }
    public string? ConvoyeurPhone { get; set; }
    public string? ConvoyeurMatricule { get; set; }

    // Message
    public string? Message { get; set; }

    // Delivery statistics
    public int DeliveryCount { get; set; }
    public int CompletedDeliveries { get; set; }

    // Traject information
    public int? TrajectId { get; set; }

    // Audit information
    public int? CreatedBy { get; set; }
    public DateTime? CreatedAt { get; set; }
    public int? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? CreatedByName { get; set; }
    public string? UpdatedByName { get; set; }
}