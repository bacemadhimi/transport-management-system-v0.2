using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Models;

public class UpdateTripDto
{
    public decimal EstimatedDistance { get; set; }
    public decimal EstimatedDuration { get; set; }
    public DateTime EstimatedStartDate { get; set; }
    public DateTime EstimatedEndDate { get; set; }
    public int TruckId { get; set; }
    public int DriverId { get; set; }
    public TripStatus TripStatus { get; set; }
    public List<CreateDeliveryDto>? Deliveries { get; set; }
    public int? TrajectId { get; set; }
    public int? ConvoyeurId { get; set; }
    
}
