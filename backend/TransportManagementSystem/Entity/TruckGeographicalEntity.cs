using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

public class TruckGeographicalEntity
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int TruckId { get; set; }

    [ForeignKey("TruckId")]
    public virtual Truck Truck { get; set; }

    [Required]
    public int GeographicalEntityId { get; set; }

    [ForeignKey("GeographicalEntityId")]
    public virtual GeographicalEntity GeographicalEntity { get; set; }
}
