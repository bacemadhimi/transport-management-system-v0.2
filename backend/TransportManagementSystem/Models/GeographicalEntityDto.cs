using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Models;

public class GeographicalEntityDto
{
    /// <summary>
    /// ID of the entity (used for updates)
    /// </summary>
    public int? Id { get; set; }

    /// <summary>
    /// Name of the geographical entity
    /// </summary>
    [Required(ErrorMessage = "Le nom est requis")]
    [MaxLength(100, ErrorMessage = "Le nom ne doit pas dépasser 100 caractères")]
    public string Name { get; set; }

    /// <summary>
    /// ID of the geographical level
    /// </summary>
    [Required(ErrorMessage = "Le niveau est requis")]
    public int LevelId { get; set; }

    /// <summary>
    /// ID of the parent entity (optional)
    /// </summary>
    public int? ParentId { get; set; }

    /// <summary>
    /// Latitude coordinate
    /// </summary>
    [Range(-90, 90, ErrorMessage = "La latitude doit être comprise entre -90 et 90")]
    public decimal? Latitude { get; set; }

    /// <summary>
    /// Longitude coordinate
    /// </summary>
    [Range(-180, 180, ErrorMessage = "La longitude doit être comprise entre -180 et 180")]
    public decimal? Longitude { get; set; }

    /// <summary>
    /// Whether the entity is active
    /// </summary>
    public bool IsActive { get; set; } = true;
}