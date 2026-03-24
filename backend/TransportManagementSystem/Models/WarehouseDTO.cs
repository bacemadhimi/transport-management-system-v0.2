using TransportManagementSystem.Entity.PlantIt;

namespace TransportManagementSystem.Models
{
    public class WarehouseDTO
    {
        public int Id { get; set; }           // ajouté
        public string Code { get; set; }
        public string Name { get; set; }
        public WarehouseType Type { get; set; }
        public List<ZoneDTO> Zones { get; set; } = new List<ZoneDTO>(); // ajouté
    }

    // DTOs/ZoneDTO.cs
    public class ZoneDTO
    {
        public int Id { get; set; }          // ajouté
        public string Code { get; set; }
        public string Name { get; set; }
        public string ZoneType { get; set; }
        public int WarehouseId { get; set; }
    }
}
