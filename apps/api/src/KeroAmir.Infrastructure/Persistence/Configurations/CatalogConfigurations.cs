using KeroAmir.Domain.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KeroAmir.Infrastructure.Persistence.Configurations;

internal sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.Property(c => c.Slug).HasMaxLength(80);
        builder.HasIndex(c => c.Slug).IsUnique().HasFilter("[DeletedAt] IS NULL");

        builder.OwnsTranslations(c => c.Translations, t => t.CategoryId, t =>
            t.Property(x => x.Name).HasMaxLength(80));
    }
}

internal sealed class ToolConfiguration : IEntityTypeConfiguration<Tool>
{
    public void Configure(EntityTypeBuilder<Tool> builder)
    {
        builder.Property(t => t.Slug).HasMaxLength(80);
        builder.Property(t => t.Name).HasMaxLength(80);
        builder.Property(t => t.Color).HasMaxLength(9);
        builder.HasIndex(t => t.Slug).IsUnique().HasFilter("[DeletedAt] IS NULL");
    }
}
