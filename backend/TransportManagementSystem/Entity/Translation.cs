using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity
{
    public class Translation
    {
        [Key]
        public int Id { get; set; }
        public string Key { get; set; }
        public string Language { get; set; }
    }
}
