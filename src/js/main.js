/* AutoAccessories — work slideshow (Home) and quote form submit (Services) */

// JS is running: switch the slideshow from native scroll to buttons/dots.
document.documentElement.classList.remove('no-js');

/* ---------- Quote form: send to Formspree, then open thanks.html ---------- */
(function () {
  'use strict';

  var form = document.querySelector('[data-quote-form]');
  if (!form || !window.fetch) return;

  var button = form.querySelector('[type="submit"]');
  var sending = false;

  // Runs only after native validation has passed.
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    sending = true;
    button.disabled = true;

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    }).then(function (res) {
      if (!res.ok) throw new Error('Form service returned ' + res.status);
      window.location.href = 'thanks.html';
    }).catch(function () {
      // Fall back to a normal post so the enquiry is never lost.
      form.submit();
    });
  });
})();

/* ---------- Work slideshow ---------- */
(function () {
  'use strict';

  var root = document.querySelector('[data-carousel]');
  if (!root) return;

  var viewport = root.querySelector('.work-viewport');
  var track = root.querySelector('.work-track');
  var counter = root.querySelector('.work-counter');
  var prevBtn = root.querySelector('[data-prev]');
  var nextBtn = root.querySelector('[data-next]');
  var dotsWrap = root.querySelector('.work-dots');
  var cards = Array.prototype.slice.call(track.children);
  var n = cards.length;
  if (!n) return;

  var GAP = 24;
  var i = 0;
  var step = 0;

  // One dot per card, built from the DOM so adding/removing cards just works.
  var dots = cards.map(function (_, k) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Go to job ' + (k + 1));
    b.appendChild(document.createElement('span'));
    b.addEventListener('click', function () { go(k); });
    dotsWrap.appendChild(b);
    return b;
  });

  function measure() {
    step = cards[0].offsetWidth + GAP;
  }

  function render() {
    track.style.transform = 'translateX(' + (-i * step) + 'px)';
    counter.textContent = (i + 1) + ' / ' + n;

    dots.forEach(function (d, k) {
      if (k === i) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });

    // Cards fully outside the viewport are taken out of focus/AT order.
    var width = viewport.clientWidth;
    cards.forEach(function (card, k) {
      var left = (k - i) * step;
      var right = left + step - GAP;
      card.toggleAttribute('inert', right <= 0 || left >= width);
    });
  }

  function go(k) {
    i = (k + n) % n; // wraps last → first and first → last
    render();
  }

  prevBtn.addEventListener('click', function () { go(i - 1); });
  nextBtn.addEventListener('click', function () { go(i + 1); });

  // Arrow keys only while focus is inside the carousel section.
  root.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
  });

  // Touch swipe: a horizontal drag over 50px moves one card.
  var startX = 0;
  var startY = 0;
  viewport.addEventListener('touchstart', function (e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  viewport.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0];
    var dx = t.clientX - startX;
    var dy = t.clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? i + 1 : i - 1);
    }
  }, { passive: true });

  // Re-measure on resize without animating the jump.
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var transition = track.style.transition;
      track.style.transition = 'none';
      measure();
      render();
      void track.offsetWidth;
      track.style.transition = transition;
    }, 100);
  });

  measure();
  render();
})();
