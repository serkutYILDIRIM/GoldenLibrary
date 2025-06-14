using GoldenLibrary.Data.Abstract;
using GoldenLibrary.Entity;
using Microsoft.EntityFrameworkCore;

namespace GoldenLibrary.Data.Concrete.EfCore
{
    public class EfPostRepository : IPostRepository
    {
        private readonly BlogContext _context;
        
        public EfPostRepository(BlogContext context)
        {
            _context = context;
        }
        
        public IQueryable<Post> Posts => _context.Posts;

        // Repository Level Operations:

        // 1. CreatePost - Two versions:
        public void CreatePost(Post post)
        {
            // This method doesn't handle tag relationships, just saves the post
            _context.Posts.Add(post);
            _context.SaveChanges();
        }

        public void CreatePost(Post post, int[] tagIds)
        {
            try
            {
                // When a new post is created with tags:
                if (tagIds != null && tagIds.Length > 0)
                {
                    // Assign Tag entities to the post.Tags collection in a single query
                    post.Tags = _context.Tags.Where(tag => tagIds.Contains(tag.TagId)).ToList();
                }
                
                _context.Posts.Add(post);
                _context.SaveChanges();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error creating post: {ex.Message}");
                throw; // Re-throw to allow caller to handle
            }
        }

        // 2. EditPost - Two versions:
        public void EditPost(Post post)
        {
            var entity = _context.Posts.FirstOrDefault(i => i.PostId == post.PostId);

            if (entity != null)
            {
                UpdatePostProperties(entity, post);
                _context.SaveChanges();
            }
        }

        public void EditPost(Post post, int[] tagIds)
        {
            var entity = _context.Posts.Include(i => i.Tags).FirstOrDefault(i => i.PostId == post.PostId);

            if (entity != null)
            {
                UpdatePostProperties(entity, post);

                // Handle many-to-many relationship
                if (tagIds != null && tagIds.Length > 0)
                {
                    entity.Tags = _context.Tags.Where(tag => tagIds.Contains(tag.TagId)).ToList();
                }
                else
                {
                    // Clear all tags if empty array is passed
                    entity.Tags?.Clear();
                }
                
                _context.SaveChanges();
            }
        }

        // 3. SaveDraft - Also manages tag relations:
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
                        UpdatePostProperties(entity, post);
                        entity.IsActive = false;
                        entity.IsDraft = true;
                        entity.LastModified = DateTime.Now;
                        
                        // Handle tag relationships
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
                System.Diagnostics.Debug.WriteLine($"Error saving draft: {ex.Message}");
                throw; // Rethrow to notify caller
            }
        }

        public Post? GetDraft(int draftId, int userId)
        {
            return _context.Posts
                .Include(p => p.Tags)
                .FirstOrDefault(p => p.PostId == draftId && p.UserId == userId && p.IsDraft);
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
                if (post.PostId == 0)
                {
                    // New draft - auto-save
                    post.IsActive = false;
                    post.IsDraft = true;
                    post.LastModified = DateTime.Now;
                    _context.Posts.Add(post);
                }
                else
                {
                    // Update existing draft - auto-save
                    var entity = _context.Posts.FirstOrDefault(i => i.PostId == post.PostId && i.UserId == post.UserId);
                    if (entity != null)
                    {
                        // Only update content fields for auto-save
                        entity.Title = post.Title;
                        entity.Description = post.Description;
                        entity.Content = post.Content;
                        entity.LastModified = DateTime.Now;
                    }
                    else
                    {
                        return false; // Draft not found or doesn't belong to user
                    }
                }
                _context.SaveChanges();
                return true;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error auto-saving draft: {ex.Message}");
                return false;
            }
        }

        // Renamed to be more descriptive and avoid method overload ambiguity
        public Post? GetLatestDraft(int userId)
        {
            return _context.Posts
                .Include(p => p.Tags)
                .Where(p => p.UserId == userId && !p.IsActive)
                .OrderByDescending(p => p.PublishedOn)
                .FirstOrDefault();
        }

        // Implementation of the interface method to maintain compatibility
        public Post? GetDraft(int userId) => GetLatestDraft(userId);

        public void DeletePost(int postId)
        {
            try
            {
                var post = _context.Posts.Find(postId);
                if (post != null)
                {
                    // Load the related tags to ensure they're tracked
                    _context.Entry(post).Collection(p => p.Tags).Load();
                    
                    // Clear the Tags collection to properly remove all relationships
                    post.Tags?.Clear();
                    _context.SaveChanges(); // Save to delete join table entries first
                    
                    // Then remove the post itself
                    _context.Posts.Remove(post);
                    _context.SaveChanges();
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error deleting post: {ex.Message}");
                throw; // Re-throw the exception to notify the caller
            }
        }

        // Helper method to avoid code duplication when updating post properties
        private void UpdatePostProperties(Post entity, Post post)
        {
            entity.Title = post.Title;
            entity.Description = post.Description;
            entity.Content = post.Content;
            entity.Url = post.Url;
            entity.IsActive = post.IsActive;
        }
    }
}
