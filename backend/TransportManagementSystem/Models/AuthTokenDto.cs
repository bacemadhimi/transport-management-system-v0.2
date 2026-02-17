namespace TransportManagementSystem.Models
{
    public class AuthTokenDto
    {
        public int Id { get; set; }
        public string Email { get; set; }
        public string Token { get; set; }
        public List<string> Roles { get; set; } = new();
        public List<string> Permissions { get; set; } = new();
        public DateTime Expiry { get; set; }
    }

}
