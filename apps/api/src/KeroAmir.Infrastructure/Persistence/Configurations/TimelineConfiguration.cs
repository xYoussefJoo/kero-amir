using KeroAmir.Domain.Timeline;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KeroAmir.Infrastructure.Persistence.Configurations;

internal sealed class TimelineEntryConfiguration : IEntityTypeConfiguration<TimelineEntry>
{
    public void Configure(EntityTypeBuilder<TimelineEntry> builder)
    {
        builder.Property(e => e.Kind).HasConversion<string>().HasMaxLength(20);
        builder.Property(e => e.Organization).HasMaxLength(120);
        builder.Property(e => e.Location).HasMaxLength(120);

        builder.OwnsTranslations(e => e.Translations, t => t.TimelineEntryId, t =>
        {
            t.Property(x => x.Title).HasMaxLength(150);
            t.Property(x => x.Description).HasMaxLength(1000);
        });
    }
}
