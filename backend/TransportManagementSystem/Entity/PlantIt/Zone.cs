namespace TransportManagementSystem.Entity.PlantIt
{
    public class Zone
    {
        public int Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string ZoneType { get; set; }

        public int WarehouseId { get; set; }
        public Warehouse Warehouse { get; set; }

        public ICollection<Location> Locations { get; set; }
    }
}
