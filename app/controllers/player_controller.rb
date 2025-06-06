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
    else
      redirect_to root_path, alert: "Spotifyセッションが無効です。"
  end
end

  private

  def require_login
    redirect_to root_path unless logged_in?
  end
end