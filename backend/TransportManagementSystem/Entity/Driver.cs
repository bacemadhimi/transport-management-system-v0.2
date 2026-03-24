using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

public class Driver
{
    [Key]
    public int Id { get; set; }
    [Required]
    public string? Name { get; set; }
    [Required]
    [EmailAddress]
    public string Email { get; set; }
    public string PermisNumber { get; set; }
    public string Phone { get; set; }
    public string Status { get; set; }
    public int IdCamion { get; set; }
    public string phoneCountry { get; set; }

    // ✅ FIX PERMANENT: Link to User table for authentication
    [ForeignKey("User")]
    public int? user_id { get; set; }
    public virtual User? User { get; set; }

    public virtual ICollection<DriverAvailability>? Availabilities { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsEnable { get; set; } = true;

    public int? ZoneId { get; set; }
    public Zone? Zone { get; set; }

    public int? CityId { get; set; }
    public City? City { get; set; }
    public string? ImageBase64 { get; set; }
}
