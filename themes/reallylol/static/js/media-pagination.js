(function() {
  'use strict';

  const ITEMS_PER_PAGE = 24;

  /**
   * Get URL parameter value
   */
  function getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(name);
    return value ? parseInt(value, 10) : null;
  }

  /**
   * Update URL parameter without navigation
   */
  function updateUrlParam(name, value) {
    const url = new URL(window.location);
    if (value === 1 || value === null) {
      url.searchParams.delete(name);
    } else {
      url.searchParams.set(name, value);
    }
    window.history.pushState({ page: value }, '', url);
  }

  /**
   * Load lazy images for visible items
   */
  function loadLazyImages(container) {
    const lazyImages = container.querySelectorAll('img[data-lazy-image][data-src]');
    lazyImages.forEach(img => {
      // Only load images for visible items
      const item = img.closest('[data-item]');
      if (item && item.style.display !== 'none' && img.dataset.src && !img.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
    });
  }

  /**
   * Initialize pagination for a container
   */
  function initPagination(container) {
    const items = container.querySelectorAll('[data-item]');
    const totalItems = items.length;

    // Only paginate if more than ITEMS_PER_PAGE items
    if (totalItems <= ITEMS_PER_PAGE) {
      // Show all items if no pagination needed
      items.forEach(item => {
        item.style.display = '';
      });
      return;
    }

    // Find pagination controls
    // For tables, controls are sibling of table, not tbody
    // For lists, controls are sibling of list
    let controls = null;
    if (container.tagName === 'TBODY') {
      // For tables, go up to table element, then find next sibling
      const table = container.closest('table');
      if (table) {
        let sibling = table.nextElementSibling;
        while (sibling && !sibling.hasAttribute('data-pagination-controls')) {
          sibling = sibling.nextElementSibling;
        }
        controls = sibling;
      }
    } else {
      // For lists, controls are next sibling
      let sibling = container.nextElementSibling;
      while (sibling && !sibling.hasAttribute('data-pagination-controls')) {
        sibling = sibling.nextElementSibling;
      }
      controls = sibling;
    }

    if (!controls) {
      return;
    }

    const prevWrapper = controls.querySelector('.prev-wrapper');
    const nextWrapper = controls.querySelector('.next-wrapper');
    const infoSpan = controls.querySelector('[data-pagination-info]');

    if (!prevWrapper || !nextWrapper || !infoSpan) {
      return;
    }

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // Get current page from URL or default to 1
    let currentPage = getUrlParam('page') || 1;
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    /**
     * Show items for a specific page
     */
    function showPage(page) {
      const startIndex = (page - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;

      items.forEach((item, index) => {
        if (index >= startIndex && index < endIndex) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });

      // Load images for visible items (books)
      loadLazyImages(container);

      // Update controls to match server-side pagination markup (links or spans)
      // Prev control
      if (page === 1) {
        prevWrapper.innerHTML = '<span data-pagination-prev>Back</span>';
      } else {
        prevWrapper.innerHTML = '<a href="#" data-pagination-prev>Back</a>';
        const prevLink = prevWrapper.querySelector('[data-pagination-prev]');
        prevLink.addEventListener('click', function(e) { e.preventDefault(); goToPrev(); });
      }

      // Next control
      if (page === totalPages) {
        nextWrapper.innerHTML = '<span data-pagination-next>Next</span>';
      } else {
        nextWrapper.innerHTML = '<a href="#" data-pagination-next>Next</a>';
        const nextLink = nextWrapper.querySelector('[data-pagination-next]');
        nextLink.addEventListener('click', function(e) { e.preventDefault(); goToNext(); });
      }

      // Update info text (e.g., "1 of 5")
      infoSpan.textContent = `${page} of ${totalPages}`;

      // Update URL
      updateUrlParam('page', page);

      currentPage = page;
    }

    /**
     * Go to previous page
     * Always jump instantly to top on navigation
     */
    function goToPrev() {
      if (currentPage > 1) {
        showPage(currentPage - 1);
        window.scrollTo(0, 0);
      }
    }

    /**
     * Go to next page
     * Always jump instantly to top on navigation
     */
    function goToNext() {
      if (currentPage < totalPages) {
        showPage(currentPage + 1);
        window.scrollTo(0, 0);
      }
    }

    // Initial listeners added in showPage when links are enabled

    // Show pagination controls
    controls.style.display = '';

    // Hide all items first to prevent flash
    items.forEach(item => {
      item.style.display = 'none';
    });

    // Show the requested page (or page 1 if none specified)
    const requestedPage = getUrlParam('page') || 1;
    showPage(requestedPage);
  }

  /**
   * Initialize all pagination on page load
   */
  function init() {
    const paginatableContainers = document.querySelectorAll('[data-paginate="true"]');
    
    paginatableContainers.forEach(container => {
      // For tables, use tbody as container
      const containerElement = container.querySelector('[data-pagination-container]') || container;
      initPagination(containerElement);
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', function(event) {
      const page = getUrlParam('page') || 1;
      const paginatableContainers = document.querySelectorAll('[data-paginate="true"]');
      
      paginatableContainers.forEach(container => {
        const containerElement = container.querySelector('[data-pagination-container]') || container;
        const items = containerElement.querySelectorAll('[data-item]');
        const totalItems = items.length;
        
        if (totalItems > ITEMS_PER_PAGE) {
          const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
          const targetPage = Math.min(Math.max(1, page), totalPages);
          
          const startIndex = (targetPage - 1) * ITEMS_PER_PAGE;
          const endIndex = startIndex + ITEMS_PER_PAGE;

          items.forEach((item, index) => {
            if (index >= startIndex && index < endIndex) {
              item.style.display = '';
            } else {
              item.style.display = 'none';
            }
          });

          loadLazyImages(containerElement);

          // Update controls
          // Controls are always sibling of the main container (table or ul)
          let controls = container.nextElementSibling;
          while (controls && !controls.hasAttribute('data-pagination-controls')) {
            controls = controls.nextElementSibling;
          }
          
          if (controls) {
            const prevWrapper = controls.querySelector('.prev-wrapper');
            const nextWrapper = controls.querySelector('.next-wrapper');
            const infoSpan = controls.querySelector('[data-pagination-info]');

            if (prevWrapper && nextWrapper && infoSpan) {
              if (targetPage === 1) {
                prevWrapper.innerHTML = '<span data-pagination-prev>Back</span>';
              } else {
                prevWrapper.innerHTML = '<a href="#" data-pagination-prev>Back</a>';
                const prevLink = prevWrapper.querySelector('[data-pagination-prev]');
                prevLink.addEventListener('click', function(e) {
                  e.preventDefault();
                  window.scrollTo(0, 0);
                  const urlPage = Math.max(1, targetPage - 1);
                  updateUrlParam('page', urlPage);
                });
              }

              if (targetPage === totalPages) {
                nextWrapper.innerHTML = '<span data-pagination-next>Next</span>';
              } else {
                nextWrapper.innerHTML = '<a href="#" data-pagination-next>Next</a>';
                const nextLink = nextWrapper.querySelector('[data-pagination-next]');
                nextLink.addEventListener('click', function(e) {
                  e.preventDefault();
                  const urlPage = Math.min(totalPages, targetPage + 1);
                  updateUrlParam('page', urlPage);
                });
              }

              infoSpan.textContent = `${targetPage} of ${totalPages}`;
            }
          }
        }
      });
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
