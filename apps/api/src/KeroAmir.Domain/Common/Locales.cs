namespace KeroAmir.Domain.Common;

public static class Locales
{
    public const string English = "en";
    public const string German = "de";
    public const string Default = English;

    public static readonly IReadOnlyList<string> All = [English, German];

    public static bool IsSupported(string? locale) => locale is not null && All.Contains(locale);
}
