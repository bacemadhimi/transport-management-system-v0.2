using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity.PlantIt
{
    public class PMMBookingType
    {
        [Key]
        public int nKey { get; set; }
        public int nGroupLink { get; set; }
        public string szName { get; set; }
        public int nTextLink { get; set; }
        public int nBookingUsage { get; set; }
        public int nUserRightLink { get; set; }
        public byte nBookingSystem { get; set; }
        public bool bAllowIncompleteBooking { get; set; }
        public bool bActive { get; set; }
        public int nMemoLink { get; set; }
        public string szUserParam1 { get; set; }
        public string szUserParam2 { get; set; }
        public string szApplication { get; set; }
        public int tLastModified { get; set; }
    }
}
