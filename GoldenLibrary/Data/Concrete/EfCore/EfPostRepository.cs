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
                        
                        // Update tags if provided
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
    }
}
