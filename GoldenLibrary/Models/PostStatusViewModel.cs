namespace GoldenLibrary.Models
{
    /// <summary>
    /// ViewModel used to toggle the status of a post.
    /// This ViewModel is typically used in scenarios where the status of a post needs to be updated,
    /// such as publishing a draft or unpublishing a published post.
    /// It contains the unique identifier of the post whose status is being toggled.
    /// </summary>
    public class PostStatusViewModel
    {
        public int Id { get; set; }
    }
}
