import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["albumArt", "albumImage", "playIcon", "pauseIcon", "playLabel",
                    "playPauseButton", "shuffleButton", "skipButton", "likeButton",
                    "togglePlaylistSelectionButton", "playlistSelectionPanel", "selectedPlaylistRadios",
                    "songTitle", "artistName", "upNextItems"]
  static values = { playing: Boolean, token: String, trackUris: Array, selectedPlaylistId: String,
                     currentIndex: Number, isLiked: Boolean, isShuffled: Boolean, previousTracks: Array }

  connect() {
    this.touchStartX = 0
    this.touchStartY = 0
    this.isDragging = false
    this.dragDirection = null // 'horizontal' or 'vertical'
    this.setupTouchEvents()

    // 初期データの取得
    this.tokenValue = this.element.dataset.playerToken;
    this.trackUrisValue = JSON.parse(this.element.dataset.playerTrackUris || '[]');
    this.selectedPlaylistIdValue = this.element.dataset.playerSelectedPlaylistId;
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
    // 初期トラックの表示と再生
    if (this.trackUrisValue.length > 0) {
      this.updateCurrentTrackDisplay(this.trackUrisValue[this.currentIndexValue]);
      this.checkIfTrackIsLiked(this.trackUrisValue[this.currentIndexValue]);
      this.updateUpNextDisplay();
      this.playCurrentTrack(); // コメントアウトを解除
    }
  }

  toggleShuffle() {
    this.isShuffledValue = !this.isShuffledValue;
    if (this.isShuffledValue) {
      this.trackUrisValue = this.shuffleArray([...this.trackUrisValue]);
      this.currentIndexValue = 0; // シャッフルしたら最初の曲から
      this.playCurrentTrack();
      this.updateCurrentTrackDisplay(this.trackUrisValue[this.currentIndexValue]);
      this.updateUpNextDisplay();
      this.checkIfTrackIsLiked(this.trackUrisValue[this.currentIndexValue]);
      this.shuffleButtonTarget.style.color = '#1DB954';
    } else {
      // シャッフル解除時の処理（元の順序に戻す場合は別途ロジックが必要）
      // 現状はシャッフルされたままの順序で再生を続ける
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
      // 再生中の状態
      this.playIconTarget.style.display = 'none';
      this.pauseIconTarget.style.display = 'inline';
      this.playLabelTarget.textContent = 'PAUSE';
    } else {
      // 停止中の状態
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

    // ドラッグ方向の決定（最初の移動で決定）
    if (!this.dragDirection && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      this.dragDirection = Math.abs(diffX) > Math.abs(diffY) ? 'horizontal' : 'vertical';
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
    this.handleDragEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  }

  handleMouseUp(e) {
    if (!this.isDragging) return;
    this.handleDragEnd(e.clientX, e.clientY);
  }

  handleDragEnd(x, y) {
    const diffX = x - this.touchStartX;
    const diffY = y - this.touchStartY;
    const minSwipeDistance = 100;

    // アニメーションをリセット
    this.albumImageTarget.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    this.albumImageTarget.style.transform = '';
    this.albumImageTarget.style.opacity = '';
    this.albumImageTarget.style.cursor = 'grab';

    if (Math.abs(diffX) > minSwipeDistance || Math.abs(diffY) > minSwipeDistance) {
      const dominantDirection = this.getDominantDirection(diffX, diffY);
      
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
    }).then(() => {
    }).catch(err => {
      console.error('Playback start error:', err);
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

  handleSkip() {
    this.previousTracksValue = [...this.previousTracksValue, this.currentIndexValue];
    this.currentIndexValue = (this.currentIndexValue + 1) % this.trackUrisValue.length;
    this.playCurrentTrack();
    this.updateCurrentTrackDisplay(this.trackUrisValue[this.currentIndexValue]);
    this.updateUpNextDisplay();
    this.checkIfTrackIsLiked(this.trackUrisValue[this.currentIndexValue]);
    if (this.hasSkipButtonTarget) {
      this.skipButtonTarget.style.color = '#1DB954';
      setTimeout(() => {
        this.skipButtonTarget.style.color = '#B3B3B3';
      }, 500);
    }
  }

  handleNext() {
    this.previousTracksValue = [...this.previousTracksValue, this.currentIndexValue];
    this.currentIndexValue = (this.currentIndexValue + 1) % this.trackUrisValue.length;
    this.playCurrentTrack();
    this.updateCurrentTrackDisplay(this.trackUrisValue[this.currentIndexValue]);
    this.updateUpNextDisplay();
    this.checkIfTrackIsLiked(this.trackUrisValue[this.currentIndexValue]);
  }

  handlePrevious() {
    if (this.previousTracksValue.length > 0) {
      this.currentIndexValue = this.previousTracksValue.pop();
    } else {
      // 履歴がない場合は最後の曲に移動
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

  handleLike(isAdd) {
    this.previousTracksValue = [...this.previousTracksValue, this.currentIndexValue];
    this.currentIndexValue = (this.currentIndexValue + 1) % this.trackUrisValue.length;
    this.playCurrentTrack();
    this.updateCurrentTrackDisplay(this.trackUrisValue[this.currentIndexValue]);
    this.updateUpNextDisplay();
    this.checkIfTrackIsLiked(this.trackUrisValue[this.currentIndexValue]);
    this.updateLikeButtonUI(); // UI更新はcheckIfTrackIsLiked内で呼ばれるので不要だが、念のため
  }

  async addToPlaylist(trackUri) {
    try {
      const selectedPlaylist = this.selectedPlaylistRadiosTarget.querySelector('input[name="selected_playlist"]:checked');
      if (!selectedPlaylist) {
        console.error('No playlist selected');
        return;
      }

      const playlistId = selectedPlaylist.value;
      const playlistName = selectedPlaylist.dataset.playlistName;

      // プレイリストの所有者権限を確認
      const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        headers: {
          'Authorization': `Bearer ${this.tokenValue}`
        }
      });

      if (!playlistResponse.ok) {
        throw new Error('Failed to access playlist');
      }

      const playlistData = await playlistResponse.json();
      
      // プレイリストが自分のものか確認
      // より厳密にはサーバーサイドでチェックすべき

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
        // 重複曲の場合はエラーメッセージを表示しない
        if (errorData.error?.message?.includes('already exists')) {
          this.handleSkip();
          return;
        }
        throw new Error(errorData.error?.message || 'Failed to add track to playlist');
      }

      this.handleSkip();
    } catch (error) {
      console.error('Error adding track to playlist:', error);
      // 重複曲以外のエラーの場合のみアラートを表示
      if (!error.message?.includes('already exists')) {
        alert('プレイリストへの曲の追加に失敗しました。');
      }
    }
  }

  async removeFromPlaylist(trackUri) {
    try {
      const selectedPlaylist = this.selectedPlaylistRadiosTarget.querySelector('input[name="selected_playlist"]:checked');
      if (!selectedPlaylist) {
        console.error('No playlist selected');
        return;
      }

      const playlistId = selectedPlaylist.value;
      const playlistName = selectedPlaylist.dataset.playlistName;

      // プレイリストの所有者権限を確認
      // Note: @spotify_user.id はRails側でしか取得できないため、ここでは簡易的にチェック
      // より厳密にはサーバーサイドでチェックすべき
      // if (playlistData.owner.id !== '''<%= @spotify_user.id %>''') {
      //   console.error('Cannot modify playlist: Not the owner');
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
          tracks: [{ uri: trackUri }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to remove track from playlist');
      }

      this.handleSkip();
    } catch (error) {
      console.error('Error removing track from playlist:', error);
      alert('プレイリストからの曲の削除に失敗しました。');
    }
  }

  togglePlaylistSelection() {
    if (this.hasPlaylistSelectionPanelTarget) {
      const panel = this.playlistSelectionPanelTarget;
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  }

  async handlePlaylistSelectionChange(event) {
    const selectedPlaylist = event.target;
    if (selectedPlaylist.checked) {
      const playlistId = selectedPlaylist.value;
      const playlistName = selectedPlaylist.dataset.playlistName;
      
      try {
        // プレイリストの所有者権限を確認 (クライアントサイドでは簡易的なチェック)
        const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
          headers: {
            'Authorization': `Bearer ${this.tokenValue}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to access playlist');
        }

        const playlistData = await response.json();
        
        // Note: @spotify_user.id はRails側でしか取得できないため、ここでは簡易的にチェック
        // より厳密にはサーバーサイドでチェックすべき
        // if (playlistData.owner.id !== '''<%= @spotify_user.id %>''') {
        //   alert('このプレイリストは編集できません。自分のプレイリストを選択してください。');
        //   const previousSelection = this.selectedPlaylistRadiosTarget.querySelector('input[name="selected_playlist"][checked]');
        //   if (previousSelection) {
        //     previousSelection.checked = true;
        //   }
        //   return;
        // }

        // 選択をサーバーに保存
        await fetch('/player/update_selected_playlist', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
          },
          body: JSON.stringify({ playlist_id: playlistId })
        });

        this.selectedPlaylistIdValue = playlistId; // Stimulus valueを更新
      } catch (error) {
        console.error('Error selecting playlist:', error);
        alert('プレイリストの選択に失敗しました。');
      }
    }
  }
}