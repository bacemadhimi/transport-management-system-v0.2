<<<<<<< HEAD
﻿using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
=======
﻿namespace TransportManagementSystem.Entity;
>>>>>>> dev

public class Driver : Employee
{
<<<<<<< HEAD
    [Key]
    public int Id { get; set; }
    [Required]
    public string? Name { get; set; }
    [Required]
    [EmailAddress]
    public string Email { get; set; }
    public string PermisNumber { get; set; }
    public string Phone { get; set; }
    public string Status { get; set; }
    public int IdCamion { get; set; }
    public string phoneCountry { get; set; }

    // ✅ FIX PERMANENT: Link to User table for authentication
    [ForeignKey("User")]
    public int? user_id { get; set; }
    public virtual User? User { get; set; }

=======
    public Driver()
    {
        EmployeeCategory = "DRIVER";
    }
    public string? Status { get; set; }
    public int? IdCamion { get; set; }
>>>>>>> dev
    public virtual ICollection<DriverAvailability>? Availabilities { get; set; }
    public string? ImageBase64 { get; set; }
    public virtual ICollection<DriverGeographicalEntity> DriverGeographicalEntities { get; set; } = new List<DriverGeographicalEntity>();
}