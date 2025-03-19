using GoldenLibrary.Entity;
using Microsoft.EntityFrameworkCore;

namespace GoldenLibrary.Data.Concrete.EfCore
{
    public class BlogContext : DbContext
    {
        public BlogContext(DbContextOptions<BlogContext> options) : base(options)
        {

        }
        public DbSet<Post> Posts => Set<Post>();
        public DbSet<Comment> Comments => Set<Comment>();
        public DbSet<Tag> Tags => Set<Tag>();
        public DbSet<User> Users => Set<User>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Explicitly configure the new properties in the model
            modelBuilder.Entity<Post>()
                .Property(p => p.IsDraft)
                .HasDefaultValue(false);
                
            modelBuilder.Entity<Post>()
                .Property(p => p.LastModified)
                .HasDefaultValueSql("GETDATE()");
        }
    }
}
