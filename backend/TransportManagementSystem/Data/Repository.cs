using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace TransportManagementSystem.Data
{
    public class Repository<T> : IRepository<T> where T : class
    {
        private readonly ApplicationDbContext dbContext;
        protected readonly DbSet<T> dbSet;
        public Repository(ApplicationDbContext dbContext)
        {
            dbSet = dbContext.Set<T>();
            this.dbContext = dbContext;

        }


        public async Task AddAsync(T entity)
        {
            await dbSet.AddAsync(entity);
        }

        public async Task DeleteAsync(int id)
        {
            var entity = await FindByIdAsync(id);
            dbSet.Remove(entity);
        }

        public async Task<T> FindByIdAsync(int id)
        {
            var entity = await dbSet.FindAsync(id);
            return entity;
        }

        public async Task<List<T>> GetAll()
        {
            var list = await dbSet.ToListAsync();
            return list;
        }

        public async Task<List<T>> GetAll(Expression<Func<T, bool>>? filter = null)
        {
            if (filter == null)
            {
                return await dbSet.ToListAsync();
            }
            return await dbSet.Where(filter).ToListAsync();
        }


        public async Task<int> SaveChangesAsync()
        {
            return await dbContext.SaveChangesAsync();
        }

        public void Update(T entity)
        {

            dbSet.Update(entity);
        }

        public async Task DeleteAsync(params object[] keyValues)
        {
            var entity = await FindByIdAsync(keyValues);
            if (entity != null)
            {
                dbSet.Remove(entity);
            }
        }

        public async Task<T> FindByIdAsync(params object[] keyValues)
        {
            var entity = await dbSet.FindAsync(keyValues);
            return entity;
        }

        public IQueryable<T> Query()
        {
            return dbContext.Set<T>().AsNoTracking();
        }
        public async Task AddRangeAsync(IEnumerable<T> entities)
        {
            if (entities == null)
                return;

            await dbContext.AddRangeAsync(entities);
        }

        public void RemoveRange(IEnumerable<T> entities)
        {
            if (entities == null)
                return;

            dbContext.RemoveRange(entities);
        }

        public void Remove(T entity)
        {
            dbSet.Remove(entity);
        }
        public void Remove(IEnumerable<T> entities)
        {
            if (entities == null) return;
            dbSet.RemoveRange(entities);
        }
    }
}
