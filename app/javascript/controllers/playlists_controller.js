import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["tracksList"]

  async toggleTracks(event) {
    const card = event.currentTarget;
    const playlistId = card.dataset.playlistsPlaylistIdValue; // クリックされたカードから直接IDを取得
    const tracksList = card.querySelector('[data-playlists-target="tracksList"]');

    console.log('Playlist card clicked:', playlistId);

    // 既に開いている場合は閉じる
    if (tracksList.style.display === 'block') {
      tracksList.style.display = 'none';
      console.log('Closing tracks list');
      return;
    }

    // 他の開いているプレイリストを閉じる
    document.querySelectorAll('[data-playlists-target="tracksList"]').forEach(list => {
      if (list !== tracksList) {
        list.style.display = 'none';
      }
    });

    // トラックリストを表示
    tracksList.style.display = 'block';
    console.log('Opening tracks list for playlist:', playlistId);

    try {
      const tokenMeta = document.querySelector('meta[name="spotify-token"]');
      const token = tokenMeta ? tokenMeta.content : null;

      if (!token) {
        console.error('Spotify token not found in meta tags.');
        tracksList.innerHTML = '<div class="track-error">Spotify認証情報がありません。</div>';
        return;
      }

      console.log('Fetching tracks from:', `/playlists/${playlistId}/tracks`);
      // プレイリストが自分のものか確認
      // より厳密にはサーバーサイドでチェックすべき

      const response = await fetch(`/playlists/${playlistId}/tracks`, {
        headers: {
          'Accept': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
          'Authorization': `Bearer ${token}` // トークンをヘッダーに追加
        }
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const tracks = await response.json();
        console.log('Tracks received:', tracks);

        if (tracks.error) {
          throw new Error(tracks.error);
        }

        tracksList.innerHTML = tracks.map(track => `
          <div class="track-item">
            <div class="track-info">
              <div class="track-name">${track.name}</div>
              <div class="track-artist">${track.artists.join(', ')}</div>
            </div>
          </div>
        `).join('');

        console.log('Tracks list updated successfully');
      } else {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.error || 'Failed to load tracks');
      }
    } catch (error) {
      console.error('Error loading tracks:', error);
      tracksList.innerHTML = `<div class="track-error">${error.message || 'Error loading tracks'}</div>`;
    }
  }
}
