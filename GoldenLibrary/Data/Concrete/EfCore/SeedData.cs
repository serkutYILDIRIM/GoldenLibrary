using GoldenLibrary.Entity;
using Microsoft.EntityFrameworkCore;

namespace GoldenLibrary.Data.Concrete.EfCore
{
    public static class SeedData
    {
        public static void FillTestData(IApplicationBuilder app)
        {
            var context = app.ApplicationServices.CreateScope().ServiceProvider.GetService<BlogContext>();

            if (context != null)
            {
                if (context.Database.GetPendingMigrations().Any())
                {
                    context.Database.Migrate();
                }

                if (!context.Tags.Any())
                {
                    context.Tags.AddRange(
                        new Tag { Text = "Web Development", Url = "web-development", Color = TagColors.primary },
                        new Tag { Text = "Cloud Computing", Url = "cloud-computing", Color = TagColors.info },
                        new Tag { Text = "Machine Learning", Url = "machine-learning", Color = TagColors.danger },
                        new Tag { Text = "DevOps", Url = "devops", Color = TagColors.warning },
                        new Tag { Text = "Mobile Development", Url = "mobile-development", Color = TagColors.success },
                        new Tag { Text = "Data Science", Url = "data-science", Color = TagColors.secondary },
                        new Tag { Text = "Cybersecurity", Url = "cybersecurity", Color = TagColors.primary },
                        new Tag { Text = "Blockchain", Url = "blockchain", Color = TagColors.warning },
                        new Tag { Text = "UI/UX Design", Url = "ui-ux-design", Color = TagColors.info }
                    );
                    context.SaveChanges();
                }

                if (!context.Users.Any())
                {
                    context.Users.AddRange(
                        new User { UserName = "emilyjohnson", Name = "Emily Johnson", Email = "emily.johnson@example.com", Password = "123456", Image = "p1.jpg" },
                        new User { UserName = "michaelchen", Name = "Michael Chen", Email = "m.chen@techblog.net", Password = "S3cure!Dev", Image = "p2.jpg" },
                        new User { UserName = "aishapatil", Name = "Aisha Patil", Email = "aisha.p@datasolutions.org", Password = "DataExp3rt", Image = "aisha.jpg" },
                        new User { UserName = "jamesrodriguez", Name = "James Rodriguez", Email = "jrodriguez@cloudexperts.com", Password = "CloudM@ster22", Image = "james.jpg" },
                        new User { UserName = "sophiawilliams", Name = "Sophia Williams", Email = "sophia.w@designcraft.io", Password = "Cr3at!veUX", Image = "sophia.jpg" }
                    );
                    context.SaveChanges();
                }

                if (!context.Posts.Any())
                {
                    context.Posts.AddRange(
                        new Post
                        {
                            Title = "Microservices Architecture: Benefits and Challenges",
                            Description = "An exploration of microservices architecture implementation in modern enterprise applications.",
                            Content = "Microservices architecture has become a popular approach for building complex applications. This article discusses the benefits of microservices including scalability, technology diversity, and resilience. We also explore challenges such as distributed system complexity, data consistency issues, and operational overhead. Real-world examples and implementation strategies are provided to help you determine if microservices are right for your next project.",
                            Url = "microservices-architecture-benefits-challenges",
                            IsActive = true,
                            PublishedOn = DateTime.Now.AddDays(-15),
                            Tags = context.Tags.Where(t => t.Text == "Cloud Computing" || t.Text == "DevOps").ToList(),
                            Image = "1.jpg",
                            UserId = 1,
                            Comments = new List<Comment> {
                                new Comment { Text = "Great overview of the microservices trade-offs. I especially appreciated the section on data consistency challenges.", PublishedOn = DateTime.Now.AddDays(-12), UserId = 3 },
                                new Comment { Text = "We implemented microservices last year and faced many of the challenges mentioned. This article would have been tremendously helpful!", PublishedOn = DateTime.Now.AddDays(-10), UserId = 2 },
                                new Comment { Text = "Could you elaborate more on service discovery patterns in a follow-up article?", PublishedOn = DateTime.Now.AddDays(-5), UserId = 4 }
                            }
                        },
                        new Post
                        {
                            Title = "Ethical Considerations in Machine Learning",
                            Description = "Exploring the ethical implications of machine learning algorithms and bias mitigation strategies.",
                            Content = "As machine learning systems become increasingly integrated into critical decision-making processes, addressing bias and ethical concerns is paramount. This article examines sources of bias in training data, techniques for fairness-aware machine learning, and the importance of transparency in AI systems. We discuss real case studies where algorithmic bias has led to harmful outcomes and provide a framework for ethical AI development practices that developers and organizations can adopt.",
                            Url = "ethical-considerations-machine-learning",
                            IsActive = true,
                            Image = "2.jpg",
                            PublishedOn = DateTime.Now.AddDays(-23),
                            Tags = context.Tags.Where(t => t.Text == "Machine Learning" || t.Text == "Data Science").ToList(),
                            UserId = 3,
                            Comments = new List<Comment> {
                                new Comment { Text = "This is such an important topic. I've seen firsthand how unaddressed bias can creep into production systems.", PublishedOn = DateTime.Now.AddDays(-20), UserId = 1 },
                                new Comment { Text = "Would love to see more discussion about regulatory frameworks for AI ethics across different countries.", PublishedOn = DateTime.Now.AddDays(-18), UserId = 5 }
                            }
                        },
                        new Post
                        {
                            Title = "Progressive Web Apps: The Future of Mobile Web",
                            Description = "How PWAs are changing the landscape of mobile web development and user experience.",
                            Content = "Progressive Web Apps (PWAs) offer a compelling alternative to native mobile applications with benefits like offline functionality, push notifications, and app-like interfaces without the hassle of app store submissions. This article dives into the core technologies behind PWAs (Service Workers, Web App Manifests, and HTTPS), showcases successful PWA implementations from major companies, and provides a step-by-step guide to converting an existing web application to a PWA with code examples and best practices.",
                            Url = "progressive-web-apps-future",
                            IsActive = true,
                            Image = "3.jpg",
                            PublishedOn = DateTime.Now.AddDays(-30),
                            Tags = context.Tags.Where(t => t.Text == "Web Development" || t.Text == "Mobile Development").ToList(),
                            UserId = 2
                        },
                        new Post
                        {
                            Title = "Securing Kubernetes: Best Practices for Production Deployments",
                            Description = "Essential security measures for hardening Kubernetes clusters in enterprise environments.",
                            Content = "Kubernetes has become the standard for container orchestration, but its complex nature introduces significant security challenges. This comprehensive guide covers essential security practices including role-based access control (RBAC) configuration, network policies, secrets management, container image security, and runtime protection. We also explore tools like Open Policy Agent (OPA), Falco, and Istio for enhancing Kubernetes security posture, along with automated security scanning in CI/CD pipelines.",
                            Url = "securing-kubernetes-production",
                            IsActive = true,
                            Image = "3.jpg",
                            PublishedOn = DateTime.Now.AddDays(-45),
                            Tags = context.Tags.Where(t => t.Text == "DevOps" || t.Text == "Cybersecurity" || t.Text == "Cloud Computing").ToList(),
                            UserId = 4,
                            Comments = new List<Comment> {
                                new Comment { Text = "We implemented the RBAC strategies mentioned here and it dramatically improved our security posture.", PublishedOn = DateTime.Now.AddDays(-40), UserId = 1 },
                                new Comment { Text = "Great article! I'd add that regular security audits are also essential for maintaining k8s security.", PublishedOn = DateTime.Now.AddDays(-38), UserId = 3 }
                            }
                        },
                        new Post
                        {
                            Title = "Design Systems: Scaling Consistency Across Products",
                            Description = "How to build, implement and maintain effective design systems for product teams.",
                            Content = "Design systems have revolutionized how product teams maintain consistency while scaling their applications. This article explores the anatomy of successful design systems including component libraries, design tokens, documentation, and governance models. We examine case studies from companies like Airbnb, IBM (Carbon), and Shopify (Polaris), and provide practical advice for implementing design systems in organizations of different sizes. Special attention is given to the collaboration between designers and developers throughout the design system lifecycle.",
                            Url = "design-systems-scaling-consistency",
                            IsActive = true,
                            Image = "design-systems.jpg",
                            PublishedOn = DateTime.Now.AddDays(-52),
                            Tags = context.Tags.Where(t => t.Text == "UI/UX Design" || t.Text == "Web Development").ToList(),
                            UserId = 2
                        },
                        new Post
                        {
                            Title = "Blockchain Beyond Cryptocurrency: Enterprise Applications",
                            Description = "Exploring practical blockchain implementations in supply chain, healthcare, and finance sectors.",
                            Content = "While blockchain technology is most commonly associated with cryptocurrencies, its potential applications extend far beyond financial transactions. This article examines how permissioned blockchain networks are transforming supply chain management with immutable audit trails, healthcare data sharing with privacy-preserving features, and financial services through smart contracts. We also address the challenges of blockchain adoption including performance limitations, regulatory considerations, and integration with legacy systems.",
                            Url = "blockchain-enterprise-applications",
                            IsActive = true,
                            Image = "3.jpg",
                            PublishedOn = DateTime.Now.AddDays(-67),
                            Tags = context.Tags.Where(t => t.Text == "Blockchain" || t.Text == "Cybersecurity").ToList(),
                            UserId = 3
                        },
                        new Post
                        {
                            Title = "Optimizing React Applications for Performance",
                            Description = "Advanced techniques for building high-performance React applications at scale.",
                            Content = "As React applications grow in complexity, performance optimization becomes increasingly important. This deep dive covers performance profiling using React DevTools, implementing code splitting with React.lazy and Suspense, virtualization for rendering large lists efficiently, and state management optimization strategies. We also explore memoization techniques with React.memo, useMemo and useCallback, along with rendering optimization patterns that prevent unnecessary re-renders in component hierarchies.",
                            Url = "optimizing-react-performance",
                            IsActive = false, // Intentionally set as inactive for testing
                            Image = "react-performance.jpg",
                            PublishedOn = DateTime.Now.AddDays(-75),
                            Tags = context.Tags.Where(t => t.Text == "Web Development").ToList(),
                            UserId = 2,
                            Comments = new List<Comment> {
                                new Comment { Text = "The section on virtualization helped me reduce rendering time by 80% for our data-heavy dashboard!", PublishedOn = DateTime.Now.AddDays(-70), UserId = 5 },
                                new Comment { Text = "Great write-up. I'd also recommend exploring server-side rendering for initial load performance.", PublishedOn = DateTime.Now.AddDays(-68), UserId = 1 }
                            }
                        }
                    );
                    context.SaveChanges();
                }
            }
        }
    }
}
