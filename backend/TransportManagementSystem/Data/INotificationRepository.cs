using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Interfaces;

public interface INotificationRepository : IRepository<Notification>
{
    Task<IEnumerable<NotificationDto>> GetUserNotificationsAsync(int userId, NotificationFilterDto filter);
    Task<int> GetUnreadCountAsync(int userId);
    Task MarkAsReadAsync(int notificationId, int userId);
    Task MarkAllAsReadAsync(int userId);
    Task DeleteOldNotificationsAsync(int daysToKeep = 30);
    Task<Notification> CreateNotificationForAllUsers(Notification notification, List<int> userIds);
    Task DeleteAllNotificationsForUser(int userId);
}