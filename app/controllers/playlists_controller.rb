class PlaylistsController < ApplicationController
  def index
    if session[:spotify_user_data]
      @spotify_user = RSpotify::User.new(session[:spotify_user_data])
      @playlists = @spotify_user.playlists
    else
      redirect_to root_path, alert: 'Please login with Spotify first'
    end
  end

  def tracks
    if session[:spotify_user_data]
      begin
        @spotify_user = RSpotify::User.new(session[:spotify_user_data])
        playlist = @spotify_user.playlist(params[:id])
        tracks = playlist.tracks.map do |track|
          {
            name: track.name,
            artists: track.artists.map { |artist| { name: artist.name } }
          }
        end
        render json: tracks
      rescue => e
        Rails.logger.error "Error fetching playlist tracks: #{e.message}"
        render json: { error: 'Failed to load tracks' }, status: :internal_server_error
      end
    else
      render json: { error: 'Please login with Spotify first' }, status: :unauthorized
    end
  end
end 