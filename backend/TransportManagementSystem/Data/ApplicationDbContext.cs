using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Truck> Trucks { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Trip> Trips { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<FuelVendor> FuelVendors { get; set; }
        public DbSet<Fuel> Fuels { get; set; }
        public DbSet<Vendor> Vendors { get; set; }
        public DbSet<Maintenance> Maintenances { get; set; }

        // 🔹 Sécurité / RBAC
        public DbSet<UserGroup> UserGroups { get; set; }
        public DbSet<UserRight> UserRights { get; set; }
        public DbSet<UserGroup2User> UserGroup2Users { get; set; }
        public DbSet<UserGroup2Right> UserGroup2Rights { get; set; }

        public DbSet<Delivery> Deliveries { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<Traject> Trajects { get; set; }
        public DbSet<TrajectPoint> TrajectPoints { get; set; }
        public DbSet<Location> Locations { get; set; }
        public DbSet<DayOff> DayOffs { get; set; }
        public DbSet<OvertimeSetting> OvertimeSettings { get; set; }
        public DbSet<DriverAvailability> DriverAvailabilities { get; set; }
        public DbSet<MarqueTruck> MarqueTrucks { get; set; }

        public DbSet<SyncHistory> SyncHistories { get; set; }
        public DbSet<SyncHistoryDetail> SyncHistoryDetails { get; set; }
        public DbSet<TruckAvailability> TruckAvailabilities { get; set; }
        public DbSet<Translation> Translations { get; set; }
        public DbSet<Zone> Zones { get; set; }
        public DbSet<City> Citys { get; set; }
        public DbSet<TypeTruck> TypeTrucks { get; set; }
        public DbSet<Employee> Employees { get; set; }
        //public DbSet<Category> Categories { get; set; }
        public DbSet<GeneralSettings> GeneralSettings { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<UserNotification> UserNotifications { get; set; }
        public DbSet<GeographicalLevel> GeographicalLevels { get; set; }
        public DbSet<GeographicalEntity> GeographicalEntities { get; set; }
        public DbSet<TruckGeographicalEntity> TruckGeographicalEntities { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Enum → string
            modelBuilder.Entity<Trip>()
                .Property(t => t.TripStatus)
                .HasConversion<string>();

            modelBuilder.Entity<Order>()
                .Property(o => o.Status)
                .HasConversion<string>();

            modelBuilder.Entity<Truck>()
                .Property(t => t.ImagesJson)
                .HasColumnType("nvarchar(max)");

            modelBuilder.Entity<Trip>()
                .Property(t => t.BookingId)
                .HasMaxLength(10)
                .IsRequired();

            modelBuilder.Entity<Driver>()
              .Property(t => t.ImageBase64)
              .HasColumnType("nvarchar(max)");
            // AutoInclude
            modelBuilder.Entity<Fuel>().Navigation(f => f.Truck).AutoInclude();
            modelBuilder.Entity<Fuel>().Navigation(f => f.Driver).AutoInclude();
            modelBuilder.Entity<Fuel>().Navigation(f => f.FuelVendor).AutoInclude();

            modelBuilder.Entity<Maintenance>().Navigation(m => m.Trip).AutoInclude();
            modelBuilder.Entity<Maintenance>().Navigation(m => m.Vendor).AutoInclude();
            modelBuilder.Entity<Maintenance>().Navigation(m => m.Mechanic).AutoInclude();

            // 🔹 User ↔ UserGroup (Many-to-Many)
            modelBuilder.Entity<UserGroup2User>()
                .HasKey(x => new { x.UserId, x.UserGroupId });

            modelBuilder.Entity<UserGroup2User>()
                .HasOne(x => x.User)
                .WithMany(u => u.UserGroup2Users)
                .HasForeignKey(x => x.UserId);

            modelBuilder.Entity<UserGroup2User>()
                .HasOne(x => x.UserGroup)
                .WithMany(g => g.UserGroup2Users)
                .HasForeignKey(x => x.UserGroupId);

            // 🔹 UserGroup ↔ UserRight (Many-to-Many)
            modelBuilder.Entity<UserGroup2Right>()
                .HasKey(x => new { x.UserGroupId, x.UserRightId });

            modelBuilder.Entity<UserGroup2Right>()
                .HasOne(x => x.UserGroup)
                .WithMany(g => g.UserGroup2Right)
                .HasForeignKey(x => x.UserGroupId);

            modelBuilder.Entity<UserGroup2Right>()
                .HasOne(x => x.UserRight)
                .WithMany()
                .HasForeignKey(x => x.UserRightId);

            // Relations optionnelles
            modelBuilder.Entity<Trip>()
                .HasOne(t => t.Traject)
                .WithMany()
                .HasForeignKey(t => t.TrajectId)
                .IsRequired(false);

            modelBuilder.Entity<Trip>()
                .HasOne(t => t.Convoyeur)
                .WithMany()
                .HasForeignKey(t => t.ConvoyeurId)
                .IsRequired(false);

            modelBuilder.Entity<Driver>()
                .HasMany(d => d.Availabilities)
                .WithOne(da => da.Driver)
                .HasForeignKey(da => da.DriverId)
                .OnDelete(DeleteBehavior.Cascade);

            
            modelBuilder.Entity<DriverAvailability>()
                .HasIndex(da => new { da.DriverId, da.Date })
                .IsUnique();

            modelBuilder.Entity<Delivery>()
                .HasOne(d => d.Order)
                .WithMany(o => o.Deliveries)
                .HasForeignKey(d => d.OrderId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<SyncHistoryDetail>()
               .HasOne(d => d.SyncHistory)
               .WithMany(h => h.Details)
               .HasForeignKey(d => d.SyncHistoryId)
               .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Order>()
                .Property(o => o.Weight)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<TruckAvailability>()
                .HasIndex(ta => new { ta.TruckId, ta.Date })
                .IsUnique();

            modelBuilder.Entity<Order>()
               .HasOne(o => o.Customer)
               .WithMany(c => c.Orders)
               .HasForeignKey(o => o.CustomerId)
               .OnDelete(DeleteBehavior.Restrict);

          
            modelBuilder.Entity<Location>()
                .HasOne(l => l.Zone)
                .WithMany(z => z.Locations) 
                .HasForeignKey(l => l.ZoneId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Customer>()
                  .HasOne(c => c.Zone)
                  .WithMany(z => z.Customers)
                  .HasForeignKey(c => c.ZoneId)
                  .IsRequired(false)  
                  .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Truck>(entity =>
            {
                entity.HasOne(t => t.TypeTruck)
                    .WithMany(tv => tv.Trucks) 
                    .HasForeignKey(t => t.TypeTruckId)  
                    .OnDelete(DeleteBehavior.Cascade); 
            });

            modelBuilder.Entity<GeneralSettings>()
                   .HasIndex(p => new { p.ParameterType, p.ParameterCode })
                   .IsUnique();

            modelBuilder.Entity<UserNotification>()
                   .HasIndex(un => new { un.NotificationId, un.UserId })
                   .IsUnique(); // Prevent duplicate entries

            modelBuilder.Entity<UserNotification>()
                .HasOne(un => un.Notification)
                .WithMany(n => n.UserNotifications)
                .HasForeignKey(un => un.NotificationId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserNotification>()
                .HasOne(un => un.User)
                .WithMany()
                .HasForeignKey(un => un.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<GeographicalLevel>()
           .HasIndex(l => l.LevelNumber)
           .IsUnique();

            modelBuilder.Entity<GeographicalLevel>()
                .HasIndex(l => l.Name)
                .IsUnique();

            // GeographicalEntity configuration
            modelBuilder.Entity<GeographicalEntity>()
                .HasOne(e => e.Level)
                .WithMany()
                .HasForeignKey(e => e.LevelId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<GeographicalEntity>()
                .HasOne(e => e.Parent)
                .WithMany(e => e.Children)
                .HasForeignKey(e => e.ParentId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<GeographicalEntity>()
                .HasIndex(e => new { e.LevelId, e.Name })
                .IsUnique();
            modelBuilder.Entity<Employee>(entity =>
            {
             
                entity.HasDiscriminator<string>("EmployeeCategory")
                    .HasValue<Employee>("EMPLOYEE")
                    .HasValue<Driver>("DRIVER")
                    .HasValue<Convoyeur>("CONVOYEUR")
                    .HasValue<Mechanic>("MECHANIC");

                entity.Property(e => e.EmployeeCategory)
                    .IsRequired()
                    .HasMaxLength(50);
            });
                    modelBuilder.Entity<Maintenance>()
                      .HasOne(m => m.Trip)
                      .WithMany()
                      .HasForeignKey(m => m.TripId)
                      .OnDelete(DeleteBehavior.Restrict);
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var entries = ChangeTracker.Entries()
                .Where(e => e.Entity is UserGroup &&
                       (e.State == EntityState.Added || e.State == EntityState.Modified));

            foreach (var entry in entries)
            {
                var entity = (UserGroup)entry.Entity;

                if (entry.State == EntityState.Added)
                    entity.CreatedAt = DateTime.UtcNow;

                entity.UpdatedAt = DateTime.UtcNow;
            }

            return await base.SaveChangesAsync(cancellationToken);
        }
    }
}
