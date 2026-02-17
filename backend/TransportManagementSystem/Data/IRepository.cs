
using System.Linq.Expressions;

namespace TransportManagementSystem.Data
{
    public interface IRepository<T> where T : class
    {
        Task<List<T>> GetAll();
        Task<List<T>> GetAll(Expression<Func<T, bool>> filter);

        Task<T> FindByIdAsync(int id);
        Task AddAsync(T entity);
        void Update(T entity);
        Task DeleteAsync(int id);
        Task<int> SaveChangesAsync();
        Task DeleteAsync(params object[] keyValues);
        Task<T> FindByIdAsync(params object[] keyValues);
        IQueryable<T> Query();
        Task AddRangeAsync(IEnumerable<T> entities);
        void RemoveRange(IEnumerable<T> entities);
        void Remove(IEnumerable<T> entities);

    }

}
