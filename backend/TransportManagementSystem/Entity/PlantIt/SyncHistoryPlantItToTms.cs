namespace TransportManagementSystem.Entity.PlantIt
{
    public class SyncHistoryPlantItToTms
    {
        public int Id { get; set; }
        public string TableName { get; set; }
        public DateTime SyncDate { get; set; }
        public int TotalRecords { get; set; }
        public int ProcessedRecords { get; set; }
        public string Status { get; set; }
    }
}
