namespace TransportManagementSystem.Entity.PlantIt
{
    public class Warehouse
    {
        public int Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public WarehouseType Type { get; set; } // Nouveau champ type

        public ICollection<Zone> Zones { get; set; }
    }

    public enum WarehouseType
    {
        RawMaterial,
        FinishedProduct
    }
}
