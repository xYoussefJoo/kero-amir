using Microsoft.EntityFrameworkCore;

namespace KeroAmir.Application.Common.Paging;

/// <summary>Page-based paging. Every list endpoint takes one: no unbounded result sets.</summary>
public sealed record PageRequest(int Page = 1, int PageSize = PageRequest.DefaultPageSize)
{
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;

    public int SafePage => Math.Max(1, Page);
    public int SafePageSize => Math.Clamp(PageSize, 1, MaxPageSize);
}

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
{
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
}

public static class PagingExtensions
{
    /// <summary>Runs COUNT + one page of the (already projected) query.</summary>
    public static async Task<PagedResult<T>> ToPagedAsync<T>(
        this IQueryable<T> query, PageRequest request, CancellationToken ct)
    {
        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((request.SafePage - 1) * request.SafePageSize)
            .Take(request.SafePageSize)
            .ToListAsync(ct);
        return new PagedResult<T>(items, request.SafePage, request.SafePageSize, total);
    }
}
