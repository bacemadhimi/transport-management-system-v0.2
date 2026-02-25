using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Hubs;
using TransportManagementSystem.Interfaces;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Services;

public class NotificationService : INotificationService
{
    private readonly IHubContext<TripHub> _hubContext;
    private readonly INotificationRepository _notificationRepository;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        IHubContext<TripHub> hubContext,
        INotificationRepository notificationRepository,
        ApplicationDbContext context,
        ILogger<NotificationService> logger)
    {
        _hubContext = hubContext;
        _notificationRepository = notificationRepository;
        _context = context;
        _logger = logger;
    }

    public async Task NotifyTripStatusChanged(TripStatusChangeDto statusChange, int userId)
    {
        try
        {
            // Create notification entity (no user association)
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
                AdditionalData = JsonConvert.SerializeObject(new
                {
                    ChangedAt = statusChange.ChangedAt,
                    ChangedBy = statusChange.ChangedBy
                }),
                CreatedAt = DateTime.UtcNow
            };

            // Save to database (uncomment if you want to save status changes)
            // await _notificationRepository.AddAsync(notification);
            // await _notificationRepository.SaveChangesAsync();

            // Create DTO for SignalR
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
                IsRead = false // Default for broadcast
            };

            // Send to ALL connected clients
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", notificationDto);
            _logger.LogInformation($"✅ Sent status change to ALL clients for trip {statusChange.TripReference}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending trip status change notification");
        }
    }

    public async Task NotifyTripCancelled(int tripId, string tripReference, string? message, string? driverName, string? truckImmatriculation, int userId)
    {
        try
        {
            // Create notification (no user association)
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
                AdditionalData = JsonConvert.SerializeObject(new
                {
                    CancellationMessage = message ?? "No message provided"
                }),
                CreatedAt = DateTime.UtcNow
            };

            // Save to database
            await _notificationRepository.AddAsync(notification);
            await _notificationRepository.SaveChangesAsync();

            // Get all active users
            var allUserIds = await _context.Users
                // Assuming you have an IsActive field
                .Select(u => u.Id)
                .ToListAsync();

            // Create UserNotification entries for each user (unread by default)
            var userNotifications = allUserIds.Select(uid => new UserNotification
            {
                NotificationId = notification.Id,
                UserId = uid,
                IsRead = false
            }).ToList();

            await _context.UserNotifications.AddRangeAsync(userNotifications);
            await _context.SaveChangesAsync();

            // Create DTO for SignalR
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
                IsRead = false // Default for broadcast
            };

            // Broadcast to ALL clients
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", notificationDto);
            await _hubContext.Clients.Group($"trip-{tripId}").SendAsync("ReceiveNotification", notificationDto);

            _logger.LogInformation($"✅ Sent cancellation notification for trip {tripReference} to ALL clients");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending trip cancellation notification");
        }
    }

    public async Task NotifyNewTripCreated(int tripId, string tripReference, int userId)
    {
        try
        {
            // Create notification (no user association)
            var notification = new Notification
            {
                Type = "NEW_TRIP",
                Title = "New Trip Created",
                Message = $"New trip {tripReference} has been created",
                Timestamp = DateTime.UtcNow,
                TripId = tripId,
                TripReference = tripReference,
                CreatedAt = DateTime.UtcNow
            };

            await _notificationRepository.AddAsync(notification);
            await _notificationRepository.SaveChangesAsync();

            // Get all active users
            var allUserIds = await _context.Users
               
                .Select(u => u.Id)
                .ToListAsync();

            // Create UserNotification entries for each user
            var userNotifications = allUserIds.Select(uid => new UserNotification
            {
                NotificationId = notification.Id,
                UserId = uid,
                IsRead = false
            }).ToList();

            await _context.UserNotifications.AddRangeAsync(userNotifications);
            await _context.SaveChangesAsync();

            // Create DTO for SignalR
            var notificationDto = new TripNotificationDto
            {
                Id = notification.Id,
                Type = notification.Type,
                Title = notification.Title,
                Message = notification.Message,
                Timestamp = notification.Timestamp,
                TripId = notification.TripId,
                TripReference = notification.TripReference,
                IsRead = false
            };

            // Broadcast to ALL clients
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", notificationDto);

            _logger.LogInformation($"✅ Sent new trip notification for trip {tripReference} to ALL clients");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending new trip notification");
        }
    }

    public async Task<IEnumerable<NotificationDto>> GetUserNotifications(int userId, NotificationFilterDto filter)
    {
        var query = from n in _context.Notifications
                    join un in _context.UserNotifications on n.Id equals un.NotificationId
                    where un.UserId == userId
                    orderby n.Timestamp descending
                    select new NotificationDto
                    {
                        Id = n.Id,
                        Type = n.Type,
                        Title = n.Title,
                        Message = n.Message,
                        Timestamp = n.Timestamp,
                        TripId = n.TripId,
                        TripReference = n.TripReference,
                        OldStatus = n.OldStatus,
                        NewStatus = n.NewStatus,
                        DriverName = n.DriverName,
                        TruckImmatriculation = n.TruckImmatriculation,
                        IsRead = un.IsRead,
                        AdditionalData = n.AdditionalData,
                        CreatedAt = n.CreatedAt
                    };

        // Apply filters
        if (filter.IsRead.HasValue)
            query = query.Where(n => n.IsRead == filter.IsRead.Value);

        if (!string.IsNullOrEmpty(filter.Type))
            query = query.Where(n => n.Type == filter.Type);

        if (filter.FromDate.HasValue)
            query = query.Where(n => n.Timestamp >= filter.FromDate.Value);

        if (filter.ToDate.HasValue)
            query = query.Where(n => n.Timestamp <= filter.ToDate.Value);

        // Pagination
        if (filter.PageSize > 0)
        {
            query = query
                .Skip(filter.PageIndex * filter.PageSize)
                .Take(filter.PageSize);
        }

        return await query.ToListAsync();
    }

    public async Task<int> GetUnreadCount(int userId)
    {
        return await _context.UserNotifications
            .CountAsync(un => un.UserId == userId && !un.IsRead);
    }

    public async Task MarkAsRead(int notificationId, int userId)
    {
        var userNotification = await _context.UserNotifications
            .FirstOrDefaultAsync(un => un.NotificationId == notificationId && un.UserId == userId);

        if (userNotification != null)
        {
            userNotification.IsRead = true;
            userNotification.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Update unread count via SignalR for this specific user
            var unreadCount = await GetUnreadCount(userId);
            await _hubContext.Clients.User(userId.ToString()).SendAsync("UpdateUnreadCount", unreadCount);

            _logger.LogInformation($"✅ Notification {notificationId} marked as read by user {userId}");
        }
    }

    public async Task MarkAllAsRead(int userId)
    {
        var userNotifications = await _context.UserNotifications
            .Where(un => un.UserId == userId && !un.IsRead)
            .ToListAsync();

        foreach (var un in userNotifications)
        {
            un.IsRead = true;
            un.ReadAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        // Update unread count via SignalR
        var unreadCount = 0;
        await _hubContext.Clients.User(userId.ToString()).SendAsync("UpdateUnreadCount", unreadCount);

        _logger.LogInformation($"✅ All notifications marked as read by user {userId}");
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
    public async Task DeleteAllNotificationsForUser(int userId)
    {
        try
        {
            _logger.LogInformation($"📝 Deleting all notifications for user {userId}");

            // Get all user notifications for this user
            var userNotifications = await _context.UserNotifications
                .Where(un => un.UserId == userId)
                .ToListAsync();

            if (userNotifications.Any())
            {
                // Get notification IDs that are only used by this user
                var notificationIds = userNotifications.Select(un => un.NotificationId).ToList();

                // Check which notifications are only used by this user
                var notificationsToDelete = new List<Notification>();

                foreach (var notificationId in notificationIds)
                {
                    var otherUsersCount = await _context.UserNotifications
                        .CountAsync(un => un.NotificationId == notificationId && un.UserId != userId);

                    // If no other users have this notification, delete it
                    if (otherUsersCount == 0)
                    {
                        var notification = await _context.Notifications
                            .FindAsync(notificationId);
                        if (notification != null)
                            notificationsToDelete.Add(notification);
                    }
                }

                // Delete user notifications
                _context.UserNotifications.RemoveRange(userNotifications);

                // Delete notifications that are no longer referenced
                if (notificationsToDelete.Any())
                    _context.Notifications.RemoveRange(notificationsToDelete);

                await _context.SaveChangesAsync();

                _logger.LogInformation($"✅ Deleted {userNotifications.Count} user notifications and {notificationsToDelete.Count} notifications for user {userId}");
            }
            else
            {
                _logger.LogInformation($"ℹ️ No notifications found for user {userId}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ Error deleting notifications for user {userId}");
            throw;
        }
    }
}