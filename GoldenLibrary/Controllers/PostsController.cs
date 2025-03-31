using GoldenLibrary.Data.Abstract;
using GoldenLibrary.Entity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using GoldenLibrary.Models;
using System.Diagnostics;

namespace GoldenLibrary.Controllers
{
    public class PostsController : Controller
    {
        private IPostRepository _postRepository;
        private ICommentRepository _commentRepository;
        private ITagRepository _tagRepository;
        public PostsController(IPostRepository postRepository, ICommentRepository commentRepository, ITagRepository tagRepository)
        {
            _postRepository = postRepository;
            _commentRepository = commentRepository;
            _tagRepository = tagRepository;
        }
        public async Task<IActionResult> Index(string tag)
        {
            var posts = _postRepository.Posts.Where(i => i.IsActive);

            if (!string.IsNullOrEmpty(tag))
            {
                posts = posts.Where(x => x.Tags.Any(t => t.Url == tag));
            }

            return View(new PostsViewModel { Posts = await posts.ToListAsync() });
        }

        public async Task<IActionResult> Details(string url)
        {
            return View(await _postRepository
                        .Posts
                        .Include(x => x.User)
                        .Include(x => x.Tags)
                        .Include(x => x.Comments)
                        .ThenInclude(x => x.User)
                        .FirstOrDefaultAsync(p => p.Url == url));
        }

        [HttpPost]
        public JsonResult AddComment(int PostId, string Text)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var username = User.FindFirstValue(ClaimTypes.Name);
            var avatar = User.FindFirstValue(ClaimTypes.UserData);

            var entity = new Comment
            {
                PostId = PostId,
                Text = Text,
                PublishedOn = DateTime.Now,
                UserId = int.Parse(userId ?? "")
            };
            _commentRepository.CreateComment(entity);

            return Json(new
            {
                username,
                Text,
                entity.PublishedOn,
                avatar
            });

        }

