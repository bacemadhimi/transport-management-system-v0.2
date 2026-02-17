using static TransportManagementSystem.Entity.Delivery;

namespace TransportManagementSystem.Models;

public class RouteDeliveryDto
{
    public int Sequence { get; set; }
    public string CustomerName { get; set; }
    public string CustomerMatricule { get; set; }
    public string Address { get; set; }
    public string OrderReference { get; set; }
    public decimal OrderWeight { get; set; }
    public DateTime? PlannedTime { get; set; }
    public DeliveryStatus Status { get; set; }
    public string? Geolocation { get; set; }
}
