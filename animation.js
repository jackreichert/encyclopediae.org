// Institution data
const institutions = [
  { name: 'Encyclopedia of Oxford', strength: 'Pioneering research in humanities and social sciences since 1096' },
  { name: 'Encyclopedia of Cambridge', strength: 'Leading mathematics and physics discoveries for centuries' },
  { name: 'Encyclopedia of Harvard', strength: 'Shaping global leadership across disciplines' },
  { name: 'Encyclopedia of Stanford', strength: 'Driving Silicon Valley innovation and entrepreneurship' },
  { name: 'Encyclopedia of MIT', strength: 'Advancing technology and engineering frontiers' },
  { name: 'Encyclopedia of Yale', strength: 'Excellence in law, medicine, and arts' },
  { name: 'Encyclopedia of Princeton', strength: 'Theoretical physics and mathematical innovation' },
  { name: 'Encyclopedia of Berkeley', strength: 'Revolutionary discoveries in chemistry and physics' },
  { name: 'Encyclopedia of LSE', strength: 'Defining modern economics and social policy' },
  { name: 'Encyclopedia of Chicago', strength: 'Pioneering economic theory and policy' },
  { name: 'Encyclopedia of Columbia', strength: 'Leading journalism and international relations' },
  { name: 'Encyclopedia of Sorbonne', strength: 'Centuries of philosophical thought leadership' },
  { name: 'Encyclopedia of ETH Zürich', strength: 'Home to 21 Nobel laureates in sciences' },
  { name: 'Encyclopedia of Tokyo University', strength: 'Advancing Asian technological innovation' },
  { name: 'Encyclopedia of Heidelberg', strength: 'Medieval studies and modern medicine' },
  { name: 'Encyclopedia of Bologna', strength: 'World\'s oldest university, founded in 1088' },
  { name: 'Encyclopedia of Jagiellonian', strength: 'Where Copernicus studied in the 1490s' },
  { name: 'Encyclopedia of Trinity College', strength: 'Literary giants and mathematical breakthroughs' },
  { name: 'Encyclopedia of McGill', strength: 'Leading neuroscience and AI research' },
  { name: 'Encyclopedia of Peking', strength: 'Bridging Eastern and Western academic traditions' },
  { name: 'Encyclopedia of Technion', strength: 'Israel\'s pioneering institute of technology and innovation' },
  { name: 'Encyclopedia of Tsinghua', strength: 'China\'s leading science and engineering institution' },
  { name: 'Encyclopedia of UCL', strength: 'Pioneering research in medicine and astronomy' },
  { name: 'Encyclopedia of Edinburgh', strength: 'Scottish Enlightenment to modern AI' },
  { name: 'Encyclopedia of Toronto', strength: 'Where insulin was discovered in 1921' },
  { name: 'Encyclopedia of Melbourne', strength: 'Leading research in the Southern Hemisphere' },
  { name: 'Encyclopedia of TU Munich', strength: 'German engineering excellence' },
  { name: 'Encyclopedia of Caltech', strength: 'Space exploration and quantum computing' },
  { name: 'Encyclopedia of NUS', strength: 'Asia\'s hub for interdisciplinary research' },
  { name: 'Encyclopedia of Leiden', strength: 'Europe\'s oldest university outside Italy' },
  { name: 'Encyclopedia of Uppsala', strength: 'Nobel prizes and medieval manuscripts' },
  { name: 'Encyclopedia of KU Leuven', strength: 'Belgium\'s ancient center of learning' },
  { name: 'Encyclopedia of TU Delft', strength: 'Dutch engineering and technology innovation' },
  { name: 'Encyclopedia of Humboldt', strength: 'Berlin\'s intellectual powerhouse' },
  { name: 'Encyclopedia of Copenhagen', strength: 'Quantum mechanics and philosophy' },
  { name: 'Encyclopedia of Padua', strength: 'Where Galileo taught mathematics' },
  { name: 'Encyclopedia of Vienna', strength: 'Psychology and quantum theory' },
  { name: 'Encyclopedia of Kyoto', strength: 'Japan\'s cultural and scientific heritage' },
  { name: 'Encyclopedia of Seoul National', strength: 'Korea\'s technological advancement' },
  { name: 'Encyclopedia of ANU', strength: 'Australia\'s national research university' },
  { name: 'Encyclopedia of Utrecht', strength: 'Netherlands\' largest public university' },
  { name: 'Encyclopedia of Warwick', strength: 'Mathematics and business innovation' },
  { name: 'Encyclopedia of St Andrews', strength: 'Scotland\'s first university' },
  { name: 'Encyclopedia of Amsterdam', strength: 'Dutch Golden Age to modern research' },
  { name: 'Encyclopedia of LMU Munich', strength: 'German research excellence' },
  { name: 'Encyclopedia of Göttingen', strength: 'Mathematics and natural sciences' },
  { name: 'Encyclopedia of Helsinki', strength: 'Nordic research leadership' },
  { name: 'Encyclopedia of Aarhus', strength: 'Danish innovation hub' },
  { name: 'Encyclopedia of Zurich', strength: 'Swiss precision in research' },
  { name: 'Encyclopedia of Stockholm', strength: 'Nobel prize heritage' },
  { name: 'Encyclopedia of Lund', strength: 'Swedish academic excellence' }
];

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
  return !(rect1.right < rect2.left || 
            rect1.left > rect2.right || 
            rect1.bottom < rect2.top || 
            rect1.top > rect2.bottom);
}

function getElementBounds(el) {
  const rect = el.getBoundingClientRect();
  const padding = 20;
  return {
    left: rect.left - padding,
    right: rect.right + padding,
    top: rect.top - padding,
    bottom: rect.bottom + padding
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

  existingElements.forEach(existing => {
    const existingBounds = getElementBounds(existing);
    if (doRectsOverlap(testBounds, existingBounds)) {
      overlaps = true;
    }
  });

  container.removeChild(testEl);
  return !overlaps;
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
  const mainText = document.querySelector('.main-text');
  const shuffledInstitutions = shuffleArray([...institutions]);

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
      const totalCircles = 3;
      const itemsPerCircle = Math.ceil((shuffledInstitutions.length - 1) / totalCircles);
      const currentCircle = Math.floor((index - 1) / itemsPerCircle);
      const positionInCircle = (index - 1) % itemsPerCircle;
            
      const baseDistance = 25 + (currentCircle * 15);
      const angleStep = (2 * Math.PI) / itemsPerCircle;
      const angle = positionInCircle * angleStep + (currentCircle * (Math.PI / itemsPerCircle));
            
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

// Start when DOM is loaded
document.addEventListener('DOMContentLoaded', initAnimation); 