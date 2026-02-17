namespace TransportManagementSystem.Models
{
    public class UpdateUserGroupDto
    {
        public string Name { get; set; }
        public List<string> Permissions { get; set; } = new();
    }

}
