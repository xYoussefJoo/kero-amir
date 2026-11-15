using KeroAmir.Domain.Media;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KeroAmir.Infrastructure.Persistence.Configurations;

internal sealed class MediaFileConfiguration : IEntityTypeConfiguration<MediaFile>
{
    public void Configure(EntityTypeBuilder<MediaFile> builder)
    {
        builder.Property(m => m.ContentType).HasMaxLength(50).IsUnicode(false);
        builder.Property(m => m.FileName).HasMaxLength(200);
        builder.Property(m => m.Data).HasColumnType("varbinary(max)");
    }
}
