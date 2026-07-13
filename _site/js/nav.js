document.addEventListener('DOMContentLoaded', () => {
  const burger = document.querySelector('.nav-burger');
  const navLinks = document.querySelector('header .nav-links');

  if (!burger || !navLinks) return;

  function setOpen(isOpen) {
    navLinks.classList.toggle('open', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
    burger.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  }

  function closeMenu() {
    if (!navLinks.classList.contains('open')) return;
    setOpen(false);
  }

  burger.addEventListener('click', () => {
    setOpen(!navLinks.classList.contains('open'));
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) {
      closeMenu();
      burger.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!navLinks.classList.contains('open')) return;
    if (navLinks.contains(e.target) || burger.contains(e.target)) return;
    closeMenu();
  });

  // Collapse the mobile menu when returning to a wider layout.
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeMenu();
    }
  });
});
