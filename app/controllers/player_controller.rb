class PlayerController < ApplicationController
  before_action :require_login

  def show
  if session[:spotify_user_data]
    @spotify_user = RSpotify::User.new(session[:spotify_user_data])
      @playlist = @spotify_user.playlists(limit: 1)&.first
      puts "DEBUG: Playlist name = #{@playlist&.name}"
      puts "DEBUG: Playlist id = #{@playlist&.id}"
      if @playlist
        tracks = @playlist.tracks
        puts "DEBUG: Tracks count = #{tracks.size}"
  
        @first_track = tracks.first
        @first_track_uri = @first_track&.uri
        @all_track_uris = tracks.map(&:uri)
      else
        @first_track = nil
        @first_track_uri = nil
        @all_track_uris = []
      end
      @access_token = session[:spotify_user_data]["credentials"]["token"]
    else
      redirect_to root_path, alert: "Spotifyセッションが無効です。"
  end
end

  private

  def require_login
    redirect_to root_path unless logged_in?
  end
end