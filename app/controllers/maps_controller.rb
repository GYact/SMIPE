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
      begin
        # RSpotifyが期待するデータ構造を再構築
        spotify_user_data = {
          'credentials' => {
            'token' => session[:spotify_user_data]['credentials']['token'],
            'refresh_token' => session[:spotify_user_data]['credentials']['refresh_token'],
            'expires' => session[:spotify_user_data]['credentials']['expires'],
            'expires_at' => session[:spotify_user_data]['credentials']['expires_at']
          },
          'id' => session[:spotify_user_data]['uid'],
          'info' => session[:spotify_user_data]['info']
        }
        
        @spotify_user = RSpotify::User.new(spotify_user_data)
        @playlists = @spotify_user.playlists.map do |playlist|
          {
            name: playlist.name,
            uri: playlist.uri
          }
        end
      rescue => e
        Rails.logger.error "RSpotify error in maps: #{e.message}"
        @playlists = []
        flash[:warning] = "Spotifyとの連携に問題が発生しました。"
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