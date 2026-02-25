using Microsoft.AspNetCore.SignalR;
using Newtonsoft.Json;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Hubs;
using TransportManagementSystem.Interfaces;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Services;

public class NotificationService : INotificationService
{
    private readonly IHubContext<TripHub> _hubContext;
    private readonly INotificationRepository _notificationRepository;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        IHubContext<TripHub> hubContext,
        INotificationRepository notificationRepository,
        ILogger<NotificationService> logger)
    {
        _hubContext = hubContext;
        _notificationRepository = notificationRepository;
        _logger = logger;
    }

    public async Task NotifyTripStatusChanged(TripStatusChangeDto statusChange, int userId)
    {
        try
        {
            // Create notification entity
            var notification = new Notification
            {
                Type = "STATUS_CHANGE",
                Title = "Trip Status Changed",
                Message = $"Trip {statusChange.TripReference} status changed from {statusChange.OldStatus} to {statusChange.NewStatus}",
                Timestamp = DateTime.UtcNow,
                TripId = statusChange.TripId,
                TripReference = statusChange.TripReference,
                OldStatus = statusChange.OldStatus,
                NewStatus = statusChange.NewStatus,
                DriverName = statusChange.DriverName,
                TruckImmatriculation = statusChange.TruckImmatriculation,
                IsRead = false,
                UserId = userId,
                AdditionalData = JsonConvert.SerializeObject(new
                {
                    ChangedAt = statusChange.ChangedAt,
                    ChangedBy = statusChange.ChangedBy
                }),
                CreatedAt = DateTime.UtcNow
            };

            // Save to database
            await _notificationRepository.AddAsync(notification);
            await _notificationRepository.SaveChangesAsync();

            // Send real-time notification via SignalR
            var notificationDto = new TripNotificationDto
            {
                Id = notification.Id,
                Type = notification.Type,
                Title = notification.Title,
                Message = notification.Message,
                Timestamp = notification.Timestamp,
                TripId = notification.TripId,
                TripReference = notification.TripReference,
                OldStatus = notification.OldStatus,
                NewStatus = notification.NewStatus,
                DriverName = notification.DriverName,
                TruckImmatriculation = notification.TruckImmatriculation,
                IsRead = notification.IsRead
            };

            // Send to specific user
            await _hubContext.Clients.User(userId.ToString()).SendAsync("ReceiveNotification", notificationDto);

            // Also send to trip group
            await _hubContext.Clients.Group($"trip-{statusChange.TripId}")
                .SendAsync("ReceiveNotification", notificationDto);

            // Update unread count for user
            var unreadCount = await GetUnreadCount(userId);
            await _hubContext.Clients.User(userId.ToString()).SendAsync("UpdateUnreadCount", unreadCount);

            _logger.LogInformation($"Saved and sent status change notification for trip {statusChange.TripReference} to user {userId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving/sending trip status change notification");
        }
    }

    public async Task NotifyTripCancelled(int tripId, string tripReference, string? message, string? driverName, string? truckImmatriculation, int userId)
    {
        try
        {
            var notification = new Notification
            {
                Type = "TRIP_CANCELLED",
                Title = "Trip Cancelled",
                Message = $"Trip {tripReference} has been cancelled. {message}",
                Timestamp = DateTime.UtcNow,
                TripId = tripId,
                TripReference = tripReference,
                DriverName = driverName,
                TruckImmatriculation = truckImmatriculation,
                IsRead = false,
                UserId = userId,
                AdditionalData = JsonConvert.SerializeObject(new
                {
                    CancellationMessage = message ?? "No message provided"
                }),
                CreatedAt = DateTime.UtcNow
            };

            await _notificationRepository.AddAsync(notification);
            await _notificationRepository.SaveChangesAsync();

            var notificationDto = new TripNotificationDto
            {
                Id = notification.Id,
                Type = notification.Type,
                Title = notification.Title,
                Message = notification.Message,
                Timestamp = notification.Timestamp,
                TripId = notification.TripId,
                TripReference = notification.TripReference,
                DriverName = notification.DriverName,
                TruckImmatriculation = notification.TruckImmatriculation,
                IsRead = notification.IsRead
            };

            await _hubContext.Clients.User(userId.ToString()).SendAsync("ReceiveNotification", notificationDto);
            await _hubContext.Clients.Group($"trip-{tripId}").SendAsync("ReceiveNotification", notificationDto);

            var unreadCount = await GetUnreadCount(userId);
            await _hubContext.Clients.User(userId.ToString()).SendAsync("UpdateUnreadCount", unreadCount);

            _logger.LogInformation($"Saved and sent cancellation notification for trip {tripReference} to user {userId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving/sending trip cancellation notification");
        }
    }

    public async Task NotifyNewTripCreated(int tripId, string tripReference, int userId)
    {
        try
        {
            var notification = new Notification
            {
                Type = "NEW_TRIP",
                Title = "New Trip Created",
                Message = $"New trip {tripReference} has been created",
                Timestamp = DateTime.UtcNow,
                TripId = tripId,
                TripReference = tripReference,
                IsRead = false,
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };

            await _notificationRepository.AddAsync(notification);
            await _notificationRepository.SaveChangesAsync();

            var notificationDto = new TripNotificationDto
            {
                Id = notification.Id,
                Type = notification.Type,
                Title = notification.Title,
                Message = notification.Message,
                Timestamp = notification.Timestamp,
                TripId = notification.TripId,
                TripReference = notification.TripReference,
                IsRead = notification.IsRead
            };

            await _hubContext.Clients.User(userId.ToString()).SendAsync("ReceiveNotification", notificationDto);

            var unreadCount = await GetUnreadCount(userId);
            await _hubContext.Clients.User(userId.ToString()).SendAsync("UpdateUnreadCount", unreadCount);

            _logger.LogInformation($"Saved and sent new trip notification for trip {tripReference} to user {userId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving/sending new trip notification");
        }
    }

    public async Task<IEnumerable<Notification>> GetUserNotifications(int userId, NotificationFilterDto filter)
    {
        return await _notificationRepository.GetUserNotificationsAsync(userId, filter);
    }

    public async Task<int> GetUnreadCount(int userId)
    {
        return await _notificationRepository.GetUnreadCountAsync(userId);
    }

    public async Task MarkAsRead(int notificationId, int userId)
    {
        await _notificationRepository.MarkAsReadAsync(notificationId, userId);

        // Update unread count via SignalR
        var unreadCount = await GetUnreadCount(userId);
        await _hubContext.Clients.User(userId.ToString()).SendAsync("UpdateUnreadCount", unreadCount);
    }

    public async Task MarkAllAsRead(int userId)
    {
        await _notificationRepository.MarkAllAsReadAsync(userId);

        var unreadCount = await GetUnreadCount(userId);
        await _hubContext.Clients.User(userId.ToString()).SendAsync("UpdateUnreadCount", unreadCount);
    }

    public async Task SendNotificationToAll(TripNotificationDto notification)
    {
        try
        {
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", notification);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending notification to all");
        }
    }

    public async Task SendNotificationToUser(string userId, TripNotificationDto notification)
    {
        try
        {
            await _hubContext.Clients.User(userId).SendAsync("ReceiveNotification", notification);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending notification to user {UserId}", userId);
        }
    }

    public async Task SendNotificationToRole(string role, TripNotificationDto notification)
    {
        try
        {
            await _hubContext.Clients.Group($"role-{role}").SendAsync("ReceiveNotification", notification);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending notification to role {Role}", role);
        }
    }
}
