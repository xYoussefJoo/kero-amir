using System.Linq.Expressions;
using KeroAmir.Domain.Common;
using KeroAmir.Domain.Settings;
using Microsoft.EntityFrameworkCore;

namespace KeroAmir.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<SiteSetting> SiteSettings => Set<SiteSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Soft delete: hide rows with DeletedAt set from every query, for every entity.
        foreach (var entityType in modelBuilder.Model.GetEntityTypes()
                     .Where(t => typeof(BaseEntity).IsAssignableFrom(t.ClrType)))
        {
            var e = Expression.Parameter(entityType.ClrType, "e");
            var notDeleted = Expression.Lambda(
                Expression.Equal(
                    Expression.Property(e, nameof(BaseEntity.DeletedAt)),
                    Expression.Constant(null, typeof(DateTimeOffset?))),
                e);
            modelBuilder.Entity(entityType.ClrType).HasQueryFilter(notDeleted);
        }
    }
}
