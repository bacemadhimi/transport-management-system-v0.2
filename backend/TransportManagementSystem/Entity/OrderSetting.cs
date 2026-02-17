using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity
{
    public class OrderSetting
    {
        [Key]
        public int Id { get; set; }
        public bool AllowEditOrder { get; set; } = true;

        public bool AllowEditDeliveryDate { get; set; } = true;

        public bool AllowLoadLateOrders { get; set; } = true;
        public bool AcceptOrdersWithoutAddress { get; set; } = true;
        public string LoadingUnit { get; set; } = "palette"; 
        public int PlanningHorizon { get; set; } = 30;

    }
}
