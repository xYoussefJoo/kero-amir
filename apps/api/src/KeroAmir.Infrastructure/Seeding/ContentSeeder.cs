using System.Text.Json;
using System.Text.Json.Serialization;
using KeroAmir.Domain.Catalog;
using KeroAmir.Domain.Common;
using KeroAmir.Domain.Settings;
using KeroAmir.Domain.Skills;
using KeroAmir.Domain.Timeline;
using KeroAmir.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace KeroAmir.Infrastructure.Seeding;

/// <summary>
/// Loads the initial content (content-seed.json, embedded) when Seed:Content is true.
/// Each table is seeded only while it is empty, so it is safe on every startup and never overwrites Kero's edits.
/// </summary>
public static partial class ContentSeeder
{
    public static async Task SeedContentAsync(this IServiceProvider services, IConfiguration configuration, CancellationToken ct = default)
    {
        if (!configuration.GetValue<bool>("Seed:Content"))
            return;

        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(ContentSeeder));
        var seed = await LoadAsync(ct);

        if (!await db.SiteSettings.AnyAsync(ct))
        {
            db.SiteSettings.AddRange(seed.Settings.Select(s => new SiteSetting
            {
                Key = s.Key, Locale = s.Locale, ValueJson = s.Value.GetRawText(),
            }));
            LogSeeded(logger, "settings", seed.Settings.Count);
        }

        if (!await db.Categories.AnyAsync(ct))
        {
            db.Categories.AddRange(seed.Categories.Select((c, i) =>
            {
                var category = new Category { Slug = c.Slug, SortOrder = i };
                category.Translations.Add(new CategoryTranslation { Locale = Locales.English, Name = c.En });
                category.Translations.Add(new CategoryTranslation { Locale = Locales.German, Name = c.De });
                return category;
            }));
            LogSeeded(logger, "categories", seed.Categories.Count);
        }

        // Tools are needed by skills, so resolve them by slug (existing or new).
        var tools = await db.Tools.ToDictionaryAsync(t => t.Slug, ct);
        if (tools.Count == 0)
        {
            foreach (var (t, i) in seed.Tools.Select((t, i) => (t, i)))
            {
                var tool = new Tool { Slug = t.Slug, Name = t.Name, Color = t.Color, ShowInOrbit = t.ShowInOrbit, SortOrder = i };
                db.Tools.Add(tool);
                tools[t.Slug] = tool;
            }
            LogSeeded(logger, "tools", seed.Tools.Count);
        }

        if (!await db.SkillGroups.AnyAsync(ct))
        {
            foreach (var (g, gi) in seed.SkillGroups.Select((g, i) => (g, i)))
            {
                var group = new SkillGroup { SortOrder = gi };
                group.Translations.Add(new SkillGroupTranslation { Locale = Locales.English, Name = g.En });
                group.Translations.Add(new SkillGroupTranslation { Locale = Locales.German, Name = g.De });

                foreach (var (s, si) in g.Skills.Select((s, i) => (s, i)))
                {
                    var skill = new Skill
                    {
                        Level = s.Level,
                        SortOrder = si,
                        Tool = s.Tool is not null && tools.TryGetValue(s.Tool, out var tool) ? tool : null,
                    };
                    skill.Translations.Add(new SkillTranslation { Locale = Locales.English, Name = s.En });
                    skill.Translations.Add(new SkillTranslation { Locale = Locales.German, Name = s.De });
                    group.Skills.Add(skill);
                }
                db.SkillGroups.Add(group);
            }
            LogSeeded(logger, "skill groups", seed.SkillGroups.Count);
        }

        if (!await db.TimelineEntries.AnyAsync(ct))
        {
            db.TimelineEntries.AddRange(seed.Timeline.Select((e, i) =>
            {
                var entry = new TimelineEntry
                {
                    Kind = e.Kind, StartDate = e.Start, EndDate = e.End,
                    Organization = e.Organization, Location = e.Location, SortOrder = i,
                };
                entry.Translations.Add(new TimelineEntryTranslation { Locale = Locales.English, Title = e.En.Title, Description = e.En.Description });
                entry.Translations.Add(new TimelineEntryTranslation { Locale = Locales.German, Title = e.De.Title, Description = e.De.Description });
                return entry;
            }));
            LogSeeded(logger, "timeline entries", seed.Timeline.Count);
        }

        await db.SaveChangesAsync(ct);
    }

    private static async Task<SeedFile> LoadAsync(CancellationToken ct)
    {
        var assembly = typeof(ContentSeeder).Assembly;
        var name = assembly.GetManifestResourceNames().Single(n => n.EndsWith("content-seed.json", StringComparison.Ordinal));
        await using var stream = assembly.GetManifestResourceStream(name)!;
        return await JsonSerializer.DeserializeAsync<SeedFile>(stream, JsonOptions, ct)
               ?? throw new InvalidOperationException("content-seed.json is empty.");
    }

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    [LoggerMessage(Level = LogLevel.Information, Message = "Seeded {Count} {What}")]
    private static partial void LogSeeded(ILogger logger, string what, int count);

    // ---- File shape
    private sealed record SeedFile(
        List<SeedSetting> Settings, List<SeedCategory> Categories, List<SeedTool> Tools,
        List<SeedSkillGroup> SkillGroups, List<SeedTimeline> Timeline);

    private sealed record SeedSetting(string Key, string? Locale, JsonElement Value);
    private sealed record SeedCategory(string Slug, string En, string De);
    private sealed record SeedTool(string Slug, string Name, string? Color, bool ShowInOrbit);
    private sealed record SeedSkillGroup(string En, string De, List<SeedSkill> Skills);
    private sealed record SeedSkill(string En, string De, int Level, string? Tool);
    private sealed record SeedText(string Title, string? Description);
    private sealed record SeedTimeline(
        TimelineKind Kind, DateOnly Start, DateOnly? End, string? Organization, string? Location, SeedText En, SeedText De);
}
