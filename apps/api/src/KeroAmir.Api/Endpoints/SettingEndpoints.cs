using System.Text.Json;
using KeroAmir.Api.Infrastructure;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Features.Settings;

namespace KeroAmir.Api.Endpoints;

public static class SettingEndpoints
{
    public static void MapSettingEndpoints(this RouteGroupBuilder v1, RouteGroupBuilder admin)
    {
        v1.MapGet("/settings", (string? locale, IHandler<GetSettings, IReadOnlyDictionary<string, JsonElement>> h, CancellationToken ct) =>
                h.Ok(new GetSettings(locale ?? ""), ct))
            .WithTags("Settings").CachedAs(ContentCache.Settings)
            .Produces<IReadOnlyDictionary<string, JsonElement>>();

        var g = admin.MapGroup("/settings").WithTags("Admin: Settings");

        g.MapGet("/", (IHandler<ListSettingsAdmin, IReadOnlyList<SettingAdminDto>> h, CancellationToken ct) =>
                h.Ok(new ListSettingsAdmin(), ct))
            .Produces<IReadOnlyList<SettingAdminDto>>();

        // Upsert: creates the (key, locale) row or replaces its value.
        g.MapPut("/{key}", (string key, SettingInput body, IHandler<PutSetting, SettingAdminDto> h, CancellationToken ct) =>
                h.Ok(new PutSetting(key, body), ct))
            .Validate<SettingInput>().Evicts(ContentCache.Settings)
            .Produces<SettingAdminDto>();

        g.MapDelete("/{key}", (string key, string? locale, IHandler<DeleteSetting, bool> h, CancellationToken ct) =>
                h.NoContent(new DeleteSetting(key, string.IsNullOrEmpty(locale) ? null : locale), ct))
            .Evicts(ContentCache.Settings)
            .Produces(StatusCodes.Status204NoContent).ProducesProblem(StatusCodes.Status404NotFound);
    }
}
