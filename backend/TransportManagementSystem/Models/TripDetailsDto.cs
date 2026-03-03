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

    // Truck information
    public int TruckId { get; set; }
    public TruckDto? Truck { get; set; }

    // Driver information (Employee with category "DRIVER")
    public int DriverId { get; set; }
    public DriverDto? Driver { get; set; }

    // Convoyeur information (Employee with category "CONVOYEUR")
    public int? ConvoyeurId { get; set; }
    public ConvoyeurDto? Convoyeur { get; set; }

    // Deliveries
    public List<DeliveryDetailsDto> Deliveries { get; set; }

    // Traject information
    public int? TrajectId { get; set; }

    // Audit information
    public int? CreatedBy { get; set; }
    public DateTime? CreatedAt { get; set; }
    public int? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
}