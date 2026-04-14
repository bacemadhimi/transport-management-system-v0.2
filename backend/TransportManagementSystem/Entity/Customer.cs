using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

public class Customer
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    public DataSource SourceSystem { get; set; } = DataSource.TMS;

    [StringLength(50)]
    public string? ExternalId { get; set; }

    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [StringLength(20)]
    public string? Phone { get; set; }

    [StringLength(20)]
    public string? PhoneCountry { get; set; }

    [StringLength(100)]
    [EmailAddress]
    public string? Email { get; set; }

    [Required]
    [StringLength(100)]
    public string Matricule { get; set; } = string.Empty;

    [StringLength(100)]
    public string? Contact { get; set; }

    // GPS Coordinates
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    
    [StringLength(255)]
    public string? Address { get; set; }

    // Navigation properties
    public ICollection<Order> Orders { get; set; } = new List<Order>();

    // Geographical entities relationship (like trucks)
    public virtual ICollection<CustomerGeographicalEntity> CustomerGeographicalEntities { get; set; } = new List<CustomerGeographicalEntity>();

    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}