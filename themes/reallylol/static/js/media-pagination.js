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

    // Find pagination controls (should be next sibling)
    let controls = container.nextElementSibling;
    while (controls && !controls.hasAttribute('data-pagination-controls')) {
      controls = controls.nextElementSibling;
    }

    if (!controls) {
      return;
    }

    const prevButton = controls.querySelector('[data-pagination-prev]');
    const nextButton = controls.querySelector('[data-pagination-next]');
    const infoSpan = controls.querySelector('[data-pagination-info]');

    if (!prevButton || !nextButton || !infoSpan) {
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

      // Update button states
      prevButton.disabled = page === 1;
      nextButton.disabled = page === totalPages;

      // Update info text
      infoSpan.textContent = `Page ${page} of ${totalPages}`;

      // Update URL
      updateUrlParam('page', page);

      currentPage = page;
    }

    /**
     * Go to previous page
     */
    function goToPrev() {
      if (currentPage > 1) {
        showPage(currentPage - 1);
      }
    }

    /**
     * Go to next page
     */
    function goToNext() {
      if (currentPage < totalPages) {
        showPage(currentPage + 1);
      }
    }

    // Set up event listeners
    prevButton.addEventListener('click', goToPrev);
    nextButton.addEventListener('click', goToNext);

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
          let controls = container.nextElementSibling;
          while (controls && !controls.hasAttribute('data-pagination-controls')) {
            controls = controls.nextElementSibling;
          }
          
          if (controls) {
            const prevButton = controls.querySelector('[data-pagination-prev]');
            const nextButton = controls.querySelector('[data-pagination-next]');
            const infoSpan = controls.querySelector('[data-pagination-info]');
            
            if (prevButton && nextButton && infoSpan) {
              prevButton.disabled = targetPage === 1;
              nextButton.disabled = targetPage === totalPages;
              infoSpan.textContent = `Page ${targetPage} of ${totalPages}`;
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
