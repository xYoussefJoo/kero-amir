using System.Linq.Expressions;
using KeroAmir.Application.Common.Abstractions;
using KeroAmir.Domain.Catalog;
using KeroAmir.Domain.Common;
using KeroAmir.Domain.Settings;
using KeroAmir.Domain.Skills;
using KeroAmir.Domain.Timeline;
using Microsoft.EntityFrameworkCore;

namespace KeroAmir.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<SiteSetting> SiteSettings => Set<SiteSetting>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Tool> Tools => Set<Tool>();
    public DbSet<SkillGroup> SkillGroups => Set<SkillGroup>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<TimelineEntry> TimelineEntries => Set<TimelineEntry>();

    Task<int> IAppDbContext.SaveChangesAsync(CancellationToken ct) => SaveChangesAsync(ct);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Soft delete: hide rows with DeletedAt set from every query, for every entity.
        foreach (var entityType in modelBuilder.Model.GetEntityTypes()
                     .Where(t => !t.IsOwned() && typeof(BaseEntity).IsAssignableFrom(t.ClrType)))
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
