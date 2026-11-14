using KeroAmir.Domain.Engagement;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KeroAmir.Infrastructure.Persistence.Configurations;

internal sealed class TestimonialConfiguration : IEntityTypeConfiguration<Testimonial>
{
    public void Configure(EntityTypeBuilder<Testimonial> builder)
    {
        builder.Property(t => t.AuthorName).HasMaxLength(80);
        builder.Property(t => t.Role).HasMaxLength(80);
        builder.Property(t => t.Company).HasMaxLength(80);
        builder.Property(t => t.CountryCode).HasMaxLength(2).IsFixedLength();
        builder.Property(t => t.Text).HasMaxLength(600);
        builder.Property(t => t.Locale).HasMaxLength(10);
        builder.Property(t => t.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(t => t.IpHash).HasMaxLength(64).IsUnicode(false);
        builder.ToTable(t => t.HasCheckConstraint("CK_Testimonials_Rating", "[Rating] BETWEEN 1 AND 5"));

        // Public ticker: approved, newest first. Admin queue: pending, newest first.
        builder.HasIndex(t => new { t.Status, t.CreatedAt });
    }
}

internal sealed class ContactMessageConfiguration : IEntityTypeConfiguration<ContactMessage>
{
    public void Configure(EntityTypeBuilder<ContactMessage> builder)
    {
        builder.Property(m => m.Name).HasMaxLength(80);
        builder.Property(m => m.Email).HasMaxLength(200);
        builder.Property(m => m.Company).HasMaxLength(100);
        builder.Property(m => m.Service).HasMaxLength(80);
        builder.Property(m => m.Budget).HasMaxLength(20);
        builder.Property(m => m.Message).HasMaxLength(3000);
        builder.Property(m => m.Locale).HasMaxLength(10);
        builder.Property(m => m.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(m => m.IpHash).HasMaxLength(64).IsUnicode(false);

        // Inbox: by status, newest first.
        builder.HasIndex(m => new { m.Status, m.CreatedAt });
    }
}
