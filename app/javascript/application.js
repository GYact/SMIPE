// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
import "controllers"

document.addEventListener('turbo:load', () => {
  const hamburgerButton = document.getElementById('hamburgerMenuButton');
  const mobileNavMenu = document.getElementById('mobileNavMenu');

  if (hamburgerButton && mobileNavMenu) {
    hamburgerButton.addEventListener('click', () => {
      const isExpanded = hamburgerButton.getAttribute('aria-expanded') === 'true' || false;
      hamburgerButton.setAttribute('aria-expanded', !isExpanded);
      mobileNavMenu.classList.toggle('is-open');
      mobileNavMenu.setAttribute('aria-hidden', isExpanded); // If it was expanded, it's now hidden, and vice-versa

      // Optional: Add a class to the body to prevent scrolling when the menu is open
      if (mobileNavMenu.classList.contains('is-open')) {
        document.body.classList.add('mobile-nav-active');
      } else {
        document.body.classList.remove('mobile-nav-active');
      }
    });
  }
});
