using KeroAmir.Domain.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KeroAmir.Infrastructure.Persistence.Configurations;

internal sealed class SiteSettingConfiguration : IEntityTypeConfiguration<SiteSetting>
{
    public void Configure(EntityTypeBuilder<SiteSetting> builder)
    {
        builder.Property(s => s.Key).HasMaxLength(100);
        builder.Property(s => s.Locale).HasMaxLength(10);
        builder.Property(s => s.ValueJson).HasColumnType("nvarchar(max)");

        // One value per key and language among live rows; a null locale means "all languages".
        builder.HasIndex(s => new { s.Key, s.Locale }).IsUnique().HasFilter("[DeletedAt] IS NULL");
    }
}
