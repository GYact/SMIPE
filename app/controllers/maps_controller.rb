class MapsController < ApplicationController
  before_action :require_login
  
  def index
    # ユーザーの位置情報を取得（0の場合はnullに設定）
    @user_location = if current_user.has_location?
      {
        latitude: current_user.latitude,
        longitude: current_user.longitude,
        location_name: current_user.location_name
      }
    else
      {
        latitude: nil,
        longitude: nil,
        location_name: nil
      }
    end

    if session[:spotify_user_data]
      @spotify_user = RSpotify::User.new(session[:spotify_user_data])
      @playlists = @spotify_user.playlists.map do |playlist|
        {
          name: playlist.name,
          uri: playlist.uri
        }
      end
    else
      @playlists = []
      flash[:warning] = "Spotifyとの連携が必要です。"
    end
  end
  
  private
  
  def require_login
    redirect_to login_path unless logged_in?
  end
end