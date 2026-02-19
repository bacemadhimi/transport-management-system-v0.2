using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CategoryController : ControllerBase
    {
        private readonly ApplicationDbContext dbContext;
        public CategoryController(ApplicationDbContext context)
        {
            dbContext = context;
        }

        //[HttpGet("PaginationAndSearch")]
        //public async Task<IActionResult> GetCategoryList([FromQuery] SearchOptions searchOption)
        //{
        //    var pagedData = new PagedData<Category>();

        //    var query = dbContext.Categories.AsQueryable();

        //    if (!string.IsNullOrEmpty(searchOption.Search))
        //    {
        //        query = query.Where(x =>
        //            x.Name != null && x.Name.Contains(searchOption.Search)
        //        );
        //    }

        //    pagedData.TotalData = await query.CountAsync();

        //    query = query.OrderByDescending(x => x.Id);

        //    if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        //    {
        //        query = query
        //            .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
        //            .Take(searchOption.PageSize.Value);
        //    }

        //    pagedData.Data = await query.ToListAsync();

        //    return Ok(pagedData);
        //}

        [HttpGet("PaginationAndSearch")]
        public async Task<IActionResult> GetCategoryList([FromQuery] SearchOptions searchOption)
        {
            var pagedData = new PagedData<Category>();

            var query = dbContext.Categories.AsQueryable();

            if (!string.IsNullOrEmpty(searchOption.Search))
            {
                query = query.Where(x =>
                    x.Name != null && x.Name.Contains(searchOption.Search)
                );
            }

            pagedData.TotalData = await query.CountAsync();

            query = query.OrderByDescending(x => x.Id);

            if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
            {
                query = query
                    .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                    .Take(searchOption.PageSize.Value);
            }

            pagedData.Data = await query
                .Select(x => new Category
                {
                    Id = x.Id,
                    Name = x.Name
                })
                .ToListAsync();

            return Ok(pagedData);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Category>> GetCategoryById(int id)
        {
            var category = await dbContext.Categories.FindAsync(id);

            if (category == null)
                return NotFound(new
                {
                    message = $"Catégorie avec l'ID {id} n'a pas été trouvée dans la base de données.",
                    Status = 404
                });

            return category;
        }

        [HttpPost]
        public async Task<IActionResult> AddCategory([FromBody] Category model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            dbContext.Categories.Add(model);
            await dbContext.SaveChangesAsync();
            return Ok(new { message = "Catégorie ajoutée avec succès", category = model });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCategory(int id, [FromBody] Category model)
        {
            var category = await dbContext.Categories.FindAsync(id);
            if (category == null)
                return NotFound(new { message = "Catégorie non trouvée" });
            category.Name = model.Name;
            await dbContext.SaveChangesAsync();
            return Ok(new { message = "Catégorie mise à jour avec succès", category });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            var category = await dbContext.Categories.FindAsync(id);
            if (category == null)
                return NotFound(new { message = "Catégorie non trouvée" });
            dbContext.Categories.Remove(category);
            await dbContext.SaveChangesAsync();
            return Ok(new { message = "Catégorie supprimée avec succès" });
        }

    }
}
