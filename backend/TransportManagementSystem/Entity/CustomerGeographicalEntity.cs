using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

public class CustomerGeographicalEntity
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int CustomerId { get; set; }

    [ForeignKey("CustomerId")]
    public virtual Customer Customer { get; set; }

    [Required]
    public int GeographicalEntityId { get; set; }

    [ForeignKey("GeographicalEntityId")]
    public virtual GeographicalEntity GeographicalEntity { get; set; }
}
