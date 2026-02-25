using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Services
{
    public interface INotificationService
    {
        Task NotifyTripStatusChanged(TripStatusChangeDto statusChange, int userId);
        Task NotifyTripCancelled(int tripId, string tripReference, string? message, string? driverName, string? truckImmatriculation, int userId);
        Task NotifyNewTripCreated(int tripId, string tripReference, int userId);
        Task SendNotificationToAll(TripNotificationDto notification);
        Task SendNotificationToUser(string userId, TripNotificationDto notification);
        Task SendNotificationToRole(string role, TripNotificationDto notification);
        Task<IEnumerable<Notification>> GetUserNotifications(int userId, NotificationFilterDto filter);
        Task<int> GetUnreadCount(int userId);
        Task MarkAsRead(int notificationId, int userId);
        Task MarkAllAsRead(int userId);
    }
}
