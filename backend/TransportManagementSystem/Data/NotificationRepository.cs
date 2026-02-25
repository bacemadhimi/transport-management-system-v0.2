using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Interfaces;


namespace TransportManagementSystem.Repositories;

public class NotificationRepository : Repository<Notification>, INotificationRepository
{
    private readonly ApplicationDbContext _context;

    public NotificationRepository(ApplicationDbContext context) : base(context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Notification>> GetUserNotificationsAsync(int userId, NotificationFilterDto filter)
    {
        var query = _context.Notifications
             //.Where(n => n.UserId == userId)
            .Where(n => n.Type == "TRIP_CANCELLED")
            .AsQueryable();

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
        return await _context.Notifications
            .CountAsync(n => n.UserId == userId && !n.IsRead);
    }

    public async Task MarkAsReadAsync(int notificationId, int userId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

        if (notification != null)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            notification.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task MarkAllAsReadAsync(int userId)
    {
        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var notification in notifications)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            notification.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }

    public async Task DeleteOldNotificationsAsync(int daysToKeep = 30)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-daysToKeep);
        var oldNotifications = await _context.Notifications
            .Where(n => n.Timestamp < cutoffDate && n.IsRead)
            .ToListAsync();

        if (oldNotifications.Any())
        {
            _context.Notifications.RemoveRange(oldNotifications);
            await _context.SaveChangesAsync();
        }
    }
}