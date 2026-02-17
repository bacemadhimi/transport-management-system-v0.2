
using Microsoft.AspNetCore.Identity;
using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Service
{
    public class PasswordHelper
    {
        public string HashPassword(string password)
        {

            var hasher = new PasswordHasher<User>();
            return hasher.HashPassword(null, password);
        }


        public bool VerifyPassword(string hash, string password)
        {
            var hasher = new PasswordHasher<User>();
            var result = hasher.VerifyHashedPassword(null, hash, password);
            return result == PasswordVerificationResult.Success ? true : false;
        }
        public static string GenerateRandomPassword(int length = 10)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%!";
            var random = new Random();
            return new string(Enumerable.Repeat(chars, length)
              .Select(s => s[random.Next(s.Length)]).ToArray());
        }

    }
}
