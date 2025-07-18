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
                posts = posts.Where(x => x.Tags.Any(t => t.Url == tag));

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
                // Ensure PostId is properly handled - if empty/invalid, default to 0
                int postId = 0;

                if (model.PostId.HasValue)
                    postId = model.PostId.Value;

                var post = new Post
                {
                    PostId = postId,
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
                    post.IsActive = false;
                    post.IsDraft = false;

                    if (postId > 0)
                        _postRepository.EditPost(post, tagIds);
                    else
                        _postRepository.CreatePost(post, tagIds);

                    TempData["Message"] = "Your story has been published successfully.";
                    return RedirectToAction("Index");
                }
            }

            var errors = ModelState
                .Where(x => x.Value.Errors.Count > 0)
                .Select(x => new
                {
                    Property = x.Key,
                    Errors = x.Value.Errors.Select(e => e.ErrorMessage).ToList()
                })
                .ToList();

            // Log or inspect errors
            foreach (var error in errors)
            {
                System.Diagnostics.Debug.WriteLine($"Property: {error.Property}, Errors: {string.Join(", ", error.Errors)}");
            }

            ViewBag.Tags = _tagRepository.Tags.ToList();
            return View(model);
        }

        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken]
        public JsonResult AutoSave(PostCreateViewModel model)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

            if (string.IsNullOrWhiteSpace(model.Title) && string.IsNullOrWhiteSpace(model.Content))
                return Json(new { success = false, message = "Nothing to save" });

            var post = new Post
            {
                PostId = model.PostId ?? 0,
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
                        return Json(new { success = true, message = "Draft saved", postId = newDraft.PostId });
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
                posts = posts.Where(i => i.UserId == userId);

            // Filter by tag if specified
            if (!string.IsNullOrEmpty(tag))
                posts = posts.Where(x => x.Tags.Any(t => t.Url == tag));

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
                    return Json(new { success = false, message = "Invalid post ID" });

                // Get the complete post entity with all properties
                var post = await _postRepository.Posts
                            .Include(p => p.Tags)
                            .Include(p => p.User)
                            .FirstOrDefaultAsync(p => p.PostId == model.Id);

                if (post == null)
                    return Json(new { success = false, message = "Post not found" });

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
                return Json(new
                {
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
                    return Json(new { success = false, message = "Invalid post ID" });

                // Get the post to verify it exists
                var post = await _postRepository.Posts
                            .FirstOrDefaultAsync(p => p.PostId == model.Id);

                if (post == null)
                    return Json(new { success = false, message = "Post not found" });

                // Delete the post
                _postRepository.DeletePost(model.Id);

                // Return success response
                return Json(new
                {
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
                return NotFound();

            var post = _postRepository.Posts.Include(i => i.Tags).FirstOrDefault(i => i.PostId == id);

            if (post == null)
                return NotFound();

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
                    PostId = model.PostId ?? 0, // Fix: Handle nullable PostId by using null-coalescing operator
                    Title = model.Title,
                    Description = model.Description,
                    Content = model.Content,
                    Url = model.Url
                };

                if (User.FindFirstValue(ClaimTypes.Role) == "admin")
                    entityToUpdate.IsActive = model.IsActive;

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
                return NotFound();

            // Delete the draft
            _postRepository.DeletePost(id);

            // Add success message
            TempData["Message"] = "Draft deleted successfully.";

            // Redirect back to drafts page
            return RedirectToAction("Drafts");
        }

        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UploadArticleImage(IFormFile image)
        {
            if (image == null || image.Length == 0)
                return Json(new { success = false, message = "No file was uploaded" });

            // Validate file type
            var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
            if (!allowedTypes.Contains(image.ContentType))
                return Json(new { success = false, message = "Invalid file type. Only JPG, PNG, GIF and WEBP are allowed." });

            try
            {
                // Generate a unique filename to prevent overwrites
                string uniqueFileName = $"{Guid.NewGuid()}_{image.FileName}";

                // Create directory if it doesn't exist
                string uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                if (!Directory.Exists(uploadsFolder))
                    Directory.CreateDirectory(uploadsFolder);

                // Save the file
                string filePath = Path.Combine(uploadsFolder, uniqueFileName);
                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await image.CopyToAsync(fileStream);
                }

                // Return success with the URL to the saved image
                return Json(new
                {
                    success = true,
                    imageUrl = $"/uploads/{uniqueFileName}",
                    message = "Image uploaded successfully"
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Error uploading image: {ex.Message}" });
            }
        }

        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UploadMedia(IFormFile mediaFile, string mediaType)
        {
            if (mediaFile == null || mediaFile.Length == 0)
                return Json(new { success = false, message = "No file was uploaded" });

            try
            {
                string uploadsFolder = "";
                string uniqueFileName = "";
                string fileUrl = "";

                // Handle different media types
                switch (mediaType.ToLower())
                {
                    case "image":
                        // Validate file type
                        var allowedImageTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
                        if (!allowedImageTypes.Contains(mediaFile.ContentType))
                            return Json(new { success = false, message = "Invalid file type. Only JPG, PNG, GIF and WEBP are allowed." });

                        // Save to images directory
                        uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "images");
                        uniqueFileName = $"{Guid.NewGuid()}_{mediaFile.FileName}";
                        fileUrl = $"/uploads/images/{uniqueFileName}";
                        break;

                    case "video":
                        // Validate file type for videos
                        var allowedVideoTypes = new[] { "video/mp4", "video/webm", "video/ogg" };
                        if (!allowedVideoTypes.Contains(mediaFile.ContentType))
                            return Json(new { success = false, message = "Invalid file type. Only MP4, WebM, and OGG video formats are allowed." });

                        // Save to videos directory
                        uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "videos");
                        uniqueFileName = $"{Guid.NewGuid()}_{mediaFile.FileName}";
                        fileUrl = $"/uploads/videos/{uniqueFileName}";
                        break;

                    case "document":
                        // Validate file type for documents
                        var allowedDocTypes = new[] { "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
                        if (!allowedDocTypes.Contains(mediaFile.ContentType))
                            return Json(new { success = false, message = "Invalid file type. Only PDF and Word documents are allowed." });

                        // Save to documents directory
                        uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "documents");
                        uniqueFileName = $"{Guid.NewGuid()}_{mediaFile.FileName}";
                        fileUrl = $"/uploads/documents/{uniqueFileName}";
                        break;

                    default:
                        return Json(new { success = false, message = "Invalid media type specified." });
                }

                // Create directory if it doesn't exist
                if (!Directory.Exists(uploadsFolder))
                    Directory.CreateDirectory(uploadsFolder);

                // Save the file
                string filePath = Path.Combine(uploadsFolder, uniqueFileName);
                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await mediaFile.CopyToAsync(fileStream);
                }

                // Return success with the URL to the saved media
                return Json(new
                {
                    success = true,
                    mediaUrl = fileUrl,
                    mediaType = mediaType,
                    fileName = mediaFile.FileName,
                    message = $"{mediaType} uploaded successfully"
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Error uploading media: {ex.Message}" });
            }
        }

        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SearchUnsplash(string query, int page = 1)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return Json(new { success = false, message = "Search query cannot be empty" });
            }

            try
            {
                // You would normally get this from configuration
                // Remember to register and get your own API key from Unsplash Developer portal
                string unsplashAccessKey = "YOUR_UNSPLASH_ACCESS_KEY_HERE";
                int perPage = 12;

                // Construct the Unsplash API URL
                string apiUrl = $"https://api.unsplash.com/search/photos?query={Uri.EscapeDataString(query)}&page={page}&per_page={perPage}";

                // Create HTTP client
                using (var httpClient = new HttpClient())
                {
                    httpClient.DefaultRequestHeaders.Add("Accept-Version", "v1");
                    httpClient.DefaultRequestHeaders.Add("Authorization", $"Client-ID {unsplashAccessKey}");

                    // Send request to Unsplash API
                    var response = await httpClient.GetAsync(apiUrl);

                    if (response.IsSuccessStatusCode)
                    {
                        // Parse the response
                        var jsonResponse = await response.Content.ReadAsStringAsync();
                        var searchResult = System.Text.Json.JsonSerializer.Deserialize<UnsplashSearchResult>(jsonResponse);

                        return Json(new
                        {
                            success = true,
                            results = searchResult.results,
                            totalPages = searchResult.total_pages
                        });
                    }
                    else
                    {
                        return Json(new { success = false, message = $"Unsplash API error: {response.StatusCode}" });
                    }
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Error searching Unsplash: {ex.Message}" });
            }
        }

        // Classes to deserialize Unsplash API response
        public class UnsplashSearchResult
        {
            public int total { get; set; }
            public int total_pages { get; set; }
            public List<UnsplashPhoto> results { get; set; }
        }

        public class UnsplashPhoto
        {
            public string id { get; set; }
            public UnsplashUrls urls { get; set; }
            public string alt_description { get; set; }
            public UnsplashUser user { get; set; }
        }

        public class UnsplashUrls
        {
            public string raw { get; set; }
            public string full { get; set; }
            public string regular { get; set; }
            public string small { get; set; }
            public string thumb { get; set; }
        }

        public class UnsplashUser
        {
            public string id { get; set; }
            public string name { get; set; }
            public UnsplashLinks links { get; set; }
        }

        public class UnsplashLinks
        {
            public string html { get; set; }
            public string photos { get; set; }
            public string portfolio { get; set; }
        }
    }
}