class PlayerController < ApplicationController
  before_action :require_login

  def show
    if session[:spotify_user_data]
      @spotify_user = RSpotify::User.new(session[:spotify_user_data])
      @playlists = @spotify_user.playlists
      @all_track_uris = []
      @playlists.each do |playlist|
        tracks = playlist.tracks
        @all_track_uris.concat(tracks.map(&:uri))
      end
      first_playlist = @playlists.first
      if first_playlist && first_playlist.tracks.any?
        @first_track = first_playlist.tracks.first
        @first_track_uri = @first_track.uri
      else
        @first_track = nil
        @first_track_uri = nil
      end
      @access_token = session[:spotify_user_data]["credentials"]["token"]

      # 位置情報関連のデータを追加
      @user_location = current_user.has_location? ? {
        latitude: current_user.latitude,
        longitude: current_user.longitude,
        location_name: current_user.location_name,
        last_updated: current_user.last_location_update,
        is_stale: current_user.location_stale?
      } : nil
    else
      # Spotifyセッションがない場合は、ログアウトして再認証を促す
      log_out
      session.delete(:spotify_user_data)
      flash[:warning] = "Spotifyとの連携が必要です。再度ログインしてください。"
      redirect_to root_path
    end
  end

  private

  def require_login
    unless logged_in?
      redirect_to root_path, alert: "ログインが必要です。"
    end
  end
end