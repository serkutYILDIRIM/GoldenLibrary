using GoldenLibrary.Data.Abstract;
using GoldenLibrary.Entity;
using Microsoft.EntityFrameworkCore;

namespace GoldenLibrary.Data.Concrete.EfCore
{
    public class EfPostRepository : IPostRepository
    {
        private BlogContext _context;
        public EfPostRepository(BlogContext context)
        {
            _context = context;
        }
        public IQueryable<Post> Posts => _context.Posts;

        public void CreatePost(Post post)
        {
            _context.Posts.Add(post);
            _context.SaveChanges();
        }

        public void EditPost(Post post)
        {
            var entity = _context.Posts.FirstOrDefault(i => i.PostId == post.PostId);

            if (entity != null)
            {
                entity.Title = post.Title;
                entity.Description = post.Description;
                entity.Content = post.Content;
                entity.Url = post.Url;
                entity.IsActive = post.IsActive;

                _context.SaveChanges();
            }
        }

        public void EditPost(Post post, int[] tagIds)
        {
            var entity = _context.Posts.Include(i => i.Tags).FirstOrDefault(i => i.PostId == post.PostId);

            if (entity != null)
            {
                entity.Title = post.Title;
                entity.Description = post.Description;
                entity.Content = post.Content;
                entity.Url = post.Url;
                entity.IsActive = post.IsActive;

                entity.Tags = _context.Tags.Where(tag => tagIds.Contains(tag.TagId)).ToList();

                _context.SaveChanges();
            }
        }

        public void SaveDraft(Post post)
        {
            if (post.PostId == 0)
            {
                // New draft
                post.IsActive = false; // Draft is not active
                _context.Posts.Add(post);
            }
            else
            {
                // Update existing draft
                var entity = _context.Posts.FirstOrDefault(i => i.PostId == post.PostId);
                if (entity != null)
                {
                    entity.Title = post.Title;
                    entity.Description = post.Description;
                    entity.Content = post.Content;
                    entity.Url = post.Url;
                    entity.IsActive = false; // Draft is not active
                }
            }
            _context.SaveChanges();
        }

        public Post? GetDraft(int userId)
        {
            return _context.Posts
                .Include(p => p.Tags)
                .Where(p => p.UserId == userId && !p.IsActive)
                .OrderByDescending(p => p.PublishedOn)
                .FirstOrDefault();
        }
    }
}
