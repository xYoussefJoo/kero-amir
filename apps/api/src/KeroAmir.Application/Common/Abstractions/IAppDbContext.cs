using KeroAmir.Domain.Auth;
using KeroAmir.Domain.Catalog;
using KeroAmir.Domain.Engagement;
using KeroAmir.Domain.Media;
using KeroAmir.Domain.Projects;
using KeroAmir.Domain.Settings;
using KeroAmir.Domain.Skills;
using KeroAmir.Domain.Timeline;
using Microsoft.EntityFrameworkCore;

namespace KeroAmir.Application.Common.Abstractions;

/// <summary>The data access port. Implemented by Infrastructure's AppDbContext.</summary>
public interface IAppDbContext
{
    DbSet<SiteSetting> SiteSettings { get; }
    DbSet<Category> Categories { get; }
    DbSet<Tool> Tools { get; }
    DbSet<SkillGroup> SkillGroups { get; }
    DbSet<Skill> Skills { get; }
    DbSet<TimelineEntry> TimelineEntries { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Project> Projects { get; }
    DbSet<Testimonial> Testimonials { get; }
    DbSet<ContactMessage> ContactMessages { get; }
    DbSet<MediaFile> MediaFiles { get; }

    Task<int> SaveChangesAsync(CancellationToken ct);
}
