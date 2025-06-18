// app/javascript/controllers/map_controller.js
import { Controller } from "@hotwired/stimulus"
import L from "leaflet"

export default class extends Controller {
  static targets = ["updateButton", "locationDisplay", "statusMessage"]

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
}

  fetch("/locations/nearby")
  .then(response => response.json())
  .then(users => {
    users.forEach(user => {
      if (user.latitude && user.longitude) {
        const marker = L.marker([user.latitude, user.longitude]).addTo(this.map)
          .bindPopup(`
            <div>
              <strong>${user.nickname}</strong><br>
              ${user.location_name || ""}<br>
              最終更新: ${new Date(user.last_updated).toLocaleString('ja-JP')}
            </div>
          `);
      }
    });
  })
  .catch(error => {
    console.error("近くのユーザー取得に失敗:", error);
  });