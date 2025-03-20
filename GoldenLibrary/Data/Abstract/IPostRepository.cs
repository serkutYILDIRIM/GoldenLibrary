using GoldenLibrary.Entity;
using System.Collections.Generic;

namespace GoldenLibrary.Data.Abstract
{
    public interface IPostRepository
    {
        IQueryable<Post> Posts { get; }
        void CreatePost(Post post);
        void EditPost(Post post);
        void EditPost(Post post, int[] tagIds);
        
        // Draft specific methods
        void SaveDraft(Post post, int[]? tagIds = null);
        Post? GetDraft(int draftId, int userId);
        List<Post> GetUserDrafts(int userId);
        bool AutoSaveDraft(Post post);
        void DeletePost(int postId);
    }
}
