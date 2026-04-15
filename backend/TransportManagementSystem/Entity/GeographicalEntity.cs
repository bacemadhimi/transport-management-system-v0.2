using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

public class GeographicalEntity
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; }

    [Required]
    public int LevelId { get; set; }

    [ForeignKey("LevelId")]
    public virtual GeographicalLevel Level { get; set; }

    public int? ParentId { get; set; }

    [ForeignKey("ParentId")]
    public virtual GeographicalEntity Parent { get; set; }

    // Coordinates - required if parent level is mappable
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation property for children
    public virtual ICollection<GeographicalEntity> Children { get; set; }
    public virtual ICollection<TruckGeographicalEntity> TruckGeographicalEntities { get; set; }
}
