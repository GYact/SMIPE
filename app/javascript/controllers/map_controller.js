// app/javascript/controllers/map_controller.js
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
  }

  initMap() {
    // マップ表示先はmap-wrapper内のmap要素
    const mapElement = this.element.querySelector('#map');
    this.map = L.map(mapElement).setView([35.681236, 139.767125], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
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

  // ✅ プレイリストを保存するボタンがクリックされたときの処理
  savePlaylists() {
    if (!this.hasPlaylistsValue || !this.hasUserLocationValue) {
      console.error("保存に必要な情報が不足しています:", {
        hasPlaylists: this.hasPlaylistsValue,
        hasUserLocation: this.hasUserLocationValue
      });
      this.showStatus("位置情報またはプレイリスト情報が不足しています", "error");
      return;
    }

    const playlists = this.playlistsValue;
    const location = this.userLocationValue;

    console.log("保存を開始します:", {
      playlistsCount: playlists.length,
      playlists: playlists,
      location: location
    });

    if (!location.latitude || !location.longitude) {
      console.error("位置情報が不正です:", location);
      this.showStatus("位置情報が正しく設定されていません。位置を更新してください。", "error");
      return;
    }

    if (playlists.length === 0) {
      console.error("プレイリストが空です");
      this.showStatus("プレイリストがありません。", "error");
      return;
    }

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (!csrfToken) {
      console.error("CSRFトークンが見つかりません");
      this.showStatus("セキュリティトークンが見つかりません。ページを再読み込みしてください。", "error");
      return;
    }

    console.log("サーバーにリクエストを送信します");
    fetch("/save_all_playlists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
        Accept: "application/json"
      },
      body: JSON.stringify({
        playlists: playlists,
        latitude: location.latitude,
        longitude: location.longitude,
        location_name: location.location_name
      })
    })
      .then((res) => {
        console.log("サーバーからのレスポンス:", res.status);
        if (!res.ok) {
          return res.json().then(data => {
            console.error("サーバーエラー:", data);
            throw new Error(data.message || "サーバーエラー");
          });
        }
        return res.json();
      })
      .then((data) => {
        console.log("保存結果:", data);
        if (data.status === "success") {
          this.showStatus(`${data.saved_count}件のプレイリストを保存しました`, "success");
        } else {
          console.error("保存失敗:", data);
          this.showStatus("プレイリストの保存に失敗しました", "error");
        }
      })
      .catch((error) => {
        console.error("エラーが発生しました:", error);
        this.showStatus(error.message || "通信に失敗しました", "error");
      });
  }
}