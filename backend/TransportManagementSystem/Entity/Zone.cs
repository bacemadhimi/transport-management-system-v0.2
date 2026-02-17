using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity;

public class Zone
{
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Location> Locations { get; set; } = new List<Location>();
    public ICollection<Driver> Drivers { get; set; } = new List<Driver>();
    public ICollection<Customer> Customers { get; set; } = new List<Customer>();
    public ICollection<Truck> Trucks { get; set; } = new List<Truck>();
}