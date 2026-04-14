using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;
using TransportManagementSystem.Service;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly IRepository<User> _userRepository;
    private readonly IRepository<UserGroup> _userGroupRepository;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;

    public AuthController(
        IRepository<User> userRepository,
        IRepository<UserGroup> userGroupRepository,
        IConfiguration configuration)
    {
        _userRepository = userRepository;
        _userGroupRepository = userGroupRepository;
        _configuration = configuration;
        _httpClient = new HttpClient();
    }

    #region Login Standard

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] AuthDto model)
    {
        var user = await _userRepository.Query()
            .Include(u => u.UserGroup2Users)
                .ThenInclude(ugu => ugu.UserGroup)
                    .ThenInclude(g => g.UserGroup2Right)
                        .ThenInclude(gr => gr.UserRight)
            .FirstOrDefaultAsync(u => u.Email == model.Email);

        if (user == null)
            return BadRequest(new { message = "Utilisateur non trouvé" });

        var passwordHelper = new PasswordHelper();
        if (!passwordHelper.VerifyPassword(user.Password, model.Password))
            return BadRequest(new { message = "Email ou mot de passe incorrect" });

        var groups = user.UserGroup2Users
                         .Select(ugu => ugu.UserGroup.Name)
                         .ToList();

        var roles = groups.Any() ? groups : new List<string> { "Admin" };

        var permissions = user.UserGroup2Users
            .SelectMany(ugu => ugu.UserGroup.UserGroup2Right)
            .Select(r => r.UserRight.Code)
            .Distinct()
            .ToList();

        var token = GenerateToken(user.Id, user.Email, roles, permissions);

        var tokenHandler = new JwtSecurityTokenHandler();
        var jwtToken = tokenHandler.ReadJwtToken(token);
        var expClaim = jwtToken.Claims.First(c => c.Type == JwtRegisteredClaimNames.Exp).Value;
        var expTimestamp = long.Parse(expClaim);
        var expiryDate = DateTimeOffset.FromUnixTimeSeconds(expTimestamp).ToLocalTime().DateTime;

        return Ok(new AuthTokenDto
        {
            Id = user.Id,
            Email = user.Email,
            Token = token,
            Roles = roles,
            Permissions = permissions,
            Expiry = expiryDate
        });
    }

    #endregion

    #region Google Login (Utilisateurs Existants Uniquement)

    [HttpPost("google-login")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
    {
        try
        {
            Console.WriteLine($"🔐 Google login attempt for email: {request.Email}");

            // 1. Valider le token Google
            var googleUserInfo = await ValidateGoogleTokenAsync(request.GoogleToken);
            if (googleUserInfo == null)
            {
                Console.WriteLine("❌ Invalid Google token");
                return Unauthorized(new { message = "Token Google invalide" });
            }

            // Vérifier que l'email correspond
            if (!string.Equals(googleUserInfo.Email, request.Email, StringComparison.OrdinalIgnoreCase))
            {
                Console.WriteLine($"❌ Email mismatch: Google says {googleUserInfo.Email}, request says {request.Email}");
                return BadRequest(new { message = "Email mismatch with Google token" });
            }

            // 2. Vérifier si l'utilisateur existe DÉJÀ dans la base de données
            var existingUser = await _userRepository.Query()
                .Include(u => u.UserGroup2Users)
                    .ThenInclude(ugu => ugu.UserGroup)
                        .ThenInclude(g => g.UserGroup2Right)
                            .ThenInclude(gr => gr.UserRight)
                .FirstOrDefaultAsync(u => u.Email.ToLower() == googleUserInfo.Email.ToLower());

            // Si l'utilisateur n'existe pas, retourner une erreur
            if (existingUser == null)
            {
                Console.WriteLine($"❌ No account found for email: {googleUserInfo.Email}");
                return BadRequest(new
                {
                    message = "Aucun compte TMS n'est associé à cet email Google. Veuillez créer un compte d'abord ou contacter l'administrateur."
                });
            }

            bool needsUpdate = false;

            if (string.IsNullOrEmpty(existingUser.Name) && !string.IsNullOrEmpty(googleUserInfo.Name))
            {
                existingUser.Name = googleUserInfo.Name;
                needsUpdate = true;
            }

            if (string.IsNullOrEmpty(existingUser.ProfileImage) && !string.IsNullOrEmpty(googleUserInfo.Picture))
            {
                existingUser.ProfileImage = googleUserInfo.Picture;
                needsUpdate = true;
            }

            if (needsUpdate)
            {
                _userRepository.Update(existingUser);
                await _userRepository.SaveChangesAsync();
                Console.WriteLine($"✅ Updated user information for {existingUser.Email}");
            }

            // 4. Extraire les rôles et permissions
            var groups = existingUser.UserGroup2Users
                .Select(ugu => ugu.UserGroup.Name)
                .ToList();

            var roles = groups.Any() ? groups : new List<string> { "User" };

            var permissions = existingUser.UserGroup2Users
                .SelectMany(ugu => ugu.UserGroup.UserGroup2Right)
                .Select(r => r.UserRight.Code)
                .Distinct()
                .ToList();

            Console.WriteLine($"✅ User roles: {string.Join(", ", roles)}");
            Console.WriteLine($"✅ User permissions: {permissions.Count}");

            // 5. Générer le token JWT
            var token = GenerateToken(existingUser.Id, existingUser.Email, roles, permissions);

            // 6. Lire la date d'expiration
            var tokenHandler = new JwtSecurityTokenHandler();
            var jwtToken = tokenHandler.ReadJwtToken(token);
            var expClaim = jwtToken.Claims.First(c => c.Type == JwtRegisteredClaimNames.Exp).Value;
            var expTimestamp = long.Parse(expClaim);
            var expiryDate = DateTimeOffset.FromUnixTimeSeconds(expTimestamp).ToLocalTime().DateTime;

            Console.WriteLine($"✅ Google login successful for {existingUser.Email}");

            // 7. Retourner la réponse
            return Ok(new AuthTokenDto
            {
                Id = existingUser.Id,
                Email = existingUser.Email,
                Token = token,
                Roles = roles,
                Permissions = permissions,
                Expiry = expiryDate
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Google login error: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { message = "Erreur interne du serveur" });
        }
    }

    private async Task<GoogleUserInfo> ValidateGoogleTokenAsync(string accessToken)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get,
                "https://www.googleapis.com/oauth2/v3/userinfo");
            request.Headers.Add("Authorization", $"Bearer {accessToken}");

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                Console.WriteLine($"❌ Google token validation failed: {response.StatusCode}");
                var errorContent = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Error details: {errorContent}");
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            var userInfo = JsonSerializer.Deserialize<GoogleUserInfo>(content,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return userInfo;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error validating Google token: {ex.Message}");
            return null;
        }
    }

    #endregion

    #region Génération de Token JWT

    private string GenerateToken(int userId, string email, List<string> roles, List<string> permissions)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JwtKey"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name, email),
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        // Add driverId claim for drivers
        bool isDriver = roles.Any(r => r.Equals("Driver", StringComparison.OrdinalIgnoreCase));
        if (isDriver)
        {
            claims.Add(new Claim("driverId", userId.ToString()));
            claims.Add(new Claim("userId", userId.ToString()));
            Console.WriteLine($"✅ Added driverId claim for user {userId}");
        }

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        foreach (var permission in permissions)
        {
            claims.Add(new Claim("permission", permission));
        }

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    #endregion

    #region Gestion du Profil

    [Authorize]
    [HttpPost("Profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] ProfileDto model)
    {
        var email = User.FindFirstValue(ClaimTypes.Name);

        var users = await _userRepository.GetAll(x => x.Email == email);
        var user = users.FirstOrDefault();

        if (user == null)
            return Unauthorized(new { message = "Utilisateur non trouvé" });

        var passwordHelper = new PasswordHelper();

        if (!string.IsNullOrEmpty(model.Password))
        {
            if (string.IsNullOrEmpty(model.OldPassword))
                return BadRequest(new { message = "L'ancien mot de passe est requis" });

            if (!passwordHelper.VerifyPassword(user.Password, model.OldPassword))
                return BadRequest(new { message = "Ancien mot de passe incorrect" });

            user.Password = passwordHelper.HashPassword(model.Password);
        }

        if (!string.IsNullOrEmpty(model.Name)) user.Name = model.Name;
        if (!string.IsNullOrEmpty(model.Phone)) user.Phone = model.Phone;
        if (!string.IsNullOrEmpty(model.ProfileImage)) user.ProfileImage = model.ProfileImage;

        if (!string.IsNullOrEmpty(model.Email) && model.Email != user.Email)
        {
            var existingUser = (await _userRepository.GetAll(x => x.Email == model.Email && x.Id != user.Id))
                               .FirstOrDefault();
            if (existingUser != null)
                return BadRequest(new { message = "Cet email est déjà utilisé" });

            user.Email = model.Email;
        }

        _userRepository.Update(user);
        await _userRepository.SaveChangesAsync();

        return Ok(new { message = "Profil mis à jour avec succès" });
    }

    [Authorize]
    [HttpGet("Profile")]
    public async Task<IActionResult> GetProfile()
    {
        var email = User.FindFirstValue(ClaimTypes.Name);

        var users = await _userRepository.GetAll(x => x.Email == email);
        var user = users.FirstOrDefault();

        if (user == null)
            return Unauthorized(new { message = "Utilisateur non trouvé" });

        return Ok(new ProfileDto
        {
            Name = user.Name,
            Phone = user.Phone,
            Email = user.Email,
            ProfileImage = user.ProfileImage
        });
    }

    #endregion

    #region Gestion du Mot de Passe

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto model)
    {
        if (string.IsNullOrEmpty(model.Email))
            return BadRequest(new { message = "Email requis" });

        var users = await _userRepository.GetAll(x => x.Email == model.Email);
        var user = users.FirstOrDefault();

        if (user == null)
            return BadRequest(new { message = "Aucun utilisateur avec cet email" });

        string newPassword = PasswordHelper.GenerateRandomPassword();
        user.Password = new PasswordHelper().HashPassword(newPassword);

        _userRepository.Update(user);
        await _userRepository.SaveChangesAsync();

        var emailService = new EmailService(_configuration);
        await emailService.SendAsync(
            user.Email,
            "Réinitialisation de votre mot de passe",
            $"Bonjour,<br><br>Votre nouveau mot de passe est : <b>{newPassword}</b><br><br>Veuillez le changer après connexion."
        );

        return Ok(new { message = "Un nouveau mot de passe a été envoyé à votre adresse email." });
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto model)
    {
        var email = User.FindFirstValue(ClaimTypes.Name);

        var user = await _userRepository.Query()
            .Include(u => u.UserGroup2Users)
            .ThenInclude(ugu => ugu.UserGroup)
            .FirstOrDefaultAsync(u => u.Email == email);

        if (user == null)
            return Unauthorized(new { message = "Utilisateur non trouvé" });

        var passwordHelper = new PasswordHelper();

        if (string.IsNullOrEmpty(model.OldPassword))
            return BadRequest(new { message = "L'ancien mot de passe est requis" });

        if (!passwordHelper.VerifyPassword(user.Password, model.OldPassword))
            return BadRequest(new { message = "Ancien mot de passe incorrect" });

        if (string.IsNullOrEmpty(model.NewPassword))
            return BadRequest(new { message = "Le nouveau mot de passe est requis" });

        if (model.NewPassword.Length < 7)
            return BadRequest(new { message = "Le mot de passe doit contenir au moins 7 caractères" });

        var hasUpperCase = model.NewPassword.Any(char.IsUpper);
        var hasLowerCase = model.NewPassword.Any(char.IsLower);
        var hasDigit = model.NewPassword.Any(char.IsDigit);
        var hasSpecialChar = model.NewPassword.Any(ch => !char.IsLetterOrDigit(ch));

        if (!hasUpperCase || !hasLowerCase || !hasDigit || !hasSpecialChar)
        {
            return BadRequest(new { message = "Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial" });
        }

        if (passwordHelper.VerifyPassword(user.Password, model.NewPassword))
        {
            return BadRequest(new { message = "Le nouveau mot de passe doit être différent de l'ancien" });
        }

        user.Password = passwordHelper.HashPassword(model.NewPassword);

        if (user.GetType().GetProperty("PasswordLastChanged") != null)
        {
            user.GetType().GetProperty("PasswordLastChanged")?.SetValue(user, DateTime.UtcNow);
        }

        _userRepository.Update(user);
        await _userRepository.SaveChangesAsync();

        return Ok(new
        {
            message = "Mot de passe changé avec succès",
            success = true
        });
    }

    #endregion

    #region Refresh Token

    [Authorize]
    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { message = "Utilisateur non authentifié" });

        var user = await _userRepository.Query()
            .Include(u => u.UserGroup2Users)
                .ThenInclude(ugu => ugu.UserGroup)
                    .ThenInclude(g => g.UserGroup2Right)
                        .ThenInclude(gr => gr.UserRight)
            .FirstOrDefaultAsync(u => u.Id == int.Parse(userId));

        if (user == null)
            return Unauthorized(new { message = "Utilisateur non trouvé" });

        var groups = user.UserGroup2Users
            .Select(ugu => ugu.UserGroup.Name)
            .ToList();

        var roles = groups.Any() ? groups : new List<string> { "User" };

        var permissions = user.UserGroup2Users
            .SelectMany(ugu => ugu.UserGroup.UserGroup2Right)
            .Select(r => r.UserRight.Code)
            .Distinct()
            .ToList();

        var token = GenerateToken(user.Id, user.Email, roles, permissions);

        var tokenHandler = new JwtSecurityTokenHandler();
        var jwtToken = tokenHandler.ReadJwtToken(token);
        var expClaim = jwtToken.Claims.First(c => c.Type == JwtRegisteredClaimNames.Exp).Value;
        var expTimestamp = long.Parse(expClaim);
        var expiryDate = DateTimeOffset.FromUnixTimeSeconds(expTimestamp).ToLocalTime().DateTime;

        return Ok(new AuthTokenDto
        {
            Id = user.Id,
            Email = user.Email,
            Token = token,
            Roles = roles,
            Permissions = permissions,
            Expiry = expiryDate
        });
    }

    #endregion

    #region Classes de Support

    public class GoogleLoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Picture { get; set; } = string.Empty;
        public string GoogleToken { get; set; } = string.Empty;
        public string IdToken { get; set; } = string.Empty;
    }

    public class GoogleUserInfo
    {
        public string Sub { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool EmailVerified { get; set; }
        public string Name { get; set; } = string.Empty;
        public string GivenName { get; set; } = string.Empty;
        public string FamilyName { get; set; } = string.Empty;
        public string Picture { get; set; } = string.Empty;
        public string Locale { get; set; } = string.Empty;
    }

    #endregion
}

#region Extension Method pour Repository

public static class RepositoryExtensions
{
    public static DbContext GetDbContext<T>(this IRepository<T> repository) where T : class
    {
        var field = repository.GetType().GetField("_context",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);

        return field?.GetValue(repository) as DbContext;
    }
}

#endregion
