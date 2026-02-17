using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace TransportManagementSystem.Entity;

public class TrajectPoint
{
    public int Id { get; set; }

    [Required]
    public string Location { get; set; } 

    public int Order { get; set; }  

    [ForeignKey("Traject")]
    public int TrajectId { get; set; }
    [JsonIgnore]
    public Traject? Traject { get; set; }

    public int? ClientId { get; set; }

    public string? ClientName { get; set; }
}