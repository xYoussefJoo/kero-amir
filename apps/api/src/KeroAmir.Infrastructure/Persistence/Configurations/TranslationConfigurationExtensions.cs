using System.Linq.Expressions;
using KeroAmir.Domain.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KeroAmir.Infrastructure.Persistence.Configurations;

internal static class TranslationConfigurationExtensions
{
    /// <summary>
    /// Maps a *Translation collection as an owned table: key (ParentId, Locale), deleted with its parent.
    /// The composite key doubles as the index for "translation of X in locale Y" lookups.
    /// </summary>
    public static void OwnsTranslations<TParent, TTranslation>(
        this EntityTypeBuilder<TParent> builder,
        Expression<Func<TParent, IEnumerable<TTranslation>?>> navigation,
        Expression<Func<TTranslation, Guid>> parentId,
        Action<OwnedNavigationBuilder<TParent, TTranslation>>? configure = null)
        where TParent : BaseEntity
        where TTranslation : class, ITranslation
    {
        var parentIdName = ((MemberExpression)parentId.Body).Member.Name;

        builder.OwnsMany(navigation, t =>
        {
            t.ToTable(typeof(TTranslation).Name + "s");
            t.WithOwner().HasForeignKey(parentIdName);
            t.HasKey(parentIdName, nameof(ITranslation.Locale));
            t.Property(x => x.Locale).HasMaxLength(10);
            configure?.Invoke(t);
        });
    }
}
