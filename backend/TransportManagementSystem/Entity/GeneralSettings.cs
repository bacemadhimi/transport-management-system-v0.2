using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity;

public class GeneralSettings
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string ParameterType { get; set; }   

    [Required]
    [MaxLength(50)]
    public string ParameterCode { get; set; }

    [Required]
    [MaxLength(200)]
    public string? Description { get; set; }

}