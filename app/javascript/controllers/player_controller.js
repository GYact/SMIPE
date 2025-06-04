import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["playButton", "pauseButton", "skipButton"]
  static values = { csrfToken: String }

  connect() {
    console.log("Player controller connected")
    this.initializeSpotifyPlayer()
  }

  disconnect() {
    if (this.spotifyPlayer) {
      this.spotifyPlayer.disconnect()
    }
  }

  async initializeSpotifyPlayer() {
    if (window.Spotify && this.spotifyPlayer) {
      console.log("Spotify Player SDK already loaded and player initialized.")
      return
    }
    if (window.spotifySDKInitializing) {
      console.log("Spotify Player SDK initialization in progress...")
      return
    }
    window.spotifySDKInitializing = true

    await new Promise(resolve => {
      if (window.Spotify) {
        resolve()
      } else {
        window.onSpotifyWebPlaybackSDKReady = () => {
          console.log("Spotify Web Playback SDK externally loaded.")
          resolve()
        }
      }
    })

    try {
      const response = await fetch('/player/token')
      if (!response.ok) {
        throw new Error(`Failed to fetch Spotify token: ${response.statusText}`)
      }
      const data = await response.json()
      const accessToken = data.access_token

      if (!accessToken) {
        console.error("Access token is missing.")
        this.showNotification("Spotify認証トークンが見つかりません。", "error")
        window.spotifySDKInitializing = false
        return
      }

      this.spotifyPlayer = new Spotify.Player({
        name: 'SMIPE Web Player',
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.5
      })

      this.spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Spotify Player Ready with Device ID', device_id)
        this.spotifyDeviceId = device_id
        this.showNotification('Webプレイヤーが接続されました。', 'success')
      })

      this.spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id)
        this.showNotification('Webプレイヤーがオフラインになりました。', 'warning')
      })

      this.spotifyPlayer.addListener('initialization_error', ({ message }) => {
        console.error('Failed to initialize Spotify Player:', message)
        this.showNotification(`初期化エラー: ${message}`, 'error')
      })

      this.spotifyPlayer.addListener('authentication_error', ({ message }) => {
        console.error('Spotify Player Authentication error:', message)
        this.showNotification(`認証エラー: ${message}`, 'error')
      })

      this.spotifyPlayer.addListener('account_error', ({ message }) => {
        console.error('Spotify Player Account error:', message)
        this.showNotification(`アカウントエラー: ${message}. Premiumアカウントが必要な場合があります。`, 'error')
      })

      this.spotifyPlayer.addListener('playback_error', ({ message }) => {
        console.error('Spotify Player Playback error:', message)
        this.showNotification(`再生エラー: ${message}`, 'error')
      })

      this.spotifyPlayer.addListener('player_state_changed', state => {
        console.log('Player state changed:', state)
        if (!state) {
          console.log("Nothing is playing or player is not active.")
          return
        }
      })

      await this.spotifyPlayer.connect().then(success => {
        if (success) {
          console.log('The Web Playback SDK successfully connected to Spotify!')
        } else {
          console.error('The Web Playback SDK failed to connect to Spotify.')
        }
      })

    } catch (error) {
      console.error("Error initializing Spotify Player:", error)
      this.showNotification("Spotify Playerの初期化に失敗しました。", "error")
    } finally {
      window.spotifySDKInitializing = false
    }
  }

  playTrack(event) {
    const trackUri = event.currentTarget.dataset.trackUri
    if (!trackUri) {
      console.error("Track URI is missing")
      return
    }
    if (this.spotifyPlayer && this.spotifyDeviceId) {
      console.log(`Playing track ${trackUri} on device ${this.spotifyDeviceId}`)
      this.sendRequest('/player/play_track', { track_uri: trackUri, device_id: this.spotifyDeviceId })
    } else {
      this.showNotification("Webプレイヤーが準備できていません。", "error")
      console.warn("Spotify player not ready or device ID missing. Falling back to default playback")
      this.sendRequest('/player/play_track', { track_uri: trackUri })
    }
  }

  playPlaylist(event) {
    const playlistId = event.currentTarget.dataset.playlistId
    if (!playlistId) {
      console.error("Playlist ID is missing")
      return
    }
    if (this.spotifyPlayer && this.spotifyDeviceId) {
      console.log(`Playing playlist ${playlistId} on device ${this.spotifyDeviceId}`)
      this.sendRequest('/player/play_playlist', { playlist_id: playlistId, device_id: this.spotifyDeviceId })
    } else {
      this.showNotification("Webプレイヤーが準備できていません。", "error")
      console.warn("Spotify player not ready or device ID missing. Falling back to default playback")
      this.sendRequest('/player/play_playlist', { playlist_id: playlistId })
    }
  }

  async pause() {
    if (this.spotifyPlayer) {
      try {
        await this.spotifyPlayer.pause()
        console.log('Playback paused via SDK')
        this.showNotification('再生を一時停止しました。', 'success')
      } catch (e) {
        console.error('SDK pause failed:', e)
        this.sendRequest('/player/pause')
      }
    } else {
      this.sendRequest('/player/pause')
    }
  }

  async resume() {
    if (this.spotifyPlayer) {
      try {
        await this.spotifyPlayer.resume()
        console.log('Playback resumed via SDK')
        this.showNotification('再生を再開しました。', 'success')
      } catch (e) {
        console.error('SDK resume failed:', e)
      }
    } else {
      this.showNotification("Webプレイヤーが準備できていません。", "error")
    }
  }

  async togglePlay() {
    if (!this.spotifyPlayer) {
      this.showNotification("Webプレイヤーが準備できていません。", "error")
      return
    }
    const state = await this.spotifyPlayer.getCurrentState()
    if (state) {
      if (state.paused) {
        await this.resume()
      } else {
        await this.pause()
      }
    } else {
      this.showNotification("再生状態を取得できません。何か曲を再生してください。", "warning")
    }
  }

  async skip() {
    if (this.spotifyPlayer) {
      try {
        await this.spotifyPlayer.nextTrack()
        console.log('Skipped to next track via SDK')
        this.showNotification('次の曲へスキップしました。', 'success')
      } catch (e) {
        console.error('SDK nextTrack failed:', e)
        this.sendRequest('/player/skip')
      }
    } else {
      this.sendRequest('/player/skip')
    }
  }

  async previous() {
    if (this.spotifyPlayer) {
      try {
        await this.spotifyPlayer.previousTrack()
        console.log('Skipped to previous track via SDK')
        this.showNotification('前の曲へスキップしました。', 'success')
      } catch (e) {
        console.error('SDK previousTrack failed:', e)
        this.showNotification('SDK経由での「前の曲へ」操作に失敗しました。', 'error')
      }
    } else {
      this.showNotification("Webプレイヤーが準備できていません。", "error")
    }
  }

  sendRequest(url, data = {}) {
    const csrfToken = this.getCSRFToken()
    
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(data)
    })
    .then(response => {
      if (!response.ok) {
        return response.json().catch(() => null).then(errorBody => {
          const errorMessage = errorBody?.message || errorBody?.error || response.statusText
          throw new Error(errorMessage)
        })
      }
      return response.json()
    })
    .then(data => {
      if (data.status === 'success') {
        console.log(data.message)
      } else {
        console.error(data.message)
        this.showNotification(data.message || 'リクエストに失敗しました。', 'error')
      }
    })
    .catch(error => {
      console.error('Request Error:', error)
      this.showNotification(error.message || 'リクエスト中にエラーが発生しました。', 'error')
    })
  }

  getCSRFToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]')
    return metaTag ? metaTag.content : ''
  }

  showNotification(message, type) {
    const existingNotification = document.querySelector('.notification')
    if (existingNotification) {
      existingNotification.remove()
    }
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`
    notification.textContent = message
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      border-radius: 5px;
      color: white;
      z-index: 1000;
      background-color: ${type === 'success' ? '#4CAF50' : (type === 'warning' ? '#ff9800' : '#f44336')};
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      transition: opacity 0.5s, transform 0.5s;
      opacity: 0;
      transform: translateY(-20px);
    `
    document.body.appendChild(notification)
    
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    }, 10);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-20px)';
      setTimeout(() => notification.remove(), 500);
    }, 3000)
  }
} 