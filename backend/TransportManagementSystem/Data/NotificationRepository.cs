using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Interfaces;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Repositories;

public class NotificationRepository : Repository<Notification>, INotificationRepository
{
    private readonly ApplicationDbContext _context;

    public NotificationRepository(ApplicationDbContext context) : base(context)
    {
        _context = context;
    }

    public async Task<IEnumerable<NotificationDto>> GetUserNotificationsAsync(int userId, NotificationFilterDto filter)
    {
        var query = from n in _context.Notifications
                    join un in _context.UserNotifications on n.Id equals un.NotificationId
                    where un.UserId == userId
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

        if (filter.TripId.HasValue)
            query = query.Where(n => n.TripId == filter.TripId.Value);

        // Order by most recent first
        query = query.OrderByDescending(n => n.Timestamp);

        // Apply pagination
        if (filter.PageSize > 0)
        {
            query = query
                .Skip(filter.PageIndex * filter.PageSize)
                .Take(filter.PageSize);
        }

        return await query.ToListAsync();
    }

    public async Task<int> GetUnreadCountAsync(int userId)
    {
        return await _context.UserNotifications
            .CountAsync(un => un.UserId == userId && !un.IsRead);
    }

    public async Task MarkAsReadAsync(int notificationId, int userId)
    {
        var userNotification = await _context.UserNotifications
            .FirstOrDefaultAsync(un => un.NotificationId == notificationId && un.UserId == userId);

        if (userNotification != null)
        {
            userNotification.IsRead = true;
            userNotification.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task MarkAllAsReadAsync(int userId)
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
    }

    public async Task DeleteOldNotificationsAsync(int daysToKeep = 30)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-daysToKeep);

        // Find old notifications
        var oldNotifications = await _context.Notifications
            .Where(n => n.Timestamp < cutoffDate)
            .ToListAsync();

        if (oldNotifications.Any())
        {
            var notificationIds = oldNotifications.Select(n => n.Id).ToList();

            // Delete associated UserNotifications first
            var oldUserNotifications = await _context.UserNotifications
                .Where(un => notificationIds.Contains(un.NotificationId))
                .ToListAsync();

            _context.UserNotifications.RemoveRange(oldUserNotifications);

            // Then delete the notifications
            _context.Notifications.RemoveRange(oldNotifications);

            await _context.SaveChangesAsync();
        }
    }

    // Optional: Method to create notification for all users
    public async Task<Notification> CreateNotificationForAllUsers(Notification notification, List<int> userIds)
    {
        // Save the notification first
        await _context.Notifications.AddAsync(notification);
        await _context.SaveChangesAsync();

        // Create UserNotification entries for each user
        var userNotifications = userIds.Select(userId => new UserNotification
        {
            NotificationId = notification.Id,
            UserId = userId,
            IsRead = false
        }).ToList();

        await _context.UserNotifications.AddRangeAsync(userNotifications);
        await _context.SaveChangesAsync();

        return notification;
    }
    public async Task DeleteAllNotificationsForUser(int userId)
    {
        // Get all user notifications for this user
        var userNotifications = await _context.UserNotifications
            .Where(un => un.UserId == userId)
            .ToListAsync();

        if (userNotifications.Any())
        {
            var notificationIds = userNotifications.Select(un => un.NotificationId).ToList();

            // Delete user notifications
            _context.UserNotifications.RemoveRange(userNotifications);

            // Find notifications that are no longer referenced by any user
            var notificationsToDelete = new List<Notification>();

            foreach (var notificationId in notificationIds)
            {
                var otherUsersCount = await _context.UserNotifications
                    .CountAsync(un => un.NotificationId == notificationId && un.UserId != userId);

                if (otherUsersCount == 0)
                {
                    var notification = await _context.Notifications
                        .FindAsync(notificationId);
                    if (notification != null)
                        notificationsToDelete.Add(notification);
                }
            }

            if (notificationsToDelete.Any())
                _context.Notifications.RemoveRange(notificationsToDelete);

            await _context.SaveChangesAsync();
        }
    }
}