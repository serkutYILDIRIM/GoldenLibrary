using System.Xml.Linq;

namespace GoldenLibrary.Entity
{
    public class Post
    {
        public int PostId { get; set; }
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? Content { get; set; }
        public string? Url { get; set; }
        public string? Image { get; set; }
        public DateTime PublishedOn { get; set; }
        public DateTime LastModified { get; set; } = DateTime.Now; // Track last edit time
        public bool IsActive { get; set; }
        public bool IsDraft { get; set; } // New property to distinguish drafts
        public int UserId { get; set; }
        public User? User { get; set; } = null!;
        public List<Tag>? Tags { get; set; } = new List<Tag>();
        public List<Comment>? Comments { get; set; } = new List<Comment>();
    }
}
