class HomeController < ApplicationController
  before_action :authenticate_user!
  
  def index
    @user_location = current_user.has_location? ? {
      latitude: current_user.latitude,
      longitude: current_user.longitude,
      last_updated: current_user.last_location_update,
      is_stale: current_user.location_stale?
    } : nil
    
    # 近くのユーザーを取得（オプション）
    if current_user.has_location?
      @nearby_users = User.near_location(
        current_user.latitude, 
        current_user.longitude, 
        10 # 10km圏内
      ).where.not(id: current_user.id).limit(10)
    end
  end
end