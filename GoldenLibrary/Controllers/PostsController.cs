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
        public IActionResult Create()
        {
            return View();
        }

        [HttpPost]
        [Authorize]
        public IActionResult Create(PostCreateViewModel model)
        {
            if (ModelState.IsValid)
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

                _postRepository.CreatePost(
                    new Post
                    {
                        Title = model.Title,
                        Content = model.Content,
                        Url = model.Url,
                        UserId = int.Parse(userId ?? ""),
                        PublishedOn = DateTime.Now,
                        Image = "1.jpg",
                        IsActive = false
                    }
                );
                return RedirectToAction("Index");
            }
            return View(model);
        }

        [Authorize]
        public async Task<IActionResult> List(string tag)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "");
            var role = User.FindFirstValue(ClaimTypes.Role);

            var posts = _postRepository.Posts;

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
    }
}