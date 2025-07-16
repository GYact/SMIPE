import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["albumArt", "albumImage", "playIcon", "pauseIcon", "playLabel",
                    "playPauseButton", "shuffleButton", "skipButton", "likeButton",
                    "togglePlaylistSelectionButton", "playlistSelectionPanel", "selectedPlaylistRadios",
                    "songTitle", "artistName", "upNextItems", "deleteButton"] // deleteButtonターゲットを追加
  static values = { playing: Boolean, token: String, trackUris: Array, selectedPlaylistId: String,
                      currentIndex: Number, isLiked: Boolean, isShuffled: Boolean, previousTracks: Array }

  connect() {
    this.touchStartX = 0
    this.touchStartY = 0
    this.isDragging = false
    this.dragDirection = null // 'horizontal' or 'vertical'
    this.setupTouchEvents()

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

  toggleShuffle() {
    this.isShuffledValue = !this.isShuffledValue;
    if (this.isShuffledValue) {
      this.trackUrisValue = this.shuffleArray([...this.trackUrisValue]);
      this.currentIndexValue = 0; // Start from the first song after shuffling
      this.playCurrentTrack();
      this.updateCurrentTrackDisplay(this.trackUrisValue[this.currentIndexValue]);
      this.updateUpNextDisplay();
      this.checkIfTrackIsLiked(this.trackUrisValue[this.currentIndexValue]);
      this.shuffleButtonTarget.style.color = '#1DB954';
    } else {
      // Revert to original order (this requires storing the original array)
      this.shuffleButtonTarget.style.color = '#B3B3B3';
    }
  }

  disconnect() {
    if (window.spotifyPlayer && this.playerStateChanged) {
      window.spotifyPlayer.removeListener('player_state_changed', this.playerStateChanged);
    }
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

  handleTouchStart(e) {
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
    this.handleNext();
  }

  handleSwipeDown() {
    this.handlePrevious();
  }

  playerStateChanged(state) {
    if (state) {
      this.playingValue = !state.paused;
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

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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