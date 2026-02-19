using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

public class TypeTruck
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    public string Type { get; set; }  

    [Required]
    public int Capacity { get; set; } 

    [Required]
    public string Unit { get; set; }  

    public ICollection<Truck>? Trucks { get; set; }  
}
