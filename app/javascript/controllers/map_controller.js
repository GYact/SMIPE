import { Controller } from "@hotwired/stimulus"
import L from "leaflet"

export default class extends Controller {
  static targets = ["updateButton", "locationDisplay", "statusMessage"]
  static values = {
    playlists: Array,
    userLocation: Object
  }

  connect() {
    this.initMap();
    this.requestLocation();
    this.loadSavedPlaylists();
    this.setupPlaylistSelection();
  }

  initMap() {
    const mapElement = this.element.querySelector('#map');
    this.map = L.map(mapElement).setView([35.681236, 139.767125], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.playlistMarkers = [];
  }

  setupPlaylistSelection() {
    const playlistSelect = document.getElementById('playlist-select');
    const saveButton = document.querySelector('.save-playlist-button');
    
    if (playlistSelect && saveButton) {
      playlistSelect.addEventListener('change', () => {
        saveButton.disabled = !playlistSelect.value;
      });
    }
  }

  requestLocation() {
    if (!navigator.geolocation) {
      this.showStatus("位置情報がサポートされていません", "error");
      return;
    }

    this.showStatus("位置情報を取得中...", "info");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        
        this.sendLocationToServer(latitude, longitude);

        this.map.setView([latitude, longitude], 15);

        if (this.marker) this.map.removeLayer(this.marker);

        // 現在地ピンを全身人型アイコンで表示
        const currentLocationIcon = L.divIcon({
          className: 'current-location-icon',
          html: '<i class="fas fa-person"></i>',
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36]
        });

        this.marker = L.marker([latitude, longitude], { icon: currentLocationIcon }).addTo(this.map)
          .bindPopup(`
            <div>
              <strong>登録位置</strong><br>
              <span class="address-loading">住所を取得中...</span>
            </div>
          `).openPopup();

        // 住所を取得してポップアップを更新
        fetch(`/locations/reverse_geocode?latitude=${latitude}&longitude=${longitude}`)
          .then(response => response.json())
          .then(data => {
            if (data.address) {
              this.marker.getPopup().setContent(`
                <div>
                  <strong>現在位置</strong><br>
                  ${data.address}
                </div>
              `);
            }
          });

        this.userLocationValue = {
          latitude: latitude,
          longitude: longitude,
          location_name: `緯度: ${latitude.toFixed(4)}, 経度: ${longitude.toFixed(4)}`
        };
      },
      (error) => {
        console.error("位置情報取得失敗:", error);
        let message = "位置情報を取得できませんでした";

        switch (error.code) {
          case error.PERMISSION_DENIED: message = "位置情報のアクセスが拒否されました"; break;
          case error.POSITION_UNAVAILABLE: message = "位置情報が利用できません"; break;
          case error.TIMEOUT: message = "位置情報の取得がタイムアウトしました"; break;
        }

        this.showStatus(message, "error");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }

  updateLocation() {
    if (this.hasUpdateButtonTarget) {
      this.updateButtonTarget.disabled = true;
      this.updateButtonTarget.textContent = "更新中...";
    }

    this.requestLocation();

    setTimeout(() => {
      if (this.hasUpdateButtonTarget) {
        this.updateButtonTarget.disabled = false;
        this.updateButtonTarget.textContent = "位置を更新";
      }
    }, 2000);
  }

