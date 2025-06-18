// app/javascript/controllers/map_controller.js
import { Controller } from "@hotwired/stimulus"
import L from "leaflet"

export default class extends Controller {
  static targets = ["updateButton", "locationDisplay", "statusMessage", "playlistSelect"]

  connect() {
    this.initMap();
    this.requestLocation();
    this.loadExistingSpots();
    this.loadPlaylists();
  }

  initMap() {
    // マップ表示先はmap-wrapper内のmap要素
    const mapElement = this.element.querySelector('#map');
    this.map = L.map(mapElement).setView([35.681236, 139.767125], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
  }

  loadExistingSpots() {
    fetch("/playlist_spots")
      .then(response => response.json())
      .then(spots => {
        spots.forEach(spot => {
          this.addSpotMarker(spot);
        });
      })
      .catch(error => console.error("Error loading spots:", error));
  }

  loadPlaylists() {
    fetch("/my_playlists")
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          const select = this.playlistSelectTarget;
          select.innerHTML = ''; // 古いオプションをクリア
          data.playlists.forEach(playlist => {
            const option = document.createElement('option');
            option.value = playlist.id;
            option.textContent = playlist.name;
            select.appendChild(option);
          });
        } else {
          console.error("プレイリストの読み込みに失敗しました:", data.message);
        }
      })
      .catch(error => console.error("プレイリストの読み込みエラー:", error));
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

        // 位置情報表示を更新
        this.updateLocationDisplay(latitude, longitude, accuracy);

        // 位置情報をサーバへ送信
        this.sendLocationToServer(latitude, longitude);

        // 地図の中心を取得位置に移動し、マーカー表示
        this.map.setView([latitude, longitude], 15);

        if (this.marker) {
          this.map.removeLayer(this.marker);
        }

        this.marker = L.marker([latitude, longitude]).addTo(this.map)
          .bindPopup(`
            <div>
              <strong>現在位置</strong><br>
              緯度: ${latitude.toFixed(6)}<br>
              経度: ${longitude.toFixed(6)}
            </div>
          `).openPopup();
      },
      (error) => {
        console.error("位置情報取得失敗:", error);
        let message = "位置情報を取得できませんでした";
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            message = "位置情報のアクセスが拒否されました";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "位置情報が利用できません";
            break;
          case error.TIMEOUT:
            message = "位置情報の取得がタイムアウトしました";
            break;
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

  // 位置更新ボタンがクリックされた時のアクション
  updateLocation() {
    if (this.hasUpdateButtonTarget) {
      this.updateButtonTarget.disabled = true;
      this.updateButtonTarget.textContent = "更新中...";
    }

    this.requestLocation();

    // ボタンを元に戻す
    setTimeout(() => {
      if (this.hasUpdateButtonTarget) {
        this.updateButtonTarget.disabled = false;
        this.updateButtonTarget.textContent = "位置を更新";
      }
    }, 2000);
  }

  placeSpot() {
    const playlistId = this.playlistSelectTarget.value;
    if (!playlistId) {
      this.showStatus("プレイリストが選択されていません", "error");
      return;
    }

    this.showStatus("現在地を取得してプレイリストを設置します...", "info");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        this.sendSpotToServer(latitude, longitude, playlistId);
      },
      (error) => {
        console.error("位置情報取得失敗:", error);
        this.showStatus("位置情報を取得できませんでした", "error");
      },
      { enableHighAccuracy: true }
    );
  }

  sendSpotToServer(lat, lng, playlistId) {
    const spotData = {
      playlist_spot: {
        latitude: lat,
        longitude: lng,
        spotify_playlist_id: playlistId,
      }
    };

    fetch("/playlist_spots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.getMetaValue("csrf-token"),
        "Accept": "application/json"
      },
      body: JSON.stringify(spotData)
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === "success") {
        this.showStatus("現在の場所にプレイリストを設置しました！", "success");
        this.addSpotMarker(data.playlist_spot);
      } else {
        const errorMessage = data.errors ? data.errors.join(", ") : "不明なエラー";
        this.showStatus(`設置に失敗しました: ${errorMessage}`, "error");
      }
    })
    .catch(error => {
      console.error("通信エラー", error);
      this.showStatus("通信に失敗しました", "error");
    });
  }

  addSpotMarker(spot) {
    const marker = L.marker([spot.latitude, spot.longitude]).addTo(this.map);
    const playlistUri = `spotify:playlist:${spot.spotify_playlist_id}`;

    marker.on('popupopen', () => {
      const content = `
        <div>
          <p>Playlist: ${spot.spotify_playlist_id}</p>
          <button class="popup-play-button">このプレイリストを聴く</button>
        </div>
      `;
      marker.setPopupContent(content);

      const playButton = marker.getPopup().getElement().querySelector('.popup-play-button');
      if (playButton) {
        playButton.onclick = () => {
          if (window.playSpotifyTrack) {
            window.playSpotifyTrack(playlistUri);
          } else {
            console.error('playSpotifyTrack function not found');
            alert('再生機能の初期化に問題があります。');
          }
        };
      }
    });

    marker.bindPopup("Loading...");
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
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.status === "success") {
        console.log("位置情報が更新されました", data.location);
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

  updateLocationDisplay(lat, lng, accuracy) {
    if (this.hasLocationDisplayTarget) {
      this.locationDisplayTarget.innerHTML = `
        <div class="coordinates">
          <strong>緯度:</strong> ${lat.toFixed(4)}<br>
          <strong>経度:</strong> ${lng.toFixed(4)}<br>
          <strong>精度:</strong> ${Math.round(accuracy)}m
        </div>
        <div style="margin-top: 10px; font-size: 12px; color: #666;">
          最終更新: ${new Date().toLocaleString('ja-JP')}
        </div>
      `;
    }
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
}