namespace TransportManagementSystem.Entity;

public class Delivery
{
    public int Id { get; set; }
    public int TripId { get; set; }
    public Trip Trip { get; set; }

    public int CustomerId { get; set; }
    public Customer Customer { get; set; }

    public int OrderId { get; set; }
    public Order Order { get; set; } 

    public int Sequence { get; set; }
    public string DeliveryAddress { get; set; }
    public string? Geolocation { get; set; } 


    public DateTime? PlannedTime { get; set; }
    public DateTime? EstimatedArrivalTime { get; set; }
    public DateTime? ActualArrivalTime { get; set; }
    public DateTime? ActualDepartureTime { get; set; }

    public string? Notes { get; set; }
    public DeliveryStatus Status { get; set; }
    public string? DeliveryNotes { get; set; }
    public string? ProofOfDelivery { get; set; }

    public enum DeliveryStatus
    {
        Pending,
        EnRoute,
        Arrived,
        Delivered,
        Failed,
        Cancelled
    }
}
