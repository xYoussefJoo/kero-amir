using KeroAmir.Application.Common.Paging;
using KeroAmir.Application.Common.Results;

namespace KeroAmir.Tests.Application;

public class BuildingBlockTests
{
    [Theory]
    [InlineData(0, 0, 1, 1)]
    [InlineData(-5, 20, 1, 20)]
    [InlineData(3, 500, 3, PageRequest.MaxPageSize)]
    public void PageRequest_clamps_page_and_size(int page, int size, int expectedPage, int expectedSize)
    {
        var request = new PageRequest(page, size);
        Assert.Equal(expectedPage, request.SafePage);
        Assert.Equal(expectedSize, request.SafePageSize);
    }

    [Fact]
    public void PagedResult_rounds_total_pages_up()
    {
        var result = new PagedResult<int>([1, 2], Page: 1, PageSize: 20, TotalCount: 41);
        Assert.Equal(3, result.TotalPages);
    }

    [Fact]
    public void Result_from_value_is_success()
    {
        Result<int> result = 42;
        Assert.True(result.IsSuccess);
        Assert.Equal(42, result.Value);
    }

    [Fact]
    public void Result_from_error_is_failure_and_has_no_value()
    {
        Result<int> result = Error.NotFound("Category", "x");
        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.Type);
        Assert.Throws<InvalidOperationException>(() => result.Value);
    }
}
