using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

public class DayOff
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    public string Country { get; set; }

    [Required]
    public DateTime Date { get; set; }

    [Required]
    public string Name { get; set; } 

    public string? Description { get; set; } 

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
}
