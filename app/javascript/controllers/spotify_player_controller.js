import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { token: String }

  connect() {
    console.log('SpotifyPlayerController connected');
    this.initializeSpotifyPlayer();
  }

  initializeSpotifyPlayer() {
    const token = this.tokenValue;

    if (!token) {
      console.warn('Spotify token not found in Stimulus values.');
      return;
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log('Spotify Web Playback SDK Ready callback fired.');
      const player = new Spotify.Player({
        name: 'Smipe Web Player',
        getOAuthToken: cb => cb(token),
        volume: 0.8,
      });

      window.spotifyPlayer = player;
      console.log('window.spotifyPlayer is set:', !!window.spotifyPlayer);

      player.addListener('ready', ({ device_id }) => {
        console.log('Spotify Player ready with Device ID:', device_id);
        window.spotifyDeviceId = device_id;
        const event = new CustomEvent('spotifyPlayerReady', { detail: { deviceId: device_id } });
        document.dispatchEvent(event);
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
    };

    const script = document.createElement('script');
    script.src = "https://sdk.scdn.co/spotify-player.js";
    document.body.appendChild(script);
  }
}
