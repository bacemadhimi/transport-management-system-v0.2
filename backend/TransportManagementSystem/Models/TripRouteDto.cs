using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Models;

public class TripRouteDto
{
    public int TripId { get; set; }
    public string BookingId { get; set; }
    public string TripReference { get; set; }
    public TripStatus Status { get; set; }
    public decimal EstimatedDistance { get; set; }
    public decimal EstimatedDuration { get; set; }
    public List<RouteDeliveryDto> Deliveries { get; set; }
}
