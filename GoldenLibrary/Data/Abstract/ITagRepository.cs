using GoldenLibrary.Entity;

namespace GoldenLibrary.Data.Abstract
{
    public interface ITagRepository
    {
        IQueryable<Tag> Tags { get; }
        void CreateTag(Tag tag);
    }
}
