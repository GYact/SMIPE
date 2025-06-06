class PlayerController < ApplicationController
    def show
    # 位置情報関連のデータを追加
    @user_location = current_user.has_location? ? {
      latitude: current_user.latitude,
      longitude: current_user.longitude,
      location_name: current_user.location_name,
      last_updated: current_user.last_location_update,
      is_stale: current_user.location_stale?
    } : nil
    end
  end