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
      mobileNavMenu.setAttribute('aria-hidden', isExpanded);
      if (mobileNavMenu.classList.contains('is-open')) {
        document.body.classList.add('mobile-nav-active');
      } else {
        document.body.classList.remove('mobile-nav-active');
      }
    });
  }
});
