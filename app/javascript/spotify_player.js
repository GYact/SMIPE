document.addEventListener('DOMContentLoaded', () => {
  // プレイヤーページでは独自の初期化があるため、スキップ
  if (window.location.pathname === '/player') {
    return;
  }

  const tokenMeta = document.querySelector('meta[name="spotify-token"]');
  if (!tokenMeta) {
    console.warn('Spotify token not found in meta tags');
    return;
  }
  const token = tokenMeta.content;

  // 既に初期化されている場合はスキップ
  if (window.onSpotifyWebPlaybackSDKReady) {
    return;
  }

  window.onSpotifyWebPlaybackSDKReady = () => {
    const player = new Spotify.Player({
      name: 'Smipe Web Player',
      getOAuthToken: cb => cb(token),
      volume: 0.8,
    });

    player.addListener('ready', ({ device_id }) => {
      console.log('Spotify Player ready with Device ID:', device_id);
      window.spotifyDeviceId = device_id;
    });

    player.addListener('not_ready', ({ device_id }) => {
      console.log('Spotify Player device ID went offline:', device_id);
    });

    player.addListener('initialization_error', ({ message }) => {
      console.error('Spotify Player initialization error:', message);
    });

    player.addListener('authentication_error', ({ message }) => {
      console.error('Spotify Player authentication error:', message);
    });

    player.connect();

    document.querySelectorAll('.play-track').forEach(button => {
      button.addEventListener('click', () => {
        const trackUri = button.dataset.uri;
        if (!window.spotifyDeviceId) {
          alert('プレイヤーデバイスが準備できていません');
          return;
        }
        fetch(`https://api.spotify.com/v1/me/player/play?device_id=${window.spotifyDeviceId}`, {
          method: 'PUT',
          body: JSON.stringify({ uris: [trackUri] }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }).then(response => {
          if (!response.ok) {
            console.error('再生エラー:', response.statusText);
          }
        });
      });
    });
  };

  // Spotify Web Playback SDKがまだ読み込まれていない場合のみ読み込む
  if (!document.querySelector('script[src*="spotify-player.js"]')) {
    const script = document.createElement('script');
    script.src = "https://sdk.scdn.co/spotify-player.js";
    document.body.appendChild(script);
  }
});