<<<<<<< HEAD
<<<<<<< HEAD
﻿using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
=======
﻿namespace TransportManagementSystem.Entity;
>>>>>>> dev

public class Driver : Employee
{
<<<<<<< HEAD
=======
﻿using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using TransportManagementSystem.Entity;

public class Driver : Employee
{
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    [Key]
    public new int Id { get; set; }
    [Required]
    public new string? Name { get; set; }
    [Required]
    [EmailAddress]
    public new string Email { get; set; }
    public string PermisNumber { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int IdCamion { get; set; }

    // ✅ FIX PERMANENT: Link to User table for authentication
    [ForeignKey("User")]
    public int? user_id { get; set; }
    public virtual User? User { get; set; }

<<<<<<< HEAD
=======
    public Driver()
    {
        EmployeeCategory = "DRIVER";
    }
    public string? Status { get; set; }
    public int? IdCamion { get; set; }
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    public virtual ICollection<DriverAvailability>? Availabilities { get; set; }
    public string? ImageBase64 { get; set; }
    public new virtual ICollection<DriverGeographicalEntity> DriverGeographicalEntities { get; set; } = new List<DriverGeographicalEntity>();
}