using KeroAmir.Application.Common.Results;

namespace KeroAmir.Api.Infrastructure;

/// <summary>Turns a use-case <see cref="Result"/> into an HTTP response. Failures become RFC 7807 ProblemDetails.</summary>
public static class ResultExtensions
{
    public static IResult ToHttp<T>(this Result<T> result) =>
        result.IsSuccess ? TypedResults.Ok(result.Value) : result.Error!.ToProblem();

    public static IResult ToHttp<T>(this Result<T> result, Func<T, IResult> onSuccess) =>
        result.IsSuccess ? onSuccess(result.Value) : result.Error!.ToProblem();

    public static IResult ToHttp(this Result result) =>
        result.IsSuccess ? TypedResults.NoContent() : result.Error!.ToProblem();

    public static IResult ToProblem(this Error error)
    {
        var status = error.Type switch
        {
            ErrorType.Validation => StatusCodes.Status400BadRequest,
            ErrorType.NotFound => StatusCodes.Status404NotFound,
            ErrorType.Conflict => StatusCodes.Status409Conflict,
            ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
            ErrorType.Forbidden => StatusCodes.Status403Forbidden,
            _ => StatusCodes.Status500InternalServerError,
        };

        if (error.Type == ErrorType.Validation && error.Details is not null)
            return TypedResults.ValidationProblem(error.Details.ToDictionary(), title: error.Message,
                extensions: new Dictionary<string, object?> { ["code"] = error.Code });

        return TypedResults.Problem(title: error.Message, statusCode: status,
            extensions: new Dictionary<string, object?> { ["code"] = error.Code });
    }
}
