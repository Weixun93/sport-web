'use strict';

class SwipeNavigator {
  constructor() {
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.isDragging = false;
    this.isScrolling = false;
    this.currentView = null;
    this.minSwipeDistance = 50;
    
    this.pageConfig = [
      { id: 'weather-page', name: 'weather' },
      { id: 'checkin-page', name: 'checkin' },
      { id: 'community-page', name: 'community' },
      { id: 'records-page', name: 'records' }
    ];
    
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    
    this.init();
  }

  init() {
    console.log('SwipeNavigator initialized');
    this.pageConfig.forEach(pageItem => {
      const pageElement = document.getElementById(pageItem.id);
      if (!pageElement) return;
      
      pageElement.addEventListener('touchstart', this.handleTouchStart, { passive: true });
      pageElement.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      pageElement.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    });
  }

  getCurrentPageIndex() {
    for (let i = 0; i < this.pageConfig.length; i++) {
      const pageElement = document.getElementById(this.pageConfig[i].id);
      if (pageElement && pageElement.classList.contains('active')) {
        return i;
      }
    }
    return 0;
  }

  switchToPage(index) {
    if (index < 0 || index >= this.pageConfig.length) return;
    
    const pageConfig = this.pageConfig[index];
    const button = document.querySelector(`[data-page="${pageConfig.name}"]`);
    if (button) {
      console.log('Clicking button to switch to:', pageConfig.name);
      button.click();
    }
  }

  handleTouchStart(event) {
    if (event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.currentX = this.startX;
    this.currentY = this.startY;
    this.isDragging = true;
    this.isScrolling = false;
    this.currentView = event.currentTarget;
  }

  handleTouchMove(event) {
    if (!this.isDragging) return;
    
    const touch = event.touches[0];
    this.currentX = touch.clientX;
    this.currentY = touch.clientY;
    
    const deltaX = this.currentX - this.startX;
    const deltaY = this.currentY - this.startY;
    
    if (!this.isScrolling && Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
      this.isScrolling = true;
      return;
    }
    
    if (!this.isScrolling && Math.abs(deltaX) > 5) {
      event.preventDefault();
      
      const currentIndex = this.getCurrentPageIndex();
      if ((currentIndex === 0 && deltaX > 0) || (currentIndex === this.pageConfig.length - 1 && deltaX < 0)) {
        return;
      }
      
      this.currentView.style.transform = 'translateX(' + deltaX + 'px)';
    }
  }

  handleTouchEnd() {
    if (!this.isDragging) return;
    
    const deltaX = this.currentX - this.startX;
    
    if (!this.isScrolling && Math.abs(deltaX) >= this.minSwipeDistance) {
      const currentIndex = this.getCurrentPageIndex();
      const direction = deltaX > 0 ? -1 : 1;
      const targetIndex = currentIndex + direction;
      
      console.log('Swiping from index', currentIndex, 'to', targetIndex);
      this.switchToPage(targetIndex);
    }
    
    this.currentView.style.transform = '';
    
    this.isDragging = false;
    this.isScrolling = false;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.swipeNavigator = new SwipeNavigator();
  });
} else {
  window.swipeNavigator = new SwipeNavigator();
}
