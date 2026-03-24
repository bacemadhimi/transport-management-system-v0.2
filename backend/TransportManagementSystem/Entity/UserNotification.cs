namespace TransportManagementSystem.Entity;

public class UserNotification
{
    public int Id { get; set; }
    public int NotificationId { get; set; }
    public Notification Notification { get; set; } = null!;
    public int UserId { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
