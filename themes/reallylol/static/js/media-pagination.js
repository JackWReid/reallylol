(function () {
  'use strict';

  var PER_PAGE = 24;

  function paginate(container) {
    var items = container.querySelectorAll('[data-item]');
    if (items.length <= PER_PAGE) return;

    var totalPages = Math.ceil(items.length / PER_PAGE);
    var controls = container.tagName === 'TBODY'
      ? container.closest('table').nextElementSibling
      : container.nextElementSibling;

    while (controls && !controls.hasAttribute('data-pagination-controls')) {
      controls = controls.nextElementSibling;
    }
    if (!controls) return;

    var prev = controls.querySelector('.prev-wrapper');
    var next = controls.querySelector('.next-wrapper');
    var info = controls.querySelector('[data-pagination-info]');
    controls.style.display = '';

    function show(page) {
      page = Math.max(1, Math.min(page, totalPages));
      var start = (page - 1) * PER_PAGE;

      items.forEach(function (item, i) {
        item.style.display = (i >= start && i < start + PER_PAGE) ? '' : 'none';
      });

      prev.innerHTML = page > 1
        ? '<a href="#" data-pagination-prev>Back</a>'
        : '<span>Back</span>';
      next.innerHTML = page < totalPages
        ? '<a href="#" data-pagination-next>Next</a>'
        : '<span>Next</span>';
      info.textContent = page + ' of ' + totalPages;

      var indicator = document.querySelector('[data-pagination-indicator]');
      if (indicator) {
        indicator.textContent = page > 1 ? 'Page ' + page + ' of ' + totalPages : '';
        indicator.style.display = page > 1 ? 'block' : 'none';
      }

      var url = new URL(window.location);
      if (page === 1) url.searchParams.delete('page');
      else url.searchParams.set('page', page);
      history.pushState({ page: page }, '', url);
      window.scrollTo(0, 0);
    }

    controls.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (!link) return;
      e.preventDefault();
      var current = parseInt(new URLSearchParams(window.location.search).get('page')) || 1;
      show(link.hasAttribute('data-pagination-prev') ? current - 1 : current + 1);
    });

    window.addEventListener('popstate', function () {
      var page = parseInt(new URLSearchParams(window.location.search).get('page')) || 1;
      show(page);
    });

    items.forEach(function (item) { item.style.display = 'none'; });
    show(parseInt(new URLSearchParams(window.location.search).get('page')) || 1);
  }

  function init() {
    document.querySelectorAll('[data-paginate="true"]').forEach(function (el) {
      paginate(el.querySelector('[data-pagination-container]') || el);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
