class PlaylistsController < ApplicationController
  def index
    unless logged_in? && current_user.access_token.present?
      redirect_to root_path, alert: 'Spotifyとの連携が必要です。'
      return
    end

    begin
      current_user.refresh_token_if_expired!
      @spotify_user = current_user.to_rspotify_user
      @playlists = @spotify_user.playlists
    rescue => e
      Rails.logger.error "RSpotify error in playlists index: #{e.message}"
      redirect_to root_path, alert: 'Spotifyとの連携に問題が発生しました。再度ログインしてください。'
    end
  end

  def tracks
    respond_to do |format|
      format.json do
        unless logged_in? && current_user.access_token.present?
          render json: { error: 'Spotify認証情報がありません' }, status: :unauthorized
          return
        end

        begin
          current_user.refresh_token_if_expired!
          user = current_user.to_rspotify_user
          playlist_id = params[:id]
          playlist = user.playlists.find { |pl| pl.id == playlist_id }
          if playlist
            tracks = playlist.tracks.map do |track|
              {
                id: track.id,
                name: track.name,
                artists: track.artists.map(&:name),
                album: {
                  name: track.album.name,
                  images: track.album.images
                },
                uri: track.uri
              }
            end
            render json: tracks
          else
            render json: { error: 'Playlist not found' }, status: :not_found
          end
        rescue => e
          Rails.logger.error "RSpotify error in playlists tracks: #{e.message}"
          render json: { error: e.message }, status: :internal_server_error
        end
      end
    end
  end
end
