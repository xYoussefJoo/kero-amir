using KeroAmir.Domain.Projects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KeroAmir.Infrastructure.Persistence.Configurations;

internal sealed class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        builder.Property(p => p.Slug).HasMaxLength(80);
        builder.Property(p => p.Countries).HasMaxLength(40);
        builder.Property(p => p.CoverImageUrl).HasMaxLength(500);
        builder.Property(p => p.AccentColor).HasMaxLength(9);
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(20);

        builder.HasIndex(p => p.Slug).IsUnique().HasFilter("[DeletedAt] IS NULL");
        // The public grid filters on Status and orders by featured / sort order.
        builder.HasIndex(p => new { p.Status, p.IsFeatured, p.SortOrder });

        builder.HasMany(p => p.Categories).WithMany().UsingEntity("ProjectCategories");
        builder.HasMany(p => p.Tools).WithMany().UsingEntity("ProjectTools");

        builder.OwnsTranslations(p => p.Translations, t => t.ProjectId, t =>
        {
            t.Property(x => x.Title).HasMaxLength(150);
            t.Property(x => x.Summary).HasMaxLength(600);
            t.Property(x => x.Highlight).HasMaxLength(80);
        });
    }
}
