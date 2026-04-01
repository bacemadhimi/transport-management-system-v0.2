using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using TransportManagementSystem.Entity;

public class Driver : Employee
{
    [Key]
    public new int Id { get; set; }
    [Required]
    public new string? Name { get; set; }
    [Required]
    [EmailAddress]
    public new string Email { get; set; }
    public string PermisNumber { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int IdCamion { get; set; }

    // ✅ FIX PERMANENT: Link to User table for authentication
    [ForeignKey("User")]
    public int? user_id { get; set; }
    public virtual User? User { get; set; }

    public virtual ICollection<DriverAvailability>? Availabilities { get; set; }
    public string? ImageBase64 { get; set; }
    public new virtual ICollection<DriverGeographicalEntity> DriverGeographicalEntities { get; set; } = new List<DriverGeographicalEntity>();
}