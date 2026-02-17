namespace TransportManagementSystem.Models;

public class CreateDeliveryDto
{
    public int CustomerId { get; set; }
    public int OrderId { get; set; }
    public string DeliveryAddress { get; set; }
    public int Sequence { get; set; }
    public DateTime? PlannedTime { get; set; }
    public string? Notes { get; set; }
}
