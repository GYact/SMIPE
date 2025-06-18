class HomeController < ApplicationController
  before_action :authenticate_user!
  
  def index
    @user_location = current_user.has_location? ? {
      latitude: current_user.latitude,
      longitude: current_user.longitude,
      location_name: current_user.location_name,
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

  def playlists
    if logged_in? && session[:spotify_user_data]
      begin
        rspotify_user = RSpotify::User.new(session[:spotify_user_data])
        user_playlists = rspotify_user.playlists(limit: 50) # ユーザーのプレイリストを50件まで取得
        
        playlists_data = user_playlists.map do |playlist|
          { id: playlist.id, name: playlist.name }
        end
        
        render json: { status: 'success', playlists: playlists_data }
      rescue RestClient::ExceptionWithResponse => e
        render json: { status: 'error', message: 'Spotify APIエラー', details: e.response }, status: :bad_gateway
      rescue => e
        render json: { status: 'error', message: '不明なエラー', details: e.message }, status: :internal_server_error
      end
    else
      render json: { status: 'error', message: 'ログインしていません' }, status: :unauthorized
    end
  end
end