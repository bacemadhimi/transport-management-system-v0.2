
using System.Security.Claims;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Service
{
    public class UserHelper
    {
        private readonly IRepository<User> userRepo;

        public UserHelper(IRepository<User> userRepo)
        {
            this.userRepo = userRepo;
        }
        public async Task<int> GetUserId(ClaimsPrincipal userClaim)
        {
            var email = userClaim!.FindFirstValue(ClaimTypes.Name);
            var user = (await userRepo.GetAll(x => x.Email == email)).First();
            return user.Id;
        }
 
        public async Task<bool> IsAdmin(ClaimsPrincipal userClaim)
        {
            var role = userClaim!.FindFirstValue(ClaimTypes.Role);
            return role == "Admin";
        }
    }
}