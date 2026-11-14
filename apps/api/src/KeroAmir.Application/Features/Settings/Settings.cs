using System.Text.Json;
using FluentValidation;
using KeroAmir.Application.Common.Abstractions;
using KeroAmir.Application.Common.Content;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Common.Results;
using KeroAmir.Domain.Common;
using KeroAmir.Domain.Settings;
using Microsoft.EntityFrameworkCore;

namespace KeroAmir.Application.Features.Settings;

// ---- Contracts. A setting is a JSON value under a dotted key, e.g. "hero.headline" or "socials".
// A row with Locale = null applies to every language; a row for a specific locale overrides it.
public sealed record SettingInput(string? Locale, JsonElement Value);

public sealed record SettingAdminDto(string Key, string? Locale, JsonElement Value, DateTimeOffset UpdatedAt);

public sealed record GetSettings(string Locale);
public sealed record ListSettingsAdmin;
public sealed record PutSetting(string Key, SettingInput Input);
public sealed record DeleteSetting(string Key, string? Locale);

public static class SettingRules
{
    public const string KeyPattern = "^[a-z][a-zA-Z0-9]*(\\.[a-z][a-zA-Z0-9]*)*$";
    public const int MaxKeyLength = 100;
    public const int MaxValueLength = 20_000;
    public const int MaxRows = 500;

    public static bool IsValidKey(string key) =>
        key.Length <= MaxKeyLength && System.Text.RegularExpressions.Regex.IsMatch(key, KeyPattern);
}

internal sealed class SettingInputValidator : AbstractValidator<SettingInput>
{
    public SettingInputValidator()
    {
        RuleFor(x => x.Locale).Must(Locales.IsSupported).When(x => x.Locale is not null)
            .WithMessage($"Locale must be empty or one of: {string.Join(", ", Locales.All)}.");
        RuleFor(x => x.Value).Must(v => v.ValueKind != JsonValueKind.Undefined).WithMessage("A value is required.")
            .Must(v => v.ValueKind == JsonValueKind.Undefined || v.GetRawText().Length <= SettingRules.MaxValueLength)
            .WithMessage("The value is too large.");
    }
}

// ---- Handlers
internal sealed class SettingHandlers(IAppDbContext db) :
    IHandler<GetSettings, IReadOnlyDictionary<string, JsonElement>>,
    IHandler<ListSettingsAdmin, IReadOnlyList<SettingAdminDto>>,
    IHandler<PutSetting, SettingAdminDto>,
    IHandler<DeleteSetting, bool>
{
    public async Task<Result<IReadOnlyDictionary<string, JsonElement>>> HandleAsync(GetSettings request, CancellationToken ct)
    {
        var locale = ContentHelpers.Locale(request.Locale);
        var rows = await db.SiteSettings.AsNoTracking()
            .Where(s => s.Locale == null || s.Locale == locale)
            .Select(s => new { s.Key, s.Locale, s.ValueJson })
            .Take(SettingRules.MaxRows)
            .ToListAsync(ct);

        // Locale-specific rows win over shared ones.
        return rows
            .OrderBy(r => r.Locale is null ? 0 : 1)
            .GroupBy(r => r.Key)
            .ToDictionary(g => g.Key, g => Parse(g.Last().ValueJson));
    }

    public async Task<Result<IReadOnlyList<SettingAdminDto>>> HandleAsync(ListSettingsAdmin request, CancellationToken ct)
    {
        var rows = await db.SiteSettings.AsNoTracking()
            .OrderBy(s => s.Key).ThenBy(s => s.Locale)
            .Take(SettingRules.MaxRows)
            .ToListAsync(ct);
        return rows.Select(ToAdmin).ToList();
    }

    public async Task<Result<SettingAdminDto>> HandleAsync(PutSetting request, CancellationToken ct)
    {
        if (!SettingRules.IsValidKey(request.Key))
            return InvalidKey();

        var locale = request.Input.Locale;
        var setting = await db.SiteSettings.SingleOrDefaultAsync(s => s.Key == request.Key && s.Locale == locale, ct);
        var json = request.Input.Value.GetRawText();
        if (setting is null)
        {
            setting = new SiteSetting { Key = request.Key, Locale = locale, ValueJson = json };
            db.SiteSettings.Add(setting);
        }
        else
        {
            setting.ValueJson = json;
        }

        await db.SaveChangesAsync(ct);
        return ToAdmin(setting);
    }

    public async Task<Result<bool>> HandleAsync(DeleteSetting request, CancellationToken ct)
    {
        var setting = await db.SiteSettings.SingleOrDefaultAsync(s => s.Key == request.Key && s.Locale == request.Locale, ct);
        if (setting is null)
            return Error.NotFound("Setting", request.Locale is null ? request.Key : $"{request.Key} ({request.Locale})");

        db.SiteSettings.Remove(setting);
        await db.SaveChangesAsync(ct);
        return true;
    }

    private static Error InvalidKey() => Error.Validation(new Dictionary<string, string[]>
    {
        ["key"] = ["Use dotted camelCase keys like hero.headline (letters and digits only)."],
    });

    private static JsonElement Parse(string json)
    {
        using var document = JsonDocument.Parse(json);
        return document.RootElement.Clone();
    }

    private static SettingAdminDto ToAdmin(SiteSetting s) => new(s.Key, s.Locale, Parse(s.ValueJson), s.UpdatedAt);
}
