using TransportManagementSystem.Entity;

public class MaintenanceDto
{
    public int Id { get; set; }
    public int TripId { get; set; }
    public int VendorId { get; set; }
    public int MechanicId { get; set; }
    public string Status { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int OdometerReading { get; set; }
    public float TotalCost { get; set; }
    public string ServiceDetails { get; set; }
    public string PartsName { get; set; }
    public int Qty { get; set; }
    public Maintenance.NotificationTypeEnum NotificationType { get; set; }
    public string Members { get; set; }

    public string MaintenanceType { get; set; } = "General"; // "Vidange", "Révision", "Réparation", "Général"
    public DateTime? NextVidangeDate { get; set; }
    public int? NextVidangeKm { get; set; }
    public bool IsVidange { get; set; }
    public string? OilType { get; set; }
    public decimal? OilQuantity { get; set; }
    public string? OilFilter { get; set; }
}
