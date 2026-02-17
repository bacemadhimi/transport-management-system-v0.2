using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity;

public class UserGroup
{
    public int Id { get; set; }

    [Required]
    public string Name { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public bool IsSystemGroup { get; set; } = false;

    public ICollection<UserGroup2User> UserGroup2Users { get; set; }
        = new List<UserGroup2User>();


    public ICollection<UserGroup2Right> UserGroup2Right { get; set; }
        = new List<UserGroup2Right>();
}
