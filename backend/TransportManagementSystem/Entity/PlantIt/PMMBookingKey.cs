using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity.PlantIt
{
    public class PMMBookingKey
    {
        [Key]
        public int nKey { get; set; }
        public string szName { get; set; }
        public int nGroupLink { get; set; }
        public int nTextLink { get; set; }
        public int nMemoLink { get; set; }
        public string szUserParam1 { get; set; }
        public string szUserParam2 { get; set; }
        public int tLastModified { get; set; }
    }
}
