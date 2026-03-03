using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

public class DriverGeographicalEntity
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int DriverId { get; set; }

    [ForeignKey("DriverId")]
    public virtual Driver Driver { get; set; }

    [Required]
    public int GeographicalEntityId { get; set; }

    [ForeignKey("GeographicalEntityId")]
    public virtual GeographicalEntity GeographicalEntity { get; set; }
}