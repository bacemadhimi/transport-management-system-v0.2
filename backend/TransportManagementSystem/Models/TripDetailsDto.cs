using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Models;

public class TripDetailsDto
{
    public int Id { get; set; }
    public string BookingId { get; set; }
    public string TripReference { get; set; }
    public TripStatus TripStatus { get; set; }
    public decimal EstimatedDistance { get; set; }
    public decimal EstimatedDuration { get; set; }
    public DateTime EstimatedStartDate { get; set; }
    public DateTime EstimatedEndDate { get; set; }
    public DateTime? ActualStartDate { get; set; }
    public DateTime? ActualEndDate { get; set; }
    public int TruckId { get; set; }
    public TruckDto? Truck { get; set; }
    public int DriverId { get; set; }
    public DriverDto? Driver { get; set; }
    public List<DeliveryDetailsDto> Deliveries { get; set; }
    public int? TrajectId { get; set; }
    public int? ConvoyeurId { get; set; }
    public int? CreatedBy { get; set; } 
    public DateTime? CreatedAt { get; set; } 

    public int? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
