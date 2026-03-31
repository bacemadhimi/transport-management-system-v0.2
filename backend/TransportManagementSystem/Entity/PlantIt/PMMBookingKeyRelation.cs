using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity.PlantIt
{
    public class PMMBookingKeyRelation
    {
        [Key]
        public int nKey { get; set; }
        public int nBookingKeyLink { get; set; }
        public int nBookingTypeLink { get; set; }
        public int tLastModified { get; set; }
    }
}
