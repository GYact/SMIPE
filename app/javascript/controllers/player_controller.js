import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
static targets = ["albumArt", "albumImage", "playIcon", "pauseIcon", "playLabel",
                "playPauseButton", "skipButton", "likeButton",
                "togglePlaylistSelectionButton", "playlistSelectionPanel", "selectedPlaylistRadios",
                "songTitle", "artistName", "upNextItems", "deleteButton",
                "progressBar", "currentTime", "duration", "playlistChangingOverlay"] // オーバーレイ追加
  static values = { playing: Boolean, token: String, trackUris: Array, selectedPlaylistId: String,
                      currentIndex: Number, isLiked: Boolean, previousTracks: Array } // isShuffled削除

  connect() {
    // ...existing code...
    // ページロード時にオーバーレイを非表示
    if (this.hasPlaylistChangingOverlayTarget) {
      this.playlistChangingOverlayTarget.style.display = 'none';
    }
    // 再生バーの自動更新（Spotify Playerのイベントが発火しない場合の暫定対応）
    this.progressInterval = setInterval(async () => {
      if (window.spotifyPlayer && window.spotifyPlayer.getCurrentState) {
        const state = await window.spotifyPlayer.getCurrentState();
        if (state && !this.progressBarDragging) {
          this.updateProgressBar(state.position, state.duration);
        }
      }
    }, 1000);
    // 再生バー連携
    this.progressBar = document.getElementById('progress-bar');
    this.currentTimeLabel = document.getElementById('current-time');
    this.durationLabel = document.getElementById('duration');
    this.progressBar?.addEventListener('input', this.handleSeek.bind(this));
    this.progressBarDragging = false;
    this.progressBar?.addEventListener('mousedown', () => { this.progressBarDragging = true; });
    this.progressBar?.addEventListener('mouseup', () => { this.progressBarDragging = false; });
    this.lastPositionMs = 0;
    this.touchStartX = 0
    this.touchStartY = 0
    this.isDragging = false
    this.dragDirection = null // 'horizontal' or 'vertical'
    this.setupTouchEvents()

    // アルバム画像タップで再生・停止（スマホ対応）
    if (this.hasAlbumImageTarget) {
      this.albumImageTarget.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.togglePlay();
      });
    }

    // Initialize data from dataset if available, otherwise set defaults
    this.tokenValue = this.element.dataset.playerToken;
    this.trackUrisValue = JSON.parse(this.element.dataset.playerTrackUris || '[]');
    this.selectedPlaylistIdValue = this.element.dataset.playerSelectedPlaylistId || null;
    this.currentIndexValue = 0;
    this.isLikedValue = false;
    this.isShuffledValue = false;
    this.previousTracksValue = [];

    this.playerStateChanged = this.playerStateChanged.bind(this);
    if (window.spotifyPlayer) {
      window.spotifyPlayer.addListener('player_state_changed', this.playerStateChanged);
      this.makePlayable();
    } else {
      document.addEventListener('spotifyPlayerReady', () => {
        window.spotifyPlayer.addListener('player_state_changed', this.playerStateChanged);
        this.makePlayable();
      }, { once: true });
    }
  }

  makePlayable() {
    this.playPauseButtonTarget.disabled = false;
    // Initial track display and playback
    if (this.trackUrisValue.length > 0) {
      this.updateCurrentTrackDisplay(this.trackUrisValue[this.currentIndexValue]);
      this.checkIfTrackIsLiked(this.trackUrisValue[this.currentIndexValue]);
      this.updateUpNextDisplay();
      this.playCurrentTrack();
    }
  }



  disconnect() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    if (window.spotifyPlayer && this.playerStateChanged) {
      window.spotifyPlayer.removeListener('player_state_changed', this.playerStateChanged);
      // destroyがあれば必ず呼ぶ（Spotify SDKのクリーンアップ）
      if (typeof window.spotifyPlayer.disconnect === 'function') {
        window.spotifyPlayer.disconnect();
      }
      if (typeof window.spotifyPlayer.destroy === 'function') {
        window.spotifyPlayer.destroy();
      }
      // インスタンスを明示的にnullに
      window.spotifyPlayer = null;
    }
    // SHUFFLE/REPEAT関連のクリーンアップ不要
  }

  togglePlay() {
    if (window.spotifyPlayer) {
      window.spotifyPlayer.togglePlay().catch(err => {
        console.error('Playback toggle failed', err);
      });
    } else {
      console.error('Spotify Player is not available.');
    }
  }

  playingValueChanged() {
    if (this.playingValue) {
      this.playIconTarget.style.display = 'none';
      this.pauseIconTarget.style.display = 'inline';
      this.playLabelTarget.textContent = 'PAUSE';
    } else {
      this.playIconTarget.style.display = 'inline';
      this.pauseIconTarget.style.display = 'none';
      this.playLabelTarget.textContent = 'PLAY';
    }
  }

  setupTouchEvents() {
    const albumArt = this.albumArtTarget;
    const albumImage = this.albumImageTarget;

    if (!albumArt || !albumImage) {
      console.error('Album art or image target not found');
      return;
    }

    // Touch events
    albumArt.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    albumArt.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    albumArt.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

    // ダブルタップ検出用
    this.lastTapTime = 0;
    this.tapTimeout = null;
    albumArt.addEventListener('touchend', this.handleDoubleTap.bind(this), { passive: false });

    // Mouse events (for desktop)
    albumArt.addEventListener('mousedown', this.handleMouseDown.bind(this));
    albumArt.addEventListener('mousemove', this.handleMouseMove.bind(this));
    albumArt.addEventListener('mouseup', this.handleMouseUp.bind(this));
    albumArt.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    // Hover effects
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

  // ダブルタップでリピート切り替え
  handleDoubleTap(e) {
    // シークバー上は無視
    if (e.target === this.progressBar) return;
    const now = Date.now();
    if (this.lastTapTime && (now - this.lastTapTime) < this.constructor.DOUBLE_TAP_DELAY_MS) {
      // ダブルタップ検出
      this.lastTapTime = 0;
      if (this.tapTimeout) {
        clearTimeout(this.tapTimeout);
        this.tapTimeout = null;
      }
      this.toggleRepeatMode();
    } else {
      this.lastTapTime = now;
      if (this.tapTimeout) clearTimeout(this.tapTimeout);
      this.tapTimeout = setTimeout(() => {
        this.lastTapTime = 0;
      }, DOUBLE_TAP_DELAY);
    }
  }

  // Spotifyのリピートモードを切り替える
  async toggleRepeatMode() {
    // 現在のリピート状態を取得
    try {
      const response = await fetch(SPOTIFY_API_BASE_URL, {
        headers: {
          'Authorization': `Bearer ${this.tokenValue}`
        }
      });
      if (!response.ok) throw new Error('Failed to get player state');
      const data = await response.json();
      let newMode = 'off';
      if (data.repeat_state === 'off') {
        newMode = 'track';
      } else {
        newMode = 'off';
      }
      // リピートモード切り替え
      const deviceId = await this.getDeviceId();
      await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${newMode}&device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.tokenValue}`
        }
      });
      // UIフィードバック（mdiRepeat/mdiRepeatOffアイコンをおしゃれにオーバーレイ表示）
      const repeatSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 24 24' fill='none' stroke='#1DB954' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'>
        <path d='M17 1l4 4-4 4'/><path d='M3 11V9a4 4 0 0 1 4-4h14'/><path d='M7 23l-4-4 4-4'/><path d='M21 13v2a4 4 0 0 1-4 4H3'/></svg>`;
      const repeatOffSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 24 24' fill='none' stroke='#1DB954' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'>
        <path d='M17 1l4 4-4 4'/><path d='M3 11V9a4 4 0 0 1 4-4h14'/><path d='M7 23l-4-4 4-4'/><path d='M21 13v2a4 4 0 0 1-4 4H3'/><line x1='2' y1='2' x2='22' y2='22' stroke='#F44336' stroke-width='2.2'/></svg>`;
      const iconHtml = newMode === 'track' ? repeatSvg : repeatOffSvg;
      const overlay = document.createElement('div');
      overlay.innerHTML = iconHtml;
      overlay.style.position = 'absolute';
      overlay.style.left = '50%';
      overlay.style.top = '50%';
      overlay.style.transform = 'translate(-50%, -50%) scale(1)';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '1000';
      overlay.style.opacity = '0.92';
      overlay.style.background = 'rgba(30,30,30,0.35)';
      overlay.style.borderRadius = '50%';
      overlay.style.backdropFilter = 'blur(6px)';
      overlay.style.boxShadow = '0 4px 32px 0 rgba(0,0,0,0.18)';
      overlay.style.padding = '18px';
      overlay.style.transition = 'opacity 0.35s cubic-bezier(.4,2,.6,1), transform 0.35s cubic-bezier(.4,2,.6,1)';
      // albumArtTargetの親要素がrelative/absoluteであることを前提
      const parent = this.albumArtTarget;
      parent.style.position = parent.style.position || 'relative';
      parent.appendChild(overlay);
      setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.transform = 'translate(-50%, -50%) scale(1.25)';
        setTimeout(() => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 350);
      }, 350);
    } catch (err) {
      console.error('Failed to toggle repeat mode:', err);
      alert('リピート切り替えに失敗しました');
    }
  }

  handleTouchStart(e) {
    // シークバー上ならスワイプ判定を無効化
    if (e.target === this.progressBar) {
      this.isDragging = false;
      return;
    }
    e.preventDefault();
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.isDragging = true;
    this.dragDirection = null;
    this.albumImageTarget.style.transition = 'none';
    this.albumImageTarget.style.cursor = 'grabbing';
  }

  handleMouseDown(e) {
    this.touchStartX = e.clientX;
    this.touchStartY = e.clientY;
    this.isDragging = true;
    this.dragDirection = null;
    this.albumImageTarget.style.transition = 'none';
    this.albumImageTarget.style.cursor = 'grabbing';
  }

  handleTouchMove(e) {
    // シークバー上ならスワイプ判定を無効化
    if (e.target === this.progressBar) {
      this.isDragging = false;
      return;
    }
    if (!this.isDragging) return;
    e.preventDefault();

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    this.updateDragPosition(touchX, touchY);
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;
    this.updateDragPosition(e.clientX, e.clientY);
  }

  updateDragPosition(x, y) {
    const diffX = x - this.touchStartX;
    const diffY = y - this.touchStartY;

    // Determine drag direction (set on first significant movement)
    if (!this.dragDirection && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      this.dragDirection = Math.abs(diffX) > Math.abs(diffY) ? 'horizontal' : 'vertical';
    }

    // Restrict movement based on drag direction
    let translateX = 0;
    let translateY = 0;
    let rotation = 0;

    if (this.dragDirection === 'horizontal') {
      translateX = diffX;
      rotation = diffX * 0.1;
    } else if (this.dragDirection === 'vertical') {
      translateY = diffY;
    }

    // Visual feedback during drag
    const scale = 1 - Math.min(Math.abs(diffX), Math.abs(diffY)) / 1000;
    this.albumImageTarget.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg) scale(${scale})`;
    this.albumImageTarget.style.opacity = 1 - Math.min(Math.abs(diffX), Math.abs(diffY)) / 300;

    // Cursor style based on dominant direction
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
    // シークバー上ならスワイプ判定を無効化
    if (e.target === this.progressBar) {
      this.isDragging = false;
      return;
    }
    if (!this.isDragging) return;
    this.handleDragEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  }

  handleMouseUp(e) {
    if (!this.isDragging) return;
    this.handleDragEnd(e.clientX, e.clientY);
  }

  /**
   * Applies an animation based on the given direction and then resets.
   * @param {string} direction - 'left', 'right', 'up', or 'down'.
   */
  applyDragEndAnimation(direction) {
    const albumImage = this.albumImageTarget;
    albumImage.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
    albumImage.style.opacity = 0; // Start fading out

    let transformValue = '';
    switch (direction) {
      case 'left':
        transformValue = 'translateX(-100%) rotate(-10deg) scale(0.8)';
        break;
      case 'right':
        transformValue = 'translateX(100%) rotate(10deg) scale(0.8)';
        break;
      case 'up':
        transformValue = 'translateY(-100%) scale(0.8)';
        break;
      case 'down':
        transformValue = 'translateY(100%) scale(0.8)';
        break;
    }
    albumImage.style.transform = transformValue;

    // Reset after animation
    setTimeout(() => {
      albumImage.style.transition = 'none';
      albumImage.style.transform = '';
      albumImage.style.opacity = '';
      albumImage.style.cursor = 'grab';
    }, 300); // Match animation duration
  }

  handleDragEnd(x, y) {
    const diffX = x - this.touchStartX;
    const diffY = y - this.touchStartY;
    const minSwipeDistance = 100;

    // Reset animation properties immediately if no swipe
    if (Math.abs(diffX) <= minSwipeDistance && Math.abs(diffY) <= minSwipeDistance) {
      this.albumImageTarget.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      this.albumImageTarget.style.transform = '';
      this.albumImageTarget.style.opacity = '';
      this.albumImageTarget.style.cursor = 'grab';
    }
    
    if (Math.abs(diffX) > minSwipeDistance || Math.abs(diffY) > minSwipeDistance) {
      const dominantDirection = this.getDominantDirection(diffX, diffY);
      
      this.applyDragEndAnimation(dominantDirection); // Apply animation based on detected swipe direction

      switch (dominantDirection) {
        case 'right':
          this.handleSwipeRight();
          break;
        case 'left':
          this.handleSwipeLeft();
          break;
        case 'down':
          this.handleSwipeDown();
          break;
        case 'up':
          this.handleSwipeUp();
          break;
      }
    }

    this.isDragging = false;
    this.dragDirection = null;
  }

  handleSwipeRight() {
    const trackUri = this.trackUrisValue[this.currentIndexValue];
    this.addToPlaylist(trackUri);
  }

  handleSwipeLeft() {
    const trackUri = this.trackUrisValue[this.currentIndexValue];
    this.removeFromPlaylist(trackUri);
  }

  handleSwipeUp() {
    // 自動スワイプ判定フラグ・タイマーをリセット
    this._autoSwipeUpTriggered = false;
    if (this._autoSwipeUpTimeout) {
      clearTimeout(this._autoSwipeUpTimeout);
      this._autoSwipeUpTimeout = null;
    }
    this.handleNext();
  }

  handleSwipeDown() {
    // 自動スワイプ判定フラグ・タイマーをリセット
    this._autoSwipeUpTriggered = false;
    if (this._autoSwipeUpTimeout) {
      clearTimeout(this._autoSwipeUpTimeout);
      this._autoSwipeUpTimeout = null;
    }
    this.handlePrevious();
  }

  playerStateChanged(state) {
    if (state) {
      this.playingValue = !state.paused;

      // 再生バー連携
      if (state.position !== undefined && state.duration !== undefined) {
        if (!this.progressBarDragging) {
          this.updateProgressBar(state.position, state.duration);
        }
      }
      this.lastPositionMs = state.position;
      this.lastDurationMs = state.duration;
    }
  }

  updateProgressBar(positionMs, durationMs) {
    if (!this.progressBar || !this.currentTimeLabel || !this.durationLabel) return;
    this.progressBar.max = durationMs || 1;
    this.progressBar.value = positionMs || 0;
    this.currentTimeLabel.textContent = this.formatTime(positionMs);
    this.durationLabel.textContent = this.formatTime(durationMs);

    // positionMs/durationMsが0やundefinedなら何もしない
    if (!durationMs || !positionMs) return;

    // 曲が切り替わったらフラグ・タイマーをリセット
    if (this._lastAutoSwipeDuration !== durationMs || this._lastAutoSwipeIndex !== this.currentIndexValue) {
      this._autoSwipeUpTriggered = false;
      if (this._autoSwipeUpTimeout) {
        clearTimeout(this._autoSwipeUpTimeout);
        this._autoSwipeUpTimeout = null;
      }
      this._lastAutoSwipeDuration = durationMs;
      this._lastAutoSwipeIndex = this.currentIndexValue;
    }

    // シークバーが終端に到達したら1度だけ1秒後に自動で次の曲へ
    if (
      Math.abs(durationMs - positionMs) < 1000 &&
      !this.progressBarDragging &&
      !this._autoSwipeUpTriggered
    ) {
      this._autoSwipeUpTriggered = true;
      this._autoSwipeUpTimeout = setTimeout(async () => {
        try {
          // 現在のリピート状態を取得
          const response = await fetch('https://api.spotify.com/v1/me/player', {
            headers: {
              'Authorization': `Bearer ${this.tokenValue}`
            }
          });
          let repeatState = 'off';
          if (response.ok) {
            const data = await response.json();
            repeatState = data.repeat_state;
          }
          if (repeatState === 'track') {
            // 1曲リピート時はアニメーションなしで同じ曲を再生
            this.playCurrentTrack();
          } else {
            // 通常は次の曲へ（アニメーションあり）
            this.handleSwipeUp();
          }
        } catch (e) {
          // 失敗時は通常通り次の曲へ
          this.handleSwipeUp();
        }
        this._autoSwipeUpTimeout = null;
      }, 1000);
    }
  }

  formatTime(ms) {
    if (!ms || isNaN(ms)) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  handleSeek(event) {
    const seekMs = Number(event.target.value);
    if (window.spotifyPlayer && !isNaN(seekMs)) {
      window.spotifyPlayer.seek(seekMs);
    }
  }

  // Helper to wait for device ID
  async getDeviceId() {
    return new Promise(resolve => {
      if (window.spotifyDeviceId) {
        resolve(window.spotifyDeviceId);
      } else {
        document.addEventListener('spotifyPlayerReady', () => {
          resolve(window.spotifyDeviceId);
        }, { once: true });
      }
    });
  }

  // Play the current track
  async playCurrentTrack() {
    const deviceId = await this.getDeviceId();
    if (!deviceId) {
      console.error('Device ID not ready');
      alert('プレイヤーの準備ができていません。少し待ってから再試行してください。');
      return;
    }

    const currentTrackUri = this.trackUrisValue[this.currentIndexValue];
    if (!currentTrackUri) return;

    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.tokenValue}`
      },
      body: JSON.stringify({
        uris: [currentTrackUri]
      })
    }).then(response => {
      if (!response.ok) {
        // Handle non-OK responses, e.g., 403 Forbidden if not premium or other issues
        response.json().then(errorData => {
          console.error('Playback start error:', errorData);
          alert(`再生エラー: ${errorData.error.message || '不明なエラー'}`);
        }).catch(() => {
          console.error('Playback start error (no JSON response):', response.statusText);
          alert('再生エラーが発生しました。');
        });
      }
    }).catch(err => {
      console.error('Network error during playback start:', err);
      alert('ネットワークエラーが発生しました。');
    });
  }

  updateCurrentTrackDisplay(trackUri) {
    const trackId = trackUri.split(':').pop();

    fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${this.tokenValue}`
      }
    })
    .then(response => response.json())
    .then(trackData => {
      this.albumImageTarget.src = trackData.album.images[0]?.url || '';
      this.albumImageTarget.alt = trackData.name;

      this.songTitleTarget.innerText = trackData.name;
      this.artistNameTarget.innerText = trackData.artists.map(a => a.name).join(', ');
    })
    .catch(err => console.error('Error updating current track display:', err));
  }

  async checkIfTrackIsLiked(trackUri) {
    const trackId = trackUri.split(':').pop();
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`, {
        headers: {
          'Authorization': `Bearer ${this.tokenValue}`
        }
      });
      const results = await response.json();
      this.isLikedValue = results[0];
      this.updateLikeButtonUI();
    } catch (err) {
      console.error('Error checking if track is liked:', err);
    }
  }

  updateLikeButtonUI() {
    if (this.hasLikeButtonTarget) {
      if (this.isLikedValue) {
        this.likeButtonTarget.classList.add('liked');
        this.likeButtonTarget.style.color = '#1DB954';
      } else {
        this.likeButtonTarget.classList.remove('liked');
        this.likeButtonTarget.style.color = '#B3B3B3';
      }
    }
  }

  /**
   * Handles the skip action, applying a visual animation.
   * @param {string} [direction='up'] - The direction of the animation for skipping.
   */
  handleSkip(event) {
    // 上スワイプ時と同じ動作
    this.handleSwipeUp();
  }

  /**
   * Handles the "next track" action, applying a visual animation.
   * @param {string} [direction='up'] - The direction of the animation for moving to the next track.
   */
  handleNext(direction = 'up') {
    this.applyDragEndAnimation(direction); // Apply animation on button click

    this.previousTracksValue = [...this.previousTracksValue, this.currentIndexValue];
    this.currentIndexValue = (this.currentIndexValue + 1) % this.trackUrisValue.length;
    this.playCurrentTrack();
    this.updateCurrentTrackDisplay(this.trackUrisValue[this.currentIndexValue]);
    this.updateUpNextDisplay();
    this.checkIfTrackIsLiked(this.trackUrisValue[this.currentIndexValue]);
  }

  /**
   * Handles the "previous track" action, applying a visual animation.
   * @param {string} [direction='down'] - The direction of the animation for moving to the previous track.
   */
  handlePrevious(direction = 'down') {
    this.applyDragEndAnimation(direction); // Apply animation on button click

    if (this.previousTracksValue.length > 0) {
      this.currentIndexValue = this.previousTracksValue.pop();
    } else {
      // If no history, loop to the last song
      this.currentIndexValue = (this.currentIndexValue - 1 + this.trackUrisValue.length) % this.trackUrisValue.length;
    }
    this.playCurrentTrack();
    this.updateCurrentTrackDisplay(this.trackUrisValue[this.currentIndexValue]);
    this.updateUpNextDisplay();
    this.checkIfTrackIsLiked(this.trackUrisValue[this.currentIndexValue]);
  }

  async updateUpNextDisplay() {
    if (!this.hasUpNextItemsTarget) return;
    this.upNextItemsTarget.innerHTML = '';

    for (let i = 1; i <= 3; i++) {
      const nextIndex = (this.currentIndexValue + i) % this.trackUrisValue.length;
      const trackUri = this.trackUrisValue[nextIndex];
      const trackId = trackUri.split(':').pop();

      try {
        const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
          headers: {
            'Authorization': `Bearer ${this.tokenValue}`
          }
        });
        const trackData = await response.json();

        const itemDiv = document.createElement('div');
        itemDiv.classList.add('up-next-item');
        itemDiv.style.cursor = 'pointer';
        itemDiv.style.display = 'flex';
        itemDiv.style.alignItems = 'center';
        itemDiv.style.padding = '10px';
        itemDiv.style.borderRadius = '8px';
        itemDiv.style.transition = 'background-color 0.2s';
        
        itemDiv.addEventListener('mouseover', () => {
          itemDiv.style.backgroundColor = '#282828';
        });
        
        itemDiv.addEventListener('mouseout', () => {
          itemDiv.style.backgroundColor = 'transparent';
        });
        
        itemDiv.addEventListener('click', () => {
          this.currentIndexValue = nextIndex;
          this.playCurrentTrack();
          this.updateCurrentTrackDisplay(trackUri);
          this.updateUpNextDisplay();
          this.checkIfTrackIsLiked(trackUri);
        });
        
        const img = document.createElement('img');
        img.src = trackData.album.images[0]?.url || '';
        img.alt = 'Album Art';
        img.style.width = '60px';
        img.style.height = '60px';
        img.style.borderRadius = '4px';
        img.style.marginRight = '15px';

        const textDiv = document.createElement('div');
        textDiv.style.flex = '1';

        const title = document.createElement('p');
        title.innerText = trackData.name;
        title.style.margin = '0';
        title.style.fontWeight = 'bold';

        const artist = document.createElement('p');
        artist.innerText = trackData.artists.map(a => a.name).join(', ');
        artist.style.margin = '0';
        artist.style.color = '#B3B3B3';
        artist.style.fontSize = '0.9em';

        textDiv.appendChild(title);
        textDiv.appendChild(artist);

        itemDiv.appendChild(img);
        itemDiv.appendChild(textDiv);

        this.upNextItemsTarget.appendChild(itemDiv);
      } catch (err) {
        console.error('Error updating up next display:', err);
      }
    }
  }



  /**
   * Handles liking/unliking a track, applying a visual animation.
   * @param {boolean} isAdd - True to like, false to unlike.
   * @param {string} [direction='right'] - The direction of the animation.
   */
  async handleLike(isAdd, direction = 'right') {
    this.applyDragEndAnimation(direction); // Apply animation on button click

    const currentTrackUri = this.trackUrisValue[this.currentIndexValue];
    if (!currentTrackUri) return;
    const trackId = currentTrackUri.split(':').pop();

    const method = isAdd ? 'PUT' : 'DELETE';
    const endpoint = `https://api.spotify.com/v1/me/tracks?ids=${trackId}`;

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Authorization': `Bearer ${this.tokenValue}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to update like status');
      }

      this.isLikedValue = isAdd; // Update Stimulus value immediately
      this.updateLikeButtonUI();

      // Optionally move to the next track after liking/unliking
      // this.handleNext(); // Uncomment if you want to automatically skip after liking/unliking

    } catch (error) {
      console.error('Error updating like status:', error);
      alert('「いいね」の更新に失敗しました。');
    }
  }

  async addToPlaylist(trackUri) {
    if (!this.selectedPlaylistIdValue) {
      alert('プレイリストが選択されていません。');
      return;
    }
    
    this.applyDragEndAnimation('right'); // Apply animation

    try {
      const playlistId = this.selectedPlaylistIdValue;

      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.tokenValue}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: [trackUri]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Do not show error message if song already exists in playlist
        if (errorData.error?.message?.includes('already exists')) {
          this.handleSkip();
          return;
        }
        throw new Error(errorData.error?.message || 'Failed to add track to playlist');
      }

      this.handleSkip();
    } catch (error) {
      console.error('Error adding track to playlist:', error);
      // Only alert if it's not the "already exists" error
      if (!error.message?.includes('already exists')) {
        alert('プレイリストへの曲の追加に失敗しました。');
      }
    }
  }

  /**
   * Handles removing the current track from the selected playlist.
   * This method is called by swipe-left or a dedicated "Delete" button.
   */
  async removeFromPlaylist(event) {
    if (!this.selectedPlaylistIdValue) {
      alert('プレイリストが選択されていません。');
      return;
    }

    // ボタンクリックの場合でも、左スワイプアニメーションを適用
    this.applyDragEndAnimation('left'); 

    const currentTrackUri = this.trackUrisValue[this.currentIndexValue];
    if (!currentTrackUri) {
      console.error('No current track to remove.');
      return;
    }

    try {
      const playlistId = this.selectedPlaylistIdValue;

      // プレイリストの所有者権限をチェック
      // これをクライアントサイドで行うのは推奨されません。
      // サーバーサイドでの厳密なチェックが必要です。
      const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        headers: {
          'Authorization': `Bearer ${this.tokenValue}`
        }
      });

      if (!playlistResponse.ok) {
        throw new Error('Failed to access playlist to check ownership');
      }
      const playlistData = await playlistResponse.json();
      
      // 仮のユーザーIDをここで取得すると仮定
      // 例えば、HTMLのdata属性に埋め込んでいる場合など
      // const currentUserId = this.element.dataset.currentSpotifyUserId;
      // if (playlistData.owner.id !== currentUserId) {
      //   alert('このプレイリストは編集できません。自分のプレイリストを選択してください。');
      //   return;
      // }


      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.tokenValue}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tracks: [{ uri: currentTrackUri }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to remove track from playlist');
      }

      // 削除後、次の曲にスキップ
      this.handleSkip('up'); // 削除後もスキップアニメーションを適用
    } catch (error) {
      console.error('Error removing track from playlist:', error);
    }
  }

  togglePlaylistSelection() {
    if (this.hasPlaylistSelectionPanelTarget) {
      const panel = this.playlistSelectionPanelTarget;
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  }

  async handlePlaylistSelectionChange(event) {
    // プレイリスト変更中オーバーレイ表示
    if (this.hasPlaylistChangingOverlayTarget) {
      this.playlistChangingOverlayTarget.style.display = 'flex';
    }
    const selectedPlaylistRadio = event.target;
    if (selectedPlaylistRadio.checked) {
      const playlistId = selectedPlaylistRadio.value;
      const playlistName = selectedPlaylistRadio.dataset.playlistName; // Make sure you have this dataset attribute on your radio buttons

      try {
        const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
          headers: {
            'Authorization': `Bearer ${this.tokenValue}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to access playlist');
        }

        const playlistData = await response.json();

        // Important: For a production app, the ownership check below should primarily be done server-side
        // to prevent unauthorized client-side modifications. This is a client-side example.
        // const currentUserId = this.element.dataset.currentSpotifyUserId; // Assuming this is available
        // if (playlistData.owner.id !== currentUserId) {
        //   alert('このプレイリストは編集できません。自分のプレイリストを選択してください。');
        //   const previousSelection = this.selectedPlaylistRadiosTarget.querySelector(`input[value="${this.selectedPlaylistIdValue}"]`);
        //   if (previousSelection) {
        //     previousSelection.checked = true;
        //   }
        //   return;
        // }

        // Save the selection to the server
        await fetch('/player/update_selected_playlist', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
          },
          body: JSON.stringify({ playlist_id: playlistId })
        });

        this.selectedPlaylistIdValue = playlistId; // Update Stimulus value
        // Optionally hide the playlist selection panel after successful selection
        this.togglePlaylistSelection();
        // ページをリロードして状態を反映
        window.location.reload();

      } catch (error) {
        console.error('Error selecting playlist:', error);
        alert('プレイリストの選択に失敗しました。');
        // Revert to the previously selected radio button in case of an error
        const previousSelection = this.selectedPlaylistRadiosTarget.querySelector(`input[value="${this.selectedPlaylistIdValue}"]`);
        if (previousSelection) {
          previousSelection.checked = true;
        } else {
          // If there was no previous selection, uncheck the current one
          selectedPlaylistRadio.checked = false;
        }
      }
    }
  }

  // DELETEボタンが押されたときに呼び出されるメソッド
  handleDelete() {
    // 左スワイプ時と同じ動作
    this.handleSwipeLeft();
  }
}