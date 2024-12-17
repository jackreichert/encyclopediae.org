// Replace the institutions array with this function
function getInstitutions() {
  const institutionsData = document.querySelectorAll('#institutions-data li');
  return Array.from(institutionsData).map((li) => ({
    name: li.querySelector('h3').textContent,
    strength: li.querySelector('p').textContent,
  }));
}

// Shuffle function
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Helper functions for collision detection
function doRectsOverlap(rect1, rect2) {
  return !(
    rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
  );
}

function getElementBounds(el) {
  const rect = el.getBoundingClientRect();
  const padding = 20;
  return {
    left: rect.left - padding,
    right: rect.right + padding,
    top: rect.top - padding,
    bottom: rect.bottom + padding,
  };
}

function isPositionValid(el, left, top) {
  const container = document.querySelector('.institutions');
  const mainTextElement = document.querySelector('.main-text');
  const testEl = el.cloneNode(true);
  testEl.style.left = `${left}%`;
  testEl.style.top = `${top}%`;
  testEl.style.visibility = 'hidden';
  container.appendChild(testEl);

  const testBounds = getElementBounds(testEl);
  const existingElements = container.querySelectorAll('.institution:not([style*="visibility: hidden"])');
  let overlaps = false;

  const mainTextBounds = getElementBounds(mainTextElement);
  if (doRectsOverlap(testBounds, mainTextBounds)) {
    overlaps = true;
  }

  existingElements.forEach((existing) => {
    const existingBounds = getElementBounds(existing);
    if (doRectsOverlap(testBounds, existingBounds)) {
      overlaps = true;
    }
  });

  container.removeChild(testEl);
  return !overlaps;
}

// Add this function near the top with other helper functions
function randomTooltipAnimation() {
  const institutions = document.querySelectorAll('.institution');
  
  setInterval(() => {    
    // Clear any existing random tooltips
    document.querySelectorAll('.tooltip.random-active').forEach(tooltip => {
      tooltip.classList.remove('random-active');
    });
    
    // Select random institutions
    const shuffled = Array.from(institutions).sort(() => 0.5 - Math.random());
    shuffled.slice(0, 1).forEach(institution => {
      const tooltip = institution.querySelector('.tooltip');
      tooltip.classList.add('random-active');
    });
  }, 2000); // Trigger every 2 seconds
}

// Animation sequence
function startAnimation() {
  const institutionEls = document.querySelectorAll('.institution');
  const mainText = document.querySelector('.main-text');
  const answerText = document.querySelector('.answer-text');
  const learnMoreButton = document.querySelector('.learn-more-button');
  const delay = 50;

  institutionEls.forEach((el, index) => {
    setTimeout(() => {
      el.classList.add('visible');

      // If this is the last institution
      if (index === institutionEls.length - 1) {
        setTimeout(() => {
          mainText.classList.add('shifted');

          setTimeout(() => {
            answerText.classList.add('visible');

            // Show Learn More button after a longer delay
            setTimeout(() => {
              learnMoreButton.classList.add('visible');
              // Start random tooltip animations after everything is visible
              randomTooltipAnimation();
            }, 2000);
          }, 800);
        }, 800);
      }
    }, index * delay);
  });

  // Remove event listeners after animation starts
  document.removeEventListener('click', startAnimation);
  document.removeEventListener('wheel', startAnimation);
  document.removeEventListener('touchstart', startAnimation);
}

// Initialize animation
function initAnimation() {
  const container = document.querySelector('.institutions');
  if (!container) {
    console.error('Could not find .institutions container');
    return;
  }

  const mainText = document.querySelector('.main-text');
  if (!mainText) {
    console.error('Could not find .main-text element');
    return;
  }

  const shuffledInstitutions = shuffleArray([...getInstitutions()]);

  // Clear any existing content
  container.innerHTML = '';

  // Create and position institutions
  shuffledInstitutions.forEach((inst, index) => {
    const el = document.createElement('div');
    el.className = 'institution';
    el.innerHTML = `
            ${inst.name}
            <div class="tooltip">${inst.strength}</div>
        `;

    // Random font size between 20 and 30 pixels
    const randomSize = Math.floor(Math.random() * 11) + 20; // Random number between 20 and 30
    el.style.fontSize = `${randomSize}px`;

    let validPosition = false;
    let attempts = 0;
    const maxAttempts = 50;

    // Special position for first institution
    if (index === 0) {
      el.style.left = '15%';
      el.style.top = '15%';
      container.appendChild(el);
      return;
    }

    while (!validPosition && attempts < maxAttempts) {
      // Calculate position in a circular pattern
      const totalCircles = window.innerWidth < 768 ? 2 : 3; // Fewer circles on mobile
      const itemsPerCircle = Math.ceil((shuffledInstitutions.length - 1) / totalCircles);
      const currentCircle = Math.floor((index - 1) / itemsPerCircle);
      const positionInCircle = (index - 1) % itemsPerCircle;

      // Adjust baseDistance for mobile
      const baseDistance =
                window.innerWidth < 768
                  ? 20 + currentCircle * 12 // Smaller spacing on mobile
                  : 25 + currentCircle * 15; // Original spacing for desktop
      const angleStep = (2 * Math.PI) / itemsPerCircle;
      const angle = positionInCircle * angleStep + currentCircle * (Math.PI / itemsPerCircle);

      const left = 50 + Math.cos(angle) * baseDistance;
      const top = 50 + Math.sin(angle) * baseDistance;

      if (left >= 5 && left <= 95 && top >= 5 && top <= 95) {
        if (isPositionValid(el, left, top)) {
          el.style.left = `${left}%`;
          el.style.top = `${top}%`;
          validPosition = true;
        }
      }
      attempts++;
    }

    if (validPosition) {
      container.appendChild(el);
    }
  });

  // Add event listeners for animation start
  document.addEventListener('click', startAnimation);
  document.addEventListener('wheel', startAnimation);
  document.addEventListener('touchstart', startAnimation);
}

// Make sure DOM is fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
  // Double check that required elements exist
  const container = document.querySelector('.institutions');
  const institutionsData = document.querySelector('#institutions-data');

  if (!container || !institutionsData) {
    console.error('Required elements are missing:', {
      container: !!container,
      institutionsData: !!institutionsData,
    });
    return;
  }

  initAnimation();
});
