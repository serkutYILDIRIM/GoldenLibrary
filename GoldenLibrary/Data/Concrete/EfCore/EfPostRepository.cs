using GoldenLibrary.Data.Abstract;
using GoldenLibrary.Entity;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;

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

        // Repository Seviyesinde Yapılan İşlemler:

        // 1. CreatePost - İki versiyonu vardır:
        public void CreatePost(Post post)
        {
            // Bu metot tag ilişkilerini yönetmez, sadece gönderiyi kaydeder
            _context.Posts.Add(post);
            _context.SaveChanges();
        }

        public void CreatePost(Post post, int[] tagIds)
        {
            // When a new post is created:
            if (tagIds != null && tagIds.Length > 0)
            {
                // 1. Fetch all Tag entities whose IDs are in the tagIds array
                // 2. Assign these Tag entities to the post.Tags collection
                post.Tags = _context.Tags.Where(tag => tagIds.Contains(tag.TagId)).ToList();
                
                // 3. When SaveChanges() is called, EF Core will:
                //    - Insert the new Post entity
                //    - Insert entries in the join table (PostTag) to connect the post with each tag
            }
            
            _context.Posts.Add(post);
            _context.SaveChanges();
        }

        // 2. EditPost - Tag ilişkilerini yöneten versiyon:
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

                // 1. Include(i => i.Tags) loads the current tag relationships
                // 2. Completely replace the Tags collection with new tags
                entity.Tags = _context.Tags.Where(tag => tagIds.Contains(tag.TagId)).ToList();
                
                // 3. When SaveChanges() is called, EF Core will:
                //    - Delete all existing entries from the join table for this post
                //    - Insert new join table entries for the new tag relationships
                //    - This effectively replaces all tag associations in one operation

                _context.SaveChanges();
            }
        }

        // 3. SaveDraft - It is also manage tag relations:
        public void SaveDraft(Post post, int[]? tagIds = null)
        {
            try
            {
                if (post.PostId == 0)
                {
                    // New draft
                    post.IsActive = false;
                    post.IsDraft = true;
                    _context.Posts.Add(post);
                }
                else
                {
                    // Update existing draft
                    var entity = _context.Posts.Include(i => i.Tags).FirstOrDefault(i => i.PostId == post.PostId);
                    if (entity != null)
                    {
                        entity.Title = post.Title;
                        entity.Description = post.Description;
                        entity.Content = post.Content;
                        entity.Url = post.Url;
                        entity.IsActive = false;
                        entity.IsDraft = true;
                        entity.LastModified = DateTime.Now;
                        
                        // Many-to-Many Relationship Management:
                        // The tagIds array is also accepted during draft saving and
                        // associates the tags with the post
                        if (tagIds != null && tagIds.Length > 0)
                        {
                            entity.Tags = _context.Tags.Where(tag => tagIds.Contains(tag.TagId)).ToList();
                        }
                    }
                }
                _context.SaveChanges();
            }
            catch (Exception ex)
            {
                // Log the error
                System.Diagnostics.Debug.WriteLine($"Error saving draft: {ex.Message}");
                throw; // Rethrow to notify caller
            }
        }

        public Post? GetDraft(int draftId, int userId)
        {
            return _context.Posts
                .Include(p => p.Tags)
                .Where(p => p.PostId == draftId && p.UserId == userId && p.IsDraft)
                .FirstOrDefault();
        }

        public List<Post> GetUserDrafts(int userId)
        {
            return _context.Posts
                .Include(p => p.Tags)
                .Where(p => p.UserId == userId && p.IsDraft)
                .OrderByDescending(p => p.LastModified)
                .ToList();
        }

        public bool AutoSaveDraft(Post post)
        {
            try
            {
                // For auto-save we only update content fields, not relationships
                if (post.PostId == 0)
                {
                    // New draft
                    post.IsActive = false;
                    post.IsDraft = true;
                    post.LastModified = DateTime.Now;
                    _context.Posts.Add(post);
                }
                else
                {
                    // Update existing draft
                    var entity = _context.Posts.FirstOrDefault(i => i.PostId == post.PostId && i.UserId == post.UserId);
                    if (entity != null)
                    {
                        entity.Title = post.Title;
                        entity.Description = post.Description;
                        entity.Content = post.Content;
                        entity.LastModified = DateTime.Now;
                        // Keep other properties unchanged for auto-save
                    }
                    else
                    {
                        return false; // Draft not found or doesn't belong to user
                    }
                }
                _context.SaveChanges();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public Post? GetDraft(int userId)
        {
            return _context.Posts
                .Include(p => p.Tags)
                .Where(p => p.UserId == userId && !p.IsActive)
                .OrderByDescending(p => p.PublishedOn)
                .FirstOrDefault();
        }

        public void DeletePost(int postId)
        {
            try
            {
                // When a post is deleted:
                var post = _context.Posts.Find(postId);
                if (post != null)
                {
                    // 1. Explicitly load the related tags to ensure they're tracked
                    _context.Entry(post).Collection(p => p.Tags).Load();
                    
                    // 2. Clear the Tags collection to remove all relationships
                    if (post.Tags != null)
                    {
                        post.Tags.Clear();
                        _context.SaveChanges(); // Save to delete all join table entries
                    }
                    
                    // 3. Then remove the post itself
                    _context.Posts.Remove(post);
                    _context.SaveChanges();
                }
            }
            catch (Exception ex)
            {
                // Log the error for debugging
                System.Diagnostics.Debug.WriteLine($"Error deleting post: {ex.Message}");
                throw; // Re-throw the exception to notify the caller
            }
        }
    }
}
