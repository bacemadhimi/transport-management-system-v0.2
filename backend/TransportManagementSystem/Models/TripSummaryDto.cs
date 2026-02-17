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
    public int TotalDeliveries { get; set; }
    public int CompletedDeliveries { get; set; }
    public int PendingDeliveries { get; set; }
    public int FailedDeliveries { get; set; }
    public decimal TotalWeight { get; set; }
    public string Truck { get; set; }
    public string Driver { get; set; }
}
