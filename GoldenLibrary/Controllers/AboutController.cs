using Microsoft.AspNetCore.Mvc;

namespace GoldenLibrary.Controllers
{
    public class AboutController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}