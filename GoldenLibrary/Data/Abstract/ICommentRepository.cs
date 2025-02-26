using GoldenLibrary.Entity;

namespace GoldenLibrary.Data.Abstract
{
    public interface ICommentRepository
    {
        IQueryable<Comment> Comments { get; }
        void CreateComment(Comment comment);
    }
}
