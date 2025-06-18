class MapsController < ApplicationController
  before_action :require_login
  
  def index
    @user_location = {
      latitude: current_user.latitude || 0,
      longitude: current_user.longitude || 0,
      location_name: current_user.location_name
    }

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