import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["albumArt", "albumImage"]

  connect() {
    console.log('Player controller connected');
    this.touchStartX = 0
    this.touchStartY = 0
    this.isDragging = false
    this.dragDirection = null // 'horizontal' or 'vertical'
    this.setupTouchEvents()
  }

  setupTouchEvents() {
    console.log('Setting up touch events');
    const albumArt = this.albumArtTarget;
    const albumImage = this.albumImageTarget;

    if (!albumArt || !albumImage) {
      console.error('Album art or image target not found');
      return;
    }

    console.log('Album art and image targets found, setting up events');

    // タッチイベントの設定
    albumArt.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    albumArt.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    albumArt.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

    // マウスイベントの設定（デスクトップ用）
    albumArt.addEventListener('mousedown', this.handleMouseDown.bind(this));
    albumArt.addEventListener('mousemove', this.handleMouseMove.bind(this));
    albumArt.addEventListener('mouseup', this.handleMouseUp.bind(this));
    albumArt.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    // ホバーエフェクトの設定
    albumArt.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
    albumArt.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
  }

  handleMouseEnter() {
    this.albumImageTarget.style.transform = 'scale(1.02)';
    this.albumImageTarget.style.transition = 'transform 0.3s ease';
  }

  handleMouseLeave() {
    this.albumImageTarget.style.transform = 'scale(1)';
    this.albumImageTarget.style.transition = 'transform 0.3s ease';
  }

  handleTouchStart(e) {
    e.preventDefault();
    console.log('Touch start detected');
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.isDragging = true;
    this.dragDirection = null;
    this.albumImageTarget.style.transition = 'none';
    this.albumImageTarget.style.cursor = 'grabbing';
    console.log(`Touch start position: X=${this.touchStartX}, Y=${this.touchStartY}`);
  }

  handleMouseDown(e) {
    console.log('Mouse down detected');
    this.touchStartX = e.clientX;
    this.touchStartY = e.clientY;
    this.isDragging = true;
    this.dragDirection = null;
    this.albumImageTarget.style.transition = 'none';
    this.albumImageTarget.style.cursor = 'grabbing';
    console.log(`Mouse down position: X=${this.touchStartX}, Y=${this.touchStartY}`);
  }

  handleTouchMove(e) {
    if (!this.isDragging) return;
    e.preventDefault();

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    console.log(`Touch move: X=${touchX}, Y=${touchY}`);
    this.updateDragPosition(touchX, touchY);
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;
    console.log(`Mouse move: X=${e.clientX}, Y=${e.clientY}`);
    this.updateDragPosition(e.clientX, e.clientY);
  }

  updateDragPosition(x, y) {
    const diffX = x - this.touchStartX;
    const diffY = y - this.touchStartY;
    console.log(`Drag distance: X=${diffX}, Y=${diffY}`);

    // ドラッグ方向の決定（最初の移動で決定）
    if (!this.dragDirection && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      this.dragDirection = Math.abs(diffX) > Math.abs(diffY) ? 'horizontal' : 'vertical';
      console.log(`Drag direction set to: ${this.dragDirection}`);
    }

    // ドラッグ方向に応じた移動制限
    let translateX = 0;
    let translateY = 0;
    let rotation = 0;

    if (this.dragDirection === 'horizontal') {
      translateX = diffX;
      rotation = diffX * 0.1;
    } else if (this.dragDirection === 'vertical') {
      translateY = diffY;
    }

    // ドラッグ中の視覚的フィードバック
    const scale = 1 - Math.min(Math.abs(diffX), Math.abs(diffY)) / 1000;
    this.albumImageTarget.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg) scale(${scale})`;
    this.albumImageTarget.style.opacity = 1 - Math.min(Math.abs(diffX), Math.abs(diffY)) / 300;

    // 方向に応じたカーソルスタイル
    const dominantDirection = this.getDominantDirection(diffX, diffY);
    this.albumImageTarget.style.cursor = this.getCursorForDirection(dominantDirection);
  }

  getDominantDirection(diffX, diffY) {
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);
    
    if (absX > absY) {
      return diffX > 0 ? 'right' : 'left';
    } else {
      return diffY > 0 ? 'down' : 'up';
    }
  }

  getCursorForDirection(direction) {
    switch (direction) {
      case 'right': return 'e-resize';
      case 'left': return 'w-resize';
      case 'down': return 's-resize';
      case 'up': return 'n-resize';
      default: return 'grabbing';
    }
  }

  handleTouchEnd(e) {
    if (!this.isDragging) return;
    console.log('Touch end detected');
    this.handleDragEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  }

  handleMouseUp(e) {
    if (!this.isDragging) return;
    console.log('Mouse up detected');
    this.handleDragEnd(e.clientX, e.clientY);
  }

  handleDragEnd(x, y) {
    const diffX = x - this.touchStartX;
    const diffY = y - this.touchStartY;
    const minSwipeDistance = 100;

    console.log(`Drag end - Distance: X=${diffX}, Y=${diffY}`);

    // アニメーションをリセット
    this.albumImageTarget.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    this.albumImageTarget.style.transform = '';
    this.albumImageTarget.style.opacity = '';
    this.albumImageTarget.style.cursor = 'grab';

    if (Math.abs(diffX) > minSwipeDistance || Math.abs(diffY) > minSwipeDistance) {
      console.log('Swipe detected - calculating direction');
      const dominantDirection = this.getDominantDirection(diffX, diffY);
      
      switch (dominantDirection) {
        case 'right':
          console.log('Swipe right - Add to library');
          const rightEvent = new CustomEvent('swipeRight', { bubbles: true });
          this.element.dispatchEvent(rightEvent);
          break;
        case 'left':
          console.log('Swipe left - Remove from library');
          const leftEvent = new CustomEvent('swipeLeft', { bubbles: true });
          this.element.dispatchEvent(leftEvent);
          break;
        case 'down':
          console.log('Swipe down - Previous track');
          const upEvent = new CustomEvent('swipeUp', { bubbles: true });
          this.element.dispatchEvent(upEvent);
          break;
        case 'up':
          console.log('Swipe up - Next track');
          const downEvent = new CustomEvent('swipeDown', { bubbles: true });
          this.element.dispatchEvent(downEvent);
          break;
      }
    } else {
      console.log('Swipe distance too small, no action taken');
    }

    this.isDragging = false;
    this.dragDirection = null;
  }
} 