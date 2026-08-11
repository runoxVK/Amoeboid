/* ═══════════════════════════════════════════════════════
   site.js — progressive enhancement only.
   Every page works with this file blocked.
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Mobile navigation ───────────────────────────────
  var toggle = document.querySelector('.topbar__toggle');
  var spine  = document.getElementById('spine');

  if (toggle && spine) {
    var setOpen = function (open) {
      spine.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', function () {
      setOpen(!spine.classList.contains('is-open'));
    });
    document.addEventListener('click', function (ev) {
      if (!spine.classList.contains('is-open')) return;
      if (spine.contains(ev.target) || toggle.contains(ev.target)) return;
      setOpen(false);
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && spine.classList.contains('is-open')) setOpen(false);
    });
  }

  // ── Photo lightbox ──────────────────────────────────
  (function () {
    var grid = document.querySelector('[data-lightbox]');
    if (!grid) return;

    var shots = Array.prototype.slice.call(grid.querySelectorAll('.shot'));
    if (!shots.length) return;

    var box, img, counter, lastFocus, current = 0;

    function build() {
      box = document.createElement('div');
      box.className = 'lb';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', 'Photo viewer');
      box.innerHTML =
        '<div class="lb__bar">' +
          '<span class="lb__count"></span>' +
          '<button class="lb__close" type="button" aria-label="Close viewer">✕</button>' +
        '</div>' +
        '<div class="lb__stage">' +
          '<img class="lb__img" alt="">' +
          '<button class="lb__nav lb__nav--prev" type="button" aria-label="Previous photo">‹</button>' +
          '<button class="lb__nav lb__nav--next" type="button" aria-label="Next photo">›</button>' +
        '</div>' +
        '<p class="lb__hint">← → to move · Esc to close</p>';

      img     = box.querySelector('.lb__img');
      counter = box.querySelector('.lb__count');

      box.querySelector('.lb__close').addEventListener('click', close);
      box.querySelector('.lb__nav--prev').addEventListener('click', function () { show(current - 1); });
      box.querySelector('.lb__nav--next').addEventListener('click', function () { show(current + 1); });
      box.addEventListener('click', function (ev) { if (ev.target === box) close(); });
    }

    function show(i) {
      current = (i + shots.length) % shots.length;
      img.src = shots[current].getAttribute('data-full');
      counter.textContent = (current + 1) + ' / ' + shots.length;
      // warm the neighbours so arrow-keying feels instant
      [current + 1, current - 1].forEach(function (n) {
        var s = shots[(n + shots.length) % shots.length];
        if (s) { var pre = new Image(); pre.src = s.getAttribute('data-full'); }
      });
    }

    function open(i) {
      if (!box) build();
      lastFocus = document.activeElement;
      document.body.appendChild(box);
      document.documentElement.style.overflow = 'hidden';
      show(i);
      box.querySelector('.lb__close').focus();
      document.addEventListener('keydown', onKey);
    }

    function close() {
      if (!box || !box.parentNode) return;
      box.parentNode.removeChild(box);
      document.documentElement.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function onKey(ev) {
      if (ev.key === 'Escape')     { close();            ev.preventDefault(); }
      if (ev.key === 'ArrowLeft')  { show(current - 1);  ev.preventDefault(); }
      if (ev.key === 'ArrowRight') { show(current + 1);  ev.preventDefault(); }
    }

    shots.forEach(function (shot, i) {
      shot.addEventListener('click', function () { open(i); });
    });
  })();

  // ── Table of contents: highlight the section in view ─
  (function () {
    var toc = document.querySelector('.toc');
    if (!toc || !('IntersectionObserver' in window)) return;

    var links = {};
    Array.prototype.forEach.call(toc.querySelectorAll('a[href^="#"]'), function (a) {
      links[decodeURIComponent(a.getAttribute('href').slice(1))] = a;
    });

    var targets = Object.keys(links)
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);
    if (!targets.length) return;

    var active = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var a = links[en.target.id];
        if (!a || a === active) return;
        if (active) active.style.color = '';
        a.style.color = 'var(--mag)';
        active = a;
      });
    }, { rootMargin: '0px 0px -72% 0px', threshold: 0 });

    targets.forEach(function (t) { io.observe(t); });
  })();

})();
