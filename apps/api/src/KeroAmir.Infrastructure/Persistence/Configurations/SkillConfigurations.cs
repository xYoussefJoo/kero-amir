using KeroAmir.Domain.Skills;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KeroAmir.Infrastructure.Persistence.Configurations;

internal sealed class SkillGroupConfiguration : IEntityTypeConfiguration<SkillGroup>
{
    public void Configure(EntityTypeBuilder<SkillGroup> builder)
    {
        builder.OwnsTranslations(g => g.Translations, t => t.SkillGroupId, t =>
            t.Property(x => x.Name).HasMaxLength(80));

        builder.HasMany(g => g.Skills).WithOne(s => s.SkillGroup)
            .HasForeignKey(s => s.SkillGroupId).OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class SkillConfiguration : IEntityTypeConfiguration<Skill>
{
    public void Configure(EntityTypeBuilder<Skill> builder)
    {
        builder.ToTable(t => t.HasCheckConstraint("CK_Skills_Level", "[Level] BETWEEN 0 AND 100"));

        builder.HasOne(s => s.Tool).WithMany()
            .HasForeignKey(s => s.ToolId).OnDelete(DeleteBehavior.SetNull);

        builder.OwnsTranslations(s => s.Translations, t => t.SkillId, t =>
            t.Property(x => x.Name).HasMaxLength(80));
    }
}