        [Authorize]
        public IActionResult Create(int? id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
            
            // Check if user is trying to edit an existing draft
            if (id.HasValue)
            {
                var draft = _postRepository.GetDraft(id.Value, userId);
                if (draft != null)
                {
                    // Get the IDs of tags associated with this draft
                    var selectedTagIds = draft.Tags?.Select(t => t.TagId).ToList() ?? new List<int>();
                    ViewBag.SelectedTagIds = selectedTagIds;
                    
                    // Return existing draft for editing
                    ViewBag.Tags = _tagRepository.Tags.ToList();
                    return View(new PostCreateViewModel
                    {
                        PostId = draft.PostId,
                        Title = draft.Title,
                        Description = draft.Description,
                        Content = draft.Content,
                        Url = draft.Url,
                        Tags = draft.Tags
                    });
                }
            }
            
            // Start a new draft
            ViewBag.Tags = _tagRepository.Tags.ToList();
            ViewBag.SelectedTagIds = new List<int>(); // Empty list for new drafts
            return View();
        }

        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken]
        public IActionResult Create(PostCreateViewModel model, int[] tagIds, string action)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
            
            if (ModelState.IsValid)
            {
                var post = new Post
                {
                    PostId = model.PostId, // Will be 0 for new posts
                    Title = model.Title,
                    Description = model.Description,
                    Content = model.Content,
                    Url = model.Url,
                    UserId = userId,
                    PublishedOn = DateTime.Now,
                    LastModified = DateTime.Now,
                    Image = "1.jpg"
                };

                if (action == "draft")
                {
                    _postRepository.SaveDraft(post, tagIds);
                    TempData["Message"] = "Your draft has been saved successfully.";
                    return RedirectToAction("Drafts");
                }
                else
                {
                    post.IsActive = true;
                    post.IsDraft = false;
                    
                    if (model.PostId > 0)
                    {
                        // This was a draft that's now being published
                        _postRepository.EditPost(post, tagIds);
                    }
                    else
                    {
                        // Create new post with tags
                        _postRepository.CreatePost(post, tagIds);
                    }
                    TempData["Message"] = "Your story has been published successfully.";
                    return RedirectToAction("Index");
                }
            }
            
            ViewBag.Tags = _tagRepository.Tags.ToList();
            return View(model);
        }

        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken] // Add this attribute to validate the token
        public JsonResult AutoSave(PostCreateViewModel model)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
            
            if (string.IsNullOrWhiteSpace(model.Title) && string.IsNullOrWhiteSpace(model.Content))
            {
                return Json(new { success = false, message = "Nothing to save" });
            }
            
            var post = new Post
            {
                PostId = model.PostId,
                Title = model.Title ?? "Untitled",
                Description = model.Description,
                Content = model.Content,
                Url = model.Url,
                UserId = userId,
                PublishedOn = DateTime.Now,
                LastModified = DateTime.Now,
                Image = "1.jpg",
                IsActive = false,
                IsDraft = true
            };
            
            bool success = _postRepository.AutoSaveDraft(post);
            
            if (success)
            {
                // If this was a new draft, we need to return the new ID
                if (model.PostId == 0)
                {
                    var newDraft = _postRepository.GetUserDrafts(userId).FirstOrDefault(d => 
                        d.Title == post.Title && 
                        d.Content == post.Content);
                        
                    if (newDraft != null)
                    {
                        return Json(new { success = true, message = "Draft saved", postId = newDraft.PostId });
                    }
                }
                
                return Json(new { success = true, message = "Draft saved" });
            }
            
            return Json(new { success = false, message = "Failed to save draft" });
        }

        [Authorize]
        public IActionResult Drafts()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
            var drafts = _postRepository.GetUserDrafts(userId);
            
            return View(drafts);
        }

        [Authorize]
        public async Task<IActionResult> List(string tag)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "");
            var role = User.FindFirstValue(ClaimTypes.Role);

            var posts = _postRepository.Posts.Where(p => !p.IsDraft); // Exclude drafts from regular list

            if (string.IsNullOrEmpty(role))
            {
                posts = posts.Where(i => i.UserId == userId);
            }

            // Filter by tag if specified
            if (!string.IsNullOrEmpty(tag))
            {
                posts = posts.Where(x => x.Tags.Any(t => t.Url == tag));
            }

            // Get all tags for the filter
            ViewBag.Tags = await _tagRepository.Tags.ToListAsync();
            ViewBag.SelectedTag = tag;

            return View(await posts.ToListAsync());
        }

        [Authorize(Roles = "admin")]
        public async Task<IActionResult> AdminPosts()
        {
            var posts = await _postRepository.Posts
                        .Include(p => p.User)
                        .OrderByDescending(p => p.PublishedOn)
                        .ToListAsync();
            return View(posts);
        }

        [Authorize(Roles = "admin")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> TogglePostStatus([FromBody] PostStatusViewModel model)
        {
            try
            {
                if (model == null || model.Id <= 0)
                {
                    return Json(new { success = false, message = "Invalid post ID" });
                }

                // Get the complete post entity with all properties
                var post = await _postRepository.Posts
                            .Include(p => p.Tags)
                            .Include(p => p.User)
                            .FirstOrDefaultAsync(p => p.PostId == model.Id);
                            
                if (post == null)
                {
                    return Json(new { success = false, message = "Post not found" });
                }
                
                // Toggle the status
                bool originalStatus = post.IsActive;
                post.IsActive = !originalStatus;
                
                // Get the tag IDs to maintain associations
                var tagIds = post.Tags?.Select(t => t.TagId).ToArray() ?? Array.Empty<int>();
                
                // Create a complete entity that preserves all properties
                var entityToUpdate = new Post
                {
                    PostId = post.PostId,
                    Title = post.Title,
                    Content = post.Content,
                    Description = post.Description,
                    Image = post.Image,
                    Url = post.Url,
                    UserId = post.UserId,
                    PublishedOn = post.PublishedOn,
                    IsActive = post.IsActive // This is the toggled value
                };
                
                // Update the post in database
                _postRepository.EditPost(entityToUpdate, tagIds);
                
                // Return clear success response
                return Json(new { 
                    success = true, 
                    isActive = entityToUpdate.IsActive,
                    message = $"Post status changed from {(originalStatus ? "active" : "inactive")} to {(entityToUpdate.IsActive ? "active" : "inactive")}"
                });
            }
            catch (Exception ex)
            {
                // Log the error for debugging
                System.Diagnostics.Debug.WriteLine($"Error in TogglePostStatus: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack trace: {ex.StackTrace}");
                return Json(new { success = false, message = ex.Message });
            }
        }

        [Authorize(Roles = "admin")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeletePost([FromBody] PostStatusViewModel model)
        {
            try
            {
                if (model == null || model.Id <= 0)
                {
                    return Json(new { success = false, message = "Invalid post ID" });
                }

                // Get the post to verify it exists
                var post = await _postRepository.Posts
                            .FirstOrDefaultAsync(p => p.PostId == model.Id);
                
                if (post == null)
                {
                    return Json(new { success = false, message = "Post not found" });
                }
                
                // Delete the post
                _postRepository.DeletePost(model.Id);
                
                // Return success response
                return Json(new { 
                    success = true, 
                    message = "Post has been successfully deleted"
                });
            }
            catch (Exception ex)
            {
                // Log the error for debugging
                Debug.WriteLine($"Error in DeletePost: {ex.Message}");
                Debug.WriteLine($"Stack trace: {ex.StackTrace}");
                return Json(new { success = false, message = ex.Message });
            }
        }

        [Authorize]
        public IActionResult Edit(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }
            var post = _postRepository.Posts.Include(i => i.Tags).FirstOrDefault(i => i.PostId == id);
            if (post == null)
            {
                return NotFound();
            }

            ViewBag.Tags = _tagRepository.Tags.ToList();

            return View(new PostCreateViewModel
            {
                PostId = post.PostId,
                Title = post.Title,
                Description = post.Description,
                Content = post.Content,
                Url = post.Url,
                IsActive = post.IsActive,
                Tags = post.Tags
            });
        }

        [Authorize]
        [HttpPost]
        public IActionResult Edit(PostCreateViewModel model, int[] tagIds)
        {
            if (ModelState.IsValid)
            {
                var entityToUpdate = new Post
                {
                    PostId = model.PostId,
                    Title = model.Title,
                    Description = model.Description,
                    Content = model.Content,
                    Url = model.Url
                };

                if (User.FindFirstValue(ClaimTypes.Role) == "admin")
                {
                    entityToUpdate.IsActive = model.IsActive;
                }

                _postRepository.EditPost(entityToUpdate, tagIds);
                return RedirectToAction("List");
            }
            ViewBag.Tags = _tagRepository.Tags.ToList();
            return View(model);
        }

        [Authorize]
        public IActionResult Delete(int id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
            
            // Get the draft
            var draft = _postRepository.GetDraft(id, userId);
            
            // Check if the draft exists and belongs to the current user
            if (draft == null)
            {
                return NotFound();
            }
            
            // Delete the draft
            _postRepository.DeletePost(id);
            
            // Add success message
            TempData["Message"] = "Draft deleted successfully.";
            
            // Redirect back to drafts page
            return RedirectToAction("Drafts");
        }
    }
}