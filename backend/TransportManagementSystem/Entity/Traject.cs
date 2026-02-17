using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity;

public class Traject
{
    public int Id { get; set; }

    [Required]
    public string Name { get; set; }
    public List<TrajectPoint> Points { get; set; } = new List<TrajectPoint>();

    public int? StartLocationId { get; set; }
    public int? EndLocationId { get; set; }
    public bool IsPredefined { get; set; } = false;
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

}