  sendLocationToServer(lat, lng) {
    const locationData = {
      location: {
        latitude: lat,
        longitude: lng,
        location_name: `緯度: ${lat.toFixed(4)}, 経度: ${lng.toFixed(4)}`
      }
    };

    fetch("/locations/1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.getMetaValue("csrf-token"),
        "Accept": "application/json"
      },
      body: JSON.stringify(locationData)
    })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      if (data.status === "success") {
        this.showStatus("位置情報を更新しました", "success");
      } else {
        this.showStatus("更新に失敗しました: " + (data.errors?.join(", ") || "不明なエラー"), "error");
      }
    })
    .catch(error => {
      console.error("通信エラー", error);
      this.showStatus("通信に失敗しました", "error");
    });
  }

  

  showStatus(message, type) {
    if (this.hasStatusMessageTarget) {
      this.statusMessageTarget.textContent = message;
      this.statusMessageTarget.className = `status-message status-${type}`;

      if (type === 'success') {
        setTimeout(() => {
          this.statusMessageTarget.textContent = '';
          this.statusMessageTarget.className = '';
        }, 3000);
      }
    }
  }

  getMetaValue(name) {
    const element = document.querySelector(`meta[name="${name}"]`);
    return element && element.getAttribute("content");
  }

  loadSavedPlaylists() {
    fetch('/playlist_locations')
      .then(response => response.json())
      .then(data => {
        this.clearPlaylistMarkers();
        data.forEach(location => this.addPlaylistMarker(location));
      })
      .catch(error => {
        console.error('プレイリスト位置情報の取得に失敗しました:', error);
      });
  }

  addPlaylistMarker(location) {
    const userNickname = location.user_nickname || '不明なユーザー';
    const userImage = location.user_image || '';
    const playlistName = location.name || 'プレイリスト名不明';
    const playlistImage = location.playlist_image || null;
    
    
    
    // カスタムアイコン
    let markerOptions = {};
    if (playlistImage) {
      markerOptions.icon = L.icon({
        iconUrl: playlistImage,
        iconSize: [48, 48],
        iconAnchor: [24, 48],
        popupAnchor: [0, -48],
        className: 'playlist-leaflet-icon'
      });
    }
    
    const marker = L.marker([location.latitude, location.longitude], markerOptions)
      .bindPopup(`
        <div class="playlist-marker-popup">
          <div style="font-weight:bold; color:#1DB954; font-size:16px; margin-bottom:4px;">
            プレイリスト名: ${playlistName}
          </div>
          <p>場所: ${location.location_name}</p>
          <p>保存日時: ${new Date(location.created_at).toLocaleString('ja-JP')}</p>
          <div class="user-info">
            ${userImage ? `<img src="${userImage}" alt="${userNickname}" class="user-avatar" style="width:32px;height:32px;border-radius:50%;margin-right:8px;">` : ''}
            <span>保存者: ${userNickname}</span>
          </div>
          <div class="playlist-actions" style="margin-top: 15px;">
            <button class="play-playlist-btn" onclick="window.playPlaylistFromMap('${location.uri}', '${location.name}')" style="
              background: #1DB954;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 20px;
              cursor: pointer;
              font-size: 14px;
              font-weight: bold;
              display: flex;
              align-items: center;
              gap: 5px;
            ">
              <i class="fas fa-play" style="font-size: 12px;"></i>
              再生
            </button>
          </div>
        </div>
      `);
    marker.addTo(this.map);
    this.playlistMarkers.push(marker);
  }

  clearPlaylistMarkers() {
    this.playlistMarkers.forEach(marker => {
      this.map.removeLayer(marker);
    });
    this.playlistMarkers = [];
  }

  saveSelectedPlaylist() {
    const playlistSelect = document.getElementById('playlist-select');
    const selectedUri = playlistSelect.value;
    const selectedOption = playlistSelect.options[playlistSelect.selectedIndex];
    const selectedName = selectedOption.getAttribute('data-name');

    if (!selectedUri) {
      this.showStatus("プレイリストを選択してください", "error");
      return;
    }

    if (!this.hasUserLocationValue) {
      this.showStatus("位置情報が不足しています。位置を更新してください。", "error");
      return;
    }

    const location = this.userLocationValue;

    if (!location.latitude || !location.longitude || 
        location.latitude === 0 || location.longitude === 0 ||
        isNaN(location.latitude) || isNaN(location.longitude)) {
      this.showStatus("位置情報が正しく設定されていません。位置を更新してください。", "error");
      return;
    }

    const csrfToken = this.getMetaValue("csrf-token");
    if (!csrfToken) {
      this.showStatus("セキュリティトークンが見つかりません。ページを再読み込みしてください。", "error");
      return;
    }

    const saveButton = document.querySelector('.save-playlist-button');
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = '保存中...';
    }

    fetch("/save_playlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
        Accept: "application/json"
      },
      body: JSON.stringify({
        name: selectedName,
        uri: selectedUri,
        latitude: location.latitude,
        longitude: location.longitude,
        location_name: location.location_name
      })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(data => {
            throw new Error(data.message || "サーバーエラー");
          });
        }
        return res.json();
      })
      .then(data => {
        if (data.status === "success") {
          this.showStatus(`プレイリスト「${selectedName}」を保存しました`, "success");
          this.loadSavedPlaylists();
          playlistSelect.value = "";
          if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = '選択したプレイリストを保存';
          }
        } else {
          this.showStatus("プレイリストの保存に失敗しました", "error");
        }
      })
      .catch(error => {
        this.showStatus(error.message || "通信に失敗しました", "error");
      })
      .finally(() => {
        if (saveButton) {
          saveButton.disabled = false;
          saveButton.textContent = '選択したプレイリストを保存';
        }
      });
  }
}

// グローバル関数としてプレイリスト再生機能を追加
window.playPlaylistFromMap = function(playlistUri, playlistName) {
  // プレイヤーページにクエリパラメータで遷移
  const url = new URL('/player', window.location.origin);
  url.searchParams.set('uri', playlistUri);
  window.location.href = url;
};