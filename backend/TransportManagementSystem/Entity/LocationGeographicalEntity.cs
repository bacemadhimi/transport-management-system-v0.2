using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

public class LocationGeographicalEntity
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int LocationId { get; set; }

    [ForeignKey("LocationId")]
    public virtual Location Location { get; set; }

    [Required]
    public int GeographicalEntityId { get; set; }

    [ForeignKey("GeographicalEntityId")]
    public virtual GeographicalEntity GeographicalEntity { get; set; }
}