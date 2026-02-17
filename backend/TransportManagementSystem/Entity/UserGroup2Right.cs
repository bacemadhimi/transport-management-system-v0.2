namespace TransportManagementSystem.Entity
{
    public class UserGroup2Right
    {
        public int UserGroupId { get; set; }
        public UserGroup UserGroup { get; set; }

        public int UserRightId { get; set; }
        public UserRight UserRight { get; set; }
    }

}
