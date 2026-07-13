const COLLISION_PADDING = 20;
const PLACE_MAX_ATTEMPTS = 50;
const TOOLTIP_INTERVAL_MS = 2000;
const INSTITUTION_STAGGER_MS = 50;
const SHIFT_DELAY_MS = 800;
const ANSWER_DELAY_MS = 800;
const BUTTON_DELAY_MS = 2000;

function getInstitutions() {
  const items = document.querySelectorAll('#institutions-data li');
  return Array.from(items)
    .map((li) => {
      const name = li.querySelector('h3')?.textContent?.trim();
      const strength = li.querySelector('p')?.textContent?.trim();
      if (!name || !strength) return null;
      return { name, strength };
    })
    .filter(Boolean);
}

function shuffleArray(array) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

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
  return {
    left: rect.left - COLLISION_PADDING,
    right: rect.right + COLLISION_PADDING,
    top: rect.top - COLLISION_PADDING,
    bottom: rect.bottom + COLLISION_PADDING,
  };
}

function isPositionValid(el, left, top, container, mainTextElement, placedElements) {
  const testEl = el.cloneNode(true);
  testEl.style.left = `${left}%`;
  testEl.style.top = `${top}%`;
  testEl.style.visibility = 'hidden';
  testEl.setAttribute('data-placement-probe', 'true');
  container.appendChild(testEl);

  const testBounds = getElementBounds(testEl);
  let overlaps = false;

  if (mainTextElement && doRectsOverlap(testBounds, getElementBounds(mainTextElement))) {
    overlaps = true;
  }

  if (!overlaps) {
    for (const existing of placedElements) {
      if (doRectsOverlap(testBounds, getElementBounds(existing))) {
        overlaps = true;
        break;
      }
    }
  }

  container.removeChild(testEl);
  return !overlaps;
}

function createInstitutionElement(inst) {
  const el = document.createElement('div');
  el.className = 'institution';

  el.append(document.createTextNode(inst.name));

  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = inst.strength;
  el.appendChild(tooltip);

  const randomSize = Math.floor(Math.random() * 11) + 20;
  el.style.fontSize = `${randomSize}px`;

  return el;
}

function computeCirclePosition(index, totalCount) {
  const totalCircles = window.innerWidth < 768 ? 2 : 3;
  const itemsPerCircle = Math.ceil((totalCount - 1) / totalCircles);
  const currentCircle = Math.floor((index - 1) / itemsPerCircle);
  const positionInCircle = (index - 1) % itemsPerCircle;

  const baseDistance = window.innerWidth < 768 ? 20 + currentCircle * 12 : 25 + currentCircle * 15;
  const angleStep = (2 * Math.PI) / itemsPerCircle;
  const angle = positionInCircle * angleStep + currentCircle * (Math.PI / itemsPerCircle);

  return {
    left: 50 + Math.cos(angle) * baseDistance,
    top: 50 + Math.sin(angle) * baseDistance,
  };
}

/**
 * Tries to place an institution without overlapping the headline or peers.
 * Returns false (and does not append) when no free spot is found — that is
 * intentional: the SEO list is long; the animation only shows what fits.
 */
function placeInstitution(el, index, totalCount, container, mainText, placedElements) {
  if (index === 0) {
    el.style.left = '15%';
    el.style.top = '15%';
    container.appendChild(el);
    placedElements.push(el);
    return true;
  }

  let attempts = 0;

  while (attempts < PLACE_MAX_ATTEMPTS) {
    const position = computeCirclePosition(index, totalCount);
    // Jitter retries so collision checks are not stuck on one coordinate.
    const jitter = attempts === 0 ? 0 : (Math.random() - 0.5) * 10;
    const left = position.left + jitter;
    const top = position.top + jitter;

    if (left >= 5 && left <= 95 && top >= 5 && top <= 95) {
      if (isPositionValid(el, left, top, container, mainText, placedElements)) {
        el.style.left = `${left}%`;
        el.style.top = `${top}%`;
        container.appendChild(el);
        placedElements.push(el);
        return true;
      }
    }
    attempts++;
  }

  return false;
}

function randomTooltipAnimation() {
  const institutions = document.querySelectorAll('.institution');
  if (institutions.length === 0) return;

  setInterval(() => {
    document.querySelectorAll('.tooltip.random-active').forEach((tooltip) => {
      tooltip.classList.remove('random-active');
    });

    const shuffled = shuffleArray(Array.from(institutions));
    const pick = shuffled[0];
    const tooltip = pick?.querySelector('.tooltip');
    if (tooltip) {
      tooltip.classList.add('random-active');
    }
  }, TOOLTIP_INTERVAL_MS);
}

function startAnimation() {
  const institutionEls = document.querySelectorAll('.institution');
  const mainText = document.querySelector('.main-text');
  const answerText = document.querySelector('.answer-text');
  const learnMoreButton = document.querySelector('.learn-more-button');

  document.removeEventListener('click', startAnimation);
  document.removeEventListener('wheel', startAnimation);
  document.removeEventListener('touchstart', startAnimation);

  institutionEls.forEach((el, index) => {
    setTimeout(() => {
      el.classList.add('visible');
    }, index * INSTITUTION_STAGGER_MS);
  });

  // Match original cadence: clock starts after the last institution appears.
  const afterInstitutions = Math.max(0, (institutionEls.length - 1) * INSTITUTION_STAGGER_MS);

  setTimeout(() => {
    mainText?.classList.add('shifted');
  }, afterInstitutions + SHIFT_DELAY_MS);

  setTimeout(
    () => {
      answerText?.classList.add('visible');
    },
    afterInstitutions + SHIFT_DELAY_MS + ANSWER_DELAY_MS
  );

  setTimeout(
    () => {
      learnMoreButton?.classList.add('visible');
      randomTooltipAnimation();
    },
    afterInstitutions + SHIFT_DELAY_MS + ANSWER_DELAY_MS + BUTTON_DELAY_MS
  );
}

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

  const institutions = getInstitutions();
  if (institutions.length === 0) {
    console.error('No institutions found in #institutions-data');
    return;
  }

  const shuffledInstitutions = shuffleArray(institutions);
  container.innerHTML = '';

  const placedElements = [];
  shuffledInstitutions.forEach((inst, index) => {
    const el = createInstitutionElement(inst);
    placeInstitution(el, index, shuffledInstitutions.length, container, mainText, placedElements);
  });

  document.addEventListener('click', startAnimation);
  document.addEventListener('wheel', startAnimation);
  document.addEventListener('touchstart', startAnimation);
}

document.addEventListener('DOMContentLoaded', () => {
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
