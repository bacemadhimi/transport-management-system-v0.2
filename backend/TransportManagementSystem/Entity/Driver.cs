namespace TransportManagementSystem.Entity;

public class Driver : Employee
{
    public Driver()
    {
        EmployeeCategory = "DRIVER";
    }
    public string? Status { get; set; }
    public int? IdCamion { get; set; }
    public virtual ICollection<DriverAvailability>? Availabilities { get; set; }
    public string? ImageBase64 { get; set; }
    public virtual ICollection<DriverGeographicalEntity> DriverGeographicalEntities { get; set; } = new List<DriverGeographicalEntity>();
}