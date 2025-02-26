using GoldenLibrary.Entity;

namespace GoldenLibrary.Data.Abstract
{
    public interface IUserRepository
    {
        IQueryable<User> Users { get; }
        void CreateUser(User User);
    }
}
