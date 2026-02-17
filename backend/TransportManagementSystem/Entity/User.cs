using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; }
    public string? Password { get; set; }

    public string? ProfileImage { get; set; }

    public string? Name { get; set; }
    public string? Phone { get; set; }
    public string? phoneCountry { get; set; }


    public ICollection<UserGroup2User> UserGroup2Users { get; set; } = new List<UserGroup2User>();

}
