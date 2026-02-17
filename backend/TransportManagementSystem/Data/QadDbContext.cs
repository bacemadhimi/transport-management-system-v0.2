using Microsoft.EntityFrameworkCore;
using System.Net.Sockets;
using TransportManagementSystem.Entity.QAD;

namespace TransportManagementSystem.Data
{
    public class QadDbContext : DbContext
    {
        public QadDbContext(DbContextOptions<QadDbContext> options)
            : base(options)
        {
        }

        // ===== TABLES QAD =====
        public DbSet<CmMstr> CmMstr { get; set; }
        public DbSet<SoMstr> SoMstr { get; set; }
        public DbSet<SodDet> SodDet { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // =====================
            // cm_mstr
            // =====================
            modelBuilder.Entity<CmMstr>()
                .HasKey(c => c.CmId);

            // =====================
            // so_mstr
            // =====================
            modelBuilder.Entity<SoMstr>()
                .HasKey(s => s.SoId);

            modelBuilder.Entity<SoMstr>()
                .Property(s => s.SoTotalAmount)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<SoMstr>()
                .HasOne(s => s.Customer)
                .WithMany(c => c.SalesOrders)
                .HasForeignKey(s => s.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            // =====================
            // sod_det
            // =====================
            modelBuilder.Entity<SodDet>()
                .HasKey(d => d.SodId);

            modelBuilder.Entity<SodDet>()
                .Property(d => d.QtyOrd)
                .HasColumnType("decimal(18,5)");

            modelBuilder.Entity<SodDet>()
                .Property(d => d.QtyRcvd)
                .HasColumnType("decimal(18,5)");

            modelBuilder.Entity<SodDet>()
                .Property(d => d.UmConv)
                .HasColumnType("decimal(18,5)");

            modelBuilder.Entity<SodDet>()
                .HasOne(d => d.SoMstr)
                .WithMany(s => s.SodDets)
                .HasForeignKey(d => d.SoId)
                .OnDelete(DeleteBehavior.Cascade);

            base.OnModelCreating(modelBuilder);
        }
    }
}
