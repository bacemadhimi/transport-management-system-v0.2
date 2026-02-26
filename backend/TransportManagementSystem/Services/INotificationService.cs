using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Services;

public interface INotificationService
{
    // Send notifications
    Task NotifyTripStatusChanged(TripStatusChangeDto statusChange, int userId);
    Task NotifyTripCancelled(int tripId, string tripReference, string? message, string? driverName, string? truckImmatriculation, int userId);
    Task NotifyNewTripCreated(int tripId, string tripReference, int userId);

    // Get notifications for a user
    Task<IEnumerable<NotificationDto>> GetUserNotifications(int userId, NotificationFilterDto filter);

    // Get unread count for a user
    Task<int> GetUnreadCount(int userId);

    // Mark notifications as read
    Task MarkAsRead(int notificationId, int userId);
    Task MarkAllAsRead(int userId);

    // Broadcast notifications
    Task SendNotificationToAll(TripNotificationDto notification);
    Task SendNotificationToUser(string userId, TripNotificationDto notification);
    Task SendNotificationToRole(string role, TripNotificationDto notification);
    Task DeleteAllNotificationsForUser(int userId);
}