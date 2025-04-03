using GoldenLibrary.Entity;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace GoldenLibrary.Models
{
    public class PostCreateViewModel
    {
        public int PostId { get; set; }
        [Required]
        [Display(Name = "Başlık")]
        public string? Title { get; set; }

        [Required]
        [Display(Name = "Açıklama")]
        public string? Description { get; set; }

        [Required]
        [Display(Name = "İçerik")]
        public string? Content { get; set; }

        [Display(Name = "Url")]
        public string? Url { get; set; }
        public bool IsActive { get; set; }

        // Add the Image property for file upload
        [Display(Name = "Cover Image")]
        public IFormFile? Image { get; set; }
        
        // Add ImageName property to store the current image filename
        public string? ImageName { get; set; }

        public List<Tag> Tags { get; set; } = new();
    }
}
