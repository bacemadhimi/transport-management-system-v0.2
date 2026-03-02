using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Models;

public class TripSummaryDto
{
    public int Id { get; set; }
    public string BookingId { get; set; }
    public string TripReference { get; set; }
    public TripStatus Status { get; set; }
    public decimal EstimatedDistance { get; set; }
    public decimal EstimatedDuration { get; set; }
    public DateTime EstimatedStartDate { get; set; }
    public DateTime EstimatedEndDate { get; set; }
    public DateTime? ActualStartDate { get; set; }
    public DateTime? ActualEndDate { get; set; }

    // Delivery statistics
    public int TotalDeliveries { get; set; }
    public int CompletedDeliveries { get; set; }
    public int PendingDeliveries { get; set; }
    public int FailedDeliveries { get; set; }
    public decimal TotalWeight { get; set; }

    // Vehicle and personnel information
    public string Truck { get; set; }
    public string TruckImmatriculation { get; set; } // More specific than just "Truck"

    // Driver information (Employee with category "DRIVER")
    public string Driver { get; set; }
    public int? DriverId { get; set; }
    public string? DriverPhone { get; set; }

    // Convoyeur information (Employee with category "CONVOYEUR")
    public string? Convoyeur { get; set; }
    public int? ConvoyeurId { get; set; }
    public string? ConvoyeurPhone { get; set; }

    // Additional summary info
    public decimal? AverageWeightPerDelivery => TotalDeliveries > 0 ? TotalWeight / TotalDeliveries : 0;
    public double? CompletionPercentage => TotalDeliveries > 0 ? (double)CompletedDeliveries / TotalDeliveries * 100 : 0;
}