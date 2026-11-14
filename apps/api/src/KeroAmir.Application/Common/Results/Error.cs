namespace KeroAmir.Application.Common.Results;

public enum ErrorType
{
    Validation,
    NotFound,
    Conflict,
    Unauthorized,
    Forbidden,
}

/// <summary>An expected failure. The Api layer maps <see cref="Type"/> to an HTTP status + ProblemDetails.</summary>
public sealed record Error(string Code, string Message, ErrorType Type, IReadOnlyDictionary<string, string[]>? Details = null)
{
    public static Error NotFound(string entity, object id) =>
        new($"{entity}.NotFound", $"{entity} '{id}' was not found.", ErrorType.NotFound);

    public static Error Conflict(string code, string message) => new(code, message, ErrorType.Conflict);

    public static Error Validation(IReadOnlyDictionary<string, string[]> details) =>
        new("Validation", "One or more validation errors occurred.", ErrorType.Validation, details);

    public static Error Unauthorized(string code, string message) => new(code, message, ErrorType.Unauthorized);
}
