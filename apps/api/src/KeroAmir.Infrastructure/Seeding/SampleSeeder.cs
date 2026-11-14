using KeroAmir.Domain.Catalog;
using KeroAmir.Domain.Common;
using KeroAmir.Domain.Engagement;
using KeroAmir.Domain.Projects;
using KeroAmir.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace KeroAmir.Infrastructure.Seeding;

/// <summary>
/// DEVELOPMENT ONLY (Seed:SampleContent=true): sample projects and reviews so the grid and ticker have something to
/// show locally. They come from the old site's demo data and are labelled as samples. Never enable this in production:
/// the live site must only show Kero's real projects and real, approved reviews.
/// </summary>
public static class SampleSeeder
{
    public static async Task SeedSamplesAsync(this IServiceProvider services, IConfiguration configuration, CancellationToken ct = default)
    {
        if (!configuration.GetValue<bool>("Seed:SampleContent"))
            return;

        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (!await db.Projects.AnyAsync(ct))
        {
            var categories = await db.Categories.ToDictionaryAsync(c => c.Slug, ct);
            var tools = await db.Tools.ToDictionaryAsync(t => t.Slug, ct);
            var samples = new (string Slug, int Year, string Countries, string Accent, bool Featured, string Category, string[] Tools, string Title, string Summary, string Highlight)[]
            {
                ("aura-botanica", 2024, "US,FR", "#2546EB", true, "brand-identity", ["illustrator", "photoshop", "dimension"],
                    "Aura Botanica: luxury organic cosmetics", "Visual identity, botanical packaging and 3D product renders (demo project from the previous site).", "Full brand book"),
                ("cyberpulse", 2024, "DE", "#FF6535", false, "packaging-3d", ["dimension", "illustrator", "photoshop"],
                    "CyberPulse: esports energy drink", "Can packaging, vector illustration and a 3D metallic-foil mockup (demo project from the previous site).", "Die-line label engineering"),
                ("vortex-sound", 2023, "US", "#0E1120", false, "ad-campaigns", ["after-effects", "photoshop", "illustrator"],
                    "Vortex Sound: spatial audio identity", "Logotype and an advertising poster series for an audiophile brand (demo project from the previous site).", "Animated billboard promos"),
                ("sample-editorial", 2025, "DE", "#2546EB", false, "editorial-print", ["indesign", "photoshop"],
                    "Sample: magazine redesign", "Placeholder card for local development.", "Sample"),
                ("sample-identity", 2025, "EG", "#FF6535", false, "brand-identity", ["illustrator"],
                    "Sample: café identity", "Placeholder card for local development.", "Sample"),
                ("sample-campaign", 2023, "FR", "#0E1120", false, "ad-campaigns", ["after-effects", "premiere-pro"],
                    "Sample: product launch campaign", "Placeholder card for local development.", "Sample"),
            };

            foreach (var (s, i) in samples.Select((s, i) => (s, i)))
            {
                var project = new Project
                {
                    Slug = s.Slug, Year = s.Year, Countries = s.Countries, AccentColor = s.Accent, IsFeatured = s.Featured,
                    Status = PublishStatus.Published, PublishedAt = DateTimeOffset.UtcNow, SortOrder = i,
                };
                if (categories.TryGetValue(s.Category, out var category)) project.Categories.Add(category);
                foreach (var slug in s.Tools)
                    if (tools.TryGetValue(slug, out var tool)) project.Tools.Add(tool);
                project.Translations.Add(new ProjectTranslation { Locale = Locales.English, Title = s.Title, Summary = s.Summary, Highlight = s.Highlight });
                db.Projects.Add(project);
            }
        }

        if (!await db.Testimonials.AnyAsync(ct))
        {
            db.Testimonials.AddRange(
                Sample("Example Client", "Marketing Manager", "Sample Brand Co.", "US", 5,
                    "Clear communication, fast turnaround, and a brand identity that finally matches our vision. Would work together again."),
                Sample("Example Art Director", "Art Director", "Sample Agency", "DE", 5,
                    "Delivered print-ready files on time with a well-organized layer structure. Easy to hand off to our production team."),
                Sample("Example Founder", "Founder", "Sample Startup", "FR", 5,
                    "The packaging design and 3D mockups helped us pitch our product before the first print run. Great attention to detail."));
        }

        await db.SaveChangesAsync(ct);
    }

    private static Testimonial Sample(string name, string role, string company, string country, int rating, string text) =>
        new()
        {
            AuthorName = name, Role = role, Company = company, CountryCode = country, Rating = rating, Text = text,
            Locale = Locales.English, Status = ModerationStatus.Approved,
        };
}
