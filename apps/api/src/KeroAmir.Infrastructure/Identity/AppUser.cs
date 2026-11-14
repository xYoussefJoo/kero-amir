using Microsoft.AspNetCore.Identity;

namespace KeroAmir.Infrastructure.Identity;

/// <summary>The Identity user. Lives in Infrastructure so the Domain stays free of ASP.NET Core Identity.</summary>
public class AppUser : IdentityUser<Guid>
{
    public AppUser() => Id = Guid.CreateVersion7();
}
