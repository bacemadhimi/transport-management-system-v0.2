using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
public class UserGroupController : ControllerBase
{
    private readonly IRepository<UserGroup> _userGroupRepository;
    private readonly IRepository<UserRight> _userRightRepository;
    private readonly IRepository<UserGroup2Right> _groupRightRepository;

    public UserGroupController(IRepository<UserGroup> userGroupRepository, IRepository<UserRight> userRightRepository, IRepository<UserGroup2Right> groupRightRepository)
    {
        this._userGroupRepository = userGroupRepository;
        this._userRightRepository = userRightRepository;
        this._groupRightRepository = groupRightRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetRoles([FromQuery] SearchOptions searchOption)
    {
        var pagedData = new PagedData<UserGroup>();

        if (string.IsNullOrEmpty(searchOption.Search))
        {
            pagedData.Data = await _userGroupRepository.GetAll();
        }
        else
        {
            pagedData.Data = await _userGroupRepository.GetAll(x =>
                x.Name.Contains(searchOption.Search));
        }

        pagedData.Data = pagedData.Data
     .Where(g => !g.Name.Equals("Driver", StringComparison.OrdinalIgnoreCase))
     .ToList();

        if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        {
            pagedData.Data = pagedData.Data
                .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                .Take(searchOption.PageSize.Value)
                .ToList();
        }

        return Ok(pagedData);
    }

    [HttpGet("All")]
    public async Task<IActionResult> GetAll()
    {
        var roles = await _userGroupRepository.GetAll();

        roles = roles
            .Where(g => !g.Name.Equals("Driver", StringComparison.OrdinalIgnoreCase))
            .ToList();

        return Ok(roles);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var role = await _userGroupRepository.FindByIdAsync(id);
        if (role == null)
            return NotFound();

        return Ok(role);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UserGroup model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        await _userGroupRepository.AddAsync(model);
        await _userGroupRepository.SaveChangesAsync();

        return Ok(model);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UserGroup model)
    {
        var role = await _userGroupRepository.FindByIdAsync(id);
        if (role == null)
            return NotFound();

        role.Name = model.Name;

        _userGroupRepository.Update(role);
        await _userGroupRepository.SaveChangesAsync();

        return Ok(role);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _userGroupRepository.DeleteAsync(id);
        await _userGroupRepository.SaveChangesAsync();

        return Ok();
    }

    [HttpGet("group/{groupId}/permissions")]
    public async Task<IActionResult> GetGroupPermissions(int groupId)
    {
        // 1️⃣ Liaisons groupe → droits
        var groupRights = await _groupRightRepository
            .GetAll(x => x.UserGroupId == groupId);

        if (!groupRights.Any())
            return Ok(new List<string>());

        // 2️⃣ IDs des droits
        var rightIds = groupRights
            .Select(x => x.UserRightId)
            .Distinct()
            .ToList();

        // 3️⃣ Récupération des codes
        var rights = await _userRightRepository
            .GetAll(r => rightIds.Contains(r.Id));

        var result = rights
            .Select(r => r.Code)
            .ToList();

        return Ok(result);
    }





    [HttpPost("group/{groupId}/permissions")]
    public async Task<IActionResult> SaveGroupPermissions(
        int groupId,
        [FromBody] List<string> permissionCodes)
    {
        var group = await _userGroupRepository.FindByIdAsync(groupId);
        if (group == null)
            return NotFound();

        // 1️⃣ Supprimer tous les droits existants (TABLE DE LIAISON)
        var existingRights = await _groupRightRepository
            .GetAll(x => x.UserGroupId == groupId);

        if (existingRights.Any())
        {
            _groupRightRepository.RemoveRange(existingRights);
            await _groupRightRepository.SaveChangesAsync();
        }

        // 2️⃣ Récupérer tous les droits
        var allRights = await _userRightRepository.GetAll();

        // 3️⃣ Appliquer les règles métier
        IEnumerable<UserRight> rightsToAssign;

        if (group.Name.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase))
        {
            rightsToAssign = allRights;
        }
        else if (group.Name.Equals("Admin", StringComparison.OrdinalIgnoreCase))
        {
            rightsToAssign = allRights
                .Where(r =>
                    permissionCodes.Contains(r.Code) &&
                    r.Code != "SYSTEM_MANAGEMENT"
                );
        }

        else
        {
            rightsToAssign = allRights
                .Where(r => permissionCodes.Contains(r.Code));
        }

        // 4️⃣ Insérer SANS doublons
        foreach (var right in rightsToAssign.DistinctBy(r => r.Id))
        {
            await _groupRightRepository.AddAsync(new UserGroup2Right
            {
                UserGroupId = groupId,
                UserRightId = right.Id
            });
        }

        await _groupRightRepository.SaveChangesAsync();

        return Ok(new
        {
            Message = "Permissions mises à jour avec succès",
            Group = group.Name,
            Rights = rightsToAssign.Select(r => r.Code)
        });
    }

    [HttpPost("inherit")]
    public async Task<IActionResult> CreateWithInheritance(
    CreateGroupWithInheritanceDto dto)
    {
        var group = new UserGroup
        {
            Name = dto.Name,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _userGroupRepository.AddAsync(group);
        await _userGroupRepository.SaveChangesAsync();

        if (dto.ParentGroupId.HasValue)
        {
            var parentRights = await _groupRightRepository
                .GetAll(x => x.UserGroupId == dto.ParentGroupId.Value);

            foreach (var r in parentRights)
            {
                await _groupRightRepository.AddAsync(new UserGroup2Right
                {
                    UserGroupId = group.Id,
                    UserRightId = r.UserRightId
                });
            }
            await _groupRightRepository.SaveChangesAsync();
        }

        return Ok(new UserGroupResponseDto
        {
            Id = group.Id,
            Name = group.Name
        });

    }


}
