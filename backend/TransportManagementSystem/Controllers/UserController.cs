using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;
using TransportManagementSystem.Service;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
public class UserController : ControllerBase
{
    private readonly IRepository<User> userRepository;
    private readonly IRepository<UserGroup2User> userGroupUserRepo;
    private readonly PasswordHelper passwordHelper;

    public UserController(IRepository<User> userRepository, IRepository<UserGroup2User> userGroupUserRepo)
    {
        this.userRepository = userRepository;
        this.userGroupUserRepo = userGroupUserRepo;
        this.passwordHelper = new PasswordHelper();
    }


    [HttpGet]
    public async Task<IActionResult> GetUserList([FromQuery] SearchOptions searchOption)
    {
        var pagedData = new PagedData<User>();

        if (string.IsNullOrEmpty(searchOption.Search))
        {
            pagedData.Data = await userRepository.GetAll();
        }
        else
        {
            pagedData.Data = await userRepository.GetAll(x =>
                               x.Name.Contains(searchOption.Search) ||
                               x.Email.Contains(searchOption.Search) ||
                               (x.Phone != null && x.Phone.Contains(searchOption.Search))
                               );
        }

        pagedData.TotalData = pagedData.Data.Count;

        if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        {
            pagedData.Data = pagedData.Data
                .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                .Take(searchOption.PageSize.Value)
                .ToList();
        }

        return Ok(pagedData);
    }



    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserById(int id)
    {
        var user = await userRepository.Query()
            .Include(u => u.UserGroup2Users)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
            return NotFound();

        var dto = new UserDto
        {
            Name = user.Name,
            Email = user.Email,
            Phone = user.Phone,
            ProfileImage = user.ProfileImage,
            Password = null, 
            UserGroupIds = user.UserGroup2Users
                .Select(x => x.UserGroupId)
                .ToList()
        };

        return Ok(dto);
    }


    [HttpPost]
    public async Task<IActionResult> AddUser([FromBody] UserDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var existingUser = (await userRepository.GetAll(x => x.Email == model.Email))
            .FirstOrDefault();

        if (existingUser != null)
            return BadRequest("Un utilisateur avec cet email existe déjà");

        var user = new User
        {
            Name = model.Name,
            Email = model.Email,
            Phone = model.Phone,
            ProfileImage = model.ProfileImage,
            Password = passwordHelper.HashPassword("12345"),
            UserGroup2Users = new List<UserGroup2User>()
        };

        if (model.UserGroupIds != null && model.UserGroupIds.Any())
        {
            foreach (var groupId in model.UserGroupIds.Distinct())
            {
                user.UserGroup2Users.Add(new UserGroup2User
                {
                    UserGroupId = groupId
                });
            }
        }

        await userRepository.AddAsync(user);
        await userRepository.SaveChangesAsync();

        return CreatedAtAction(nameof(GetUserById), new { id = user.Id }, null);
    }


    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UserDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await userRepository.Query()
            .Include(u => u.UserGroup2Users)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
            return NotFound();

        var existingUser = (await userRepository.GetAll(x => x.Email == model.Email && x.Id != id))
            .FirstOrDefault();

        if (existingUser != null)
            return BadRequest("Un utilisateur avec cet email existe déjà");

        // Mise à jour des infos générales
        user.Name = model.Name;
        user.Email = model.Email;
        user.Phone = model.Phone;
        user.ProfileImage = model.ProfileImage;

        if (!string.IsNullOrWhiteSpace(model.Password))
        {
            user.Password = passwordHelper.HashPassword(model.Password);
        }

        // Gestion des groupes
        var newGroupIds = model.UserGroupIds?.Distinct().ToList() ?? new List<int>();

  
        var toRemove = user.UserGroup2Users
     .Where(x => !newGroupIds.Contains(x.UserGroupId))
     .ToList();

        foreach (var item in toRemove)
        {
            user.UserGroup2Users.Remove(item);   
        }

        userGroupUserRepo.Remove(toRemove);      


        await userRepository.SaveChangesAsync(); 
        
        var existingGroupIds = user.UserGroup2Users.Select(x => x.UserGroupId).ToList();
        var toAdd = newGroupIds.Where(idGroup => !existingGroupIds.Contains(idGroup));

        foreach (var groupId in toAdd)
        {
            userGroupUserRepo.AddAsync(new UserGroup2User
            {
                UserId = user.Id,
                UserGroupId = groupId
            });
        }

        // Sauvegarde finale
        userRepository.Update(user);
        await userRepository.SaveChangesAsync();
        await userGroupUserRepo.SaveChangesAsync();

        return Ok();
    }



    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await userRepository.FindByIdAsync(id);
        if (user == null)
            return NotFound();


        var currentUserEmail = User.Identity.Name;
        if (user.Email == currentUserEmail)
            return BadRequest("Vous ne pouvez pas supprimer votre propre compte");

        await userRepository.DeleteAsync(id);
        await userRepository.SaveChangesAsync();

        return Ok();
    }
}
