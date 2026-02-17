using static TransportManagementSystem.Entity.Delivery;

namespace TransportManagementSystem.Models;

public class DeliveryDetailsDto
{
    public int Id { get; set; }
    public int Sequence { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerMatricule { get; set; }
    public int OrderId { get; set; }
    public string? OrderReference { get; set; }
    public decimal OrderWeight { get; set; }
    public string DeliveryAddress { get; set; }
    public DateTime? PlannedTime { get; set; }
    public DateTime? ActualArrivalTime { get; set; }
    public DateTime? ActualDepartureTime { get; set; }
    public DeliveryStatus Status { get; set; }
    public string? Notes { get; set; }
}
