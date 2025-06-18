document.addEventListener('DOMContentLoaded', () => {
  const tokenMeta = document.querySelector('meta[name="spotify-token"]');
  if (!tokenMeta) {
    console.warn('Spotify token not found in meta tags');
    return;
  }
  const token = tokenMeta.content;

  // グローバル再生関数
  window.playSpotifyTrack = (uri) => {
    if (!window.spotifyDeviceId) {
      alert('プレイヤーデバイスが準備できていません');
      return;
    }

    let body;
    const uriType = uri.split(':')[1];

    if (uriType === 'playlist') {
      body = JSON.stringify({ context_uri: uri });
    } else { // track or other
      body = JSON.stringify({ uris: [uri] });
    }

    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${window.spotifyDeviceId}`, {
      method: 'PUT',
      body: body,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }).then(response => {
      if (!response.ok) {
        console.error('再生エラー:', response.statusText);
      }
    });
  };

  window.onSpotifyWebPlaybackSDKReady = () => {
    const player = new Spotify.Player({
      name: 'Smipe Web Player',
      getOAuthToken: cb => cb(token),
      volume: 0.8,
    });

    player.addListener('ready', ({ device_id }) => {
      console.log('Spotify Player ready with Device ID:', device_id);
      window.spotifyDeviceId = device_id;
      // 元からある再生ボタンにリスナーを設定
      document.querySelectorAll('.play-track').forEach(button => {
        button.addEventListener('click', () => {
          const trackUri = button.dataset.uri;
          window.playSpotifyTrack(trackUri);
        });
      });
    });

    player.addListener('not_ready', ({ device_id }) => {
      console.log('Spotify Player device ID went offline:', device_id);
    });
    
    player.addListener('player_state_changed', state => {
      if (!state) {
        window.currentSpotifyTrackId = null;
        return;
      }
      const currentTrack = state.track_window.current_track;
      if (currentTrack) {
        console.log('Currently Playing:', currentTrack.name);
        window.currentSpotifyTrackId = currentTrack.id;
        window.currentSpotifyTrackUri = currentTrack.uri; // URIも保存
      } else {
        window.currentSpotifyTrackId = null;
        window.currentSpotifyTrackUri = null;
      }
    });

    player.addListener('initialization_error', ({ message }) => {
      console.error('Spotify Player initialization error:', message);
    });

    player.addListener('authentication_error', ({ message }) => {
      console.error('Spotify Player authentication error:', message);
    });

    player.connect();
  };

  const script = document.createElement('script');
  script.src = "https://sdk.scdn.co/spotify-player.js";
  document.body.appendChild(script);
});