class PlaylistsController < ApplicationController
  def index
    if session[:spotify_user_data]
      auth_data = session[:spotify_user_data]
      @spotify_user = RSpotify::User.new(auth_data)

      # RSpotifyの認証情報を更新
      # これにより、API呼び出しが正しく認証される
      if auth_data['credentials'] && auth_data['credentials']['token']
        RSpotify.authenticate(ENV['SPOTIFY_CLIENT_ID'], ENV['SPOTIFY_CLIENT_SECRET'])
        # credentials = auth_data['credentials']
        # RSpotify.authenticate(credentials['token'], credentials['refresh_token'])
      end

      @playlists = @spotify_user.playlists
    else
      redirect_to root_path, alert: 'Please login with Spotify first'
    end
  end

  def tracks
    respond_to do |format|
      format.json do
        begin
          spotify_user_data = session[:spotify_user_data]
          if spotify_user_data
            user = RSpotify::User.new(spotify_user_data)
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
          else
            render json: { error: 'Spotify認証情報がありません' }, status: :unauthorized
          end
        rescue => e
          render json: { error: e.message }, status: :internal_server_error
        end
      end
    end
  end
end