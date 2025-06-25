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

      @user_location = current_user.has_location? ? {
        latitude: current_user.latitude,
        longitude: current_user.longitude,
        location_name: current_user.location_name,
        last_updated: current_user.last_location_update,
        is_stale: current_user.location_stale?
      } : nil
    else

      log_out
      session.delete(:spotify_user_data)
      flash[:warning] = "Spotifyとの連携が必要です。再度ログインしてください。"
      redirect_to root_path
    end
  end

  def save
    if session[:spotify_user_data]
      spotify_user = RSpotify::User.new(session[:spotify_user_data])
      playlists = spotify_user.playlists

      playlists.each do |playlist|
        current_user.playlists.create(
          spotify_id: playlist.id,
          name: playlist.name,
          latitude: current_user.latitude,
          longitude: current_user.longitude
        )
      end

      render json: { status: 'success' }
    else
      render json: { status: 'error', message: 'Spotifyセッションが無効です。' }, status: :unauthorized
    end
  end

  def save_playlist
    unless logged_in?
      render json: { status: 'error', message: 'ログインが必要です。' }, status: :unauthorized
      return
    end

    name = params[:name]
    uri = params[:uri]
    latitude = params[:latitude]
    longitude = params[:longitude]
    location_name = params[:location_name]

    if name.blank? || uri.blank?
      render json: { status: 'error', message: 'プレイリスト情報が不足しています。' }, status: :unprocessable_entity
      return
    end

    if latitude.blank? || longitude.blank?
      render json: { status: 'error', message: '位置情報が設定されていません。' }, status: :unprocessable_entity
      return
    end

    begin
      playlist = current_user.playlist_locations.build(
        name: name,
        uri: uri,
        latitude: latitude,
        longitude: longitude,
        location_name: location_name
      )
      
      if playlist.save
        render json: { status: 'success', message: "プレイリスト「#{name}」を保存しました" }
      else
        render json: { 
          status: 'error', 
          message: playlist.errors.full_messages.join(', ') 
        }, status: :unprocessable_entity
      end
    rescue => e
      Rails.logger.error "PlaylistLocation creation error: #{e.message}"
      render json: { status: 'error', message: e.message }, status: :unprocessable_entity
    end
  end

  def locations
    @playlist_locations = current_user.playlist_locations.order(created_at: :desc)
    render json: @playlist_locations
  end

  private

  def require_login
    render json: { error: 'ログインが必要です。' }, status: :unauthorized unless logged_in?
  end
end