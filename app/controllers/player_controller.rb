class PlayerController < ApplicationController
  before_action :require_login

  def show
    current_user.refresh_token_if_expired!
    @spotify_user = current_user.to_rspotify_user
    @access_token = @spotify_user.credentials['token']

    @playlists = @spotify_user.playlists
    @all_track_uris = @playlists.flat_map { |p| p.tracks.map(&:uri) }

    @selected_playlist_id = session[:selected_playlist_id] || @playlists.first&.id
    
    first_playlist = @playlists.first
    if first_playlist&.tracks&.any?
      @first_track_uri = first_playlist.tracks.first.uri
    end

    @user_location = current_user.has_location? ? {
      latitude: current_user.latitude,
      longitude: current_user.longitude,
      location_name: current_user.location_name,
      last_updated: current_user.last_location_update,
      is_stale: current_user.location_stale?
    } : nil

  rescue RestClient::BadRequest, NoMethodError
    # トークンのリフレッシュに失敗した場合、再ログインを促す
    log_out
    redirect_to root_path, alert: 'Spotify session expired. Please login again.'
  rescue => e
    Rails.logger.error "RSpotify error: #{e.message}"
    log_out
    flash[:warning] = "Spotifyとの連携に問題が発生しました。再度ログインしてください。"
    redirect_to root_path
  end

  def save
    current_user.refresh_token_if_expired!
    spotify_user = current_user.to_rspotify_user
    playlists = spotify_user.playlists

    playlists.each do |playlist|
      # Using find_or_create_by to avoid duplicates
      pl = current_user.playlists.find_or_create_by(spotify_id: playlist.id)
      pl.update(
        name: playlist.name,
        latitude: current_user.latitude,
        longitude: current_user.longitude
      )
    end

    render json: { status: 'success' }
  rescue => e
    Rails.logger.error "RSpotify error in save: #{e.message}"
    render json: { status: 'error', message: 'Spotifyとの連携に問題が発生しました。' }, status: :unprocessable_entity
  end

  def update_selected_playlist
    if params[:playlist_id].present?
      session[:selected_playlist_id] = params[:playlist_id]
      render json: { status: 'success' }
    else
      render json: { status: 'error', message: 'No playlist selected' }, status: :bad_request
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
    @playlist_locations = PlaylistLocation.includes(:user).order(created_at: :desc)
    render json: @playlist_locations.map { |location|
      {
        id: location.id,
        name: location.name,
        uri: location.uri,
        latitude: location.latitude,
        longitude: location.longitude,
        location_name: location.location_name,
        created_at: location.created_at,
        user_nickname: location.user&.nickname || location.user&.name || "不明なユーザー",
        user_image: location.user&.image
      }
    }
  end

  private

  def require_login
    unless logged_in?
      # For HTML requests, redirect. For JSON, render error.
      respond_to do |format|
        format.html { redirect_to root_path, alert: 'ログインが必要です。' }
        format.json { render json: { error: 'ログインが必要です。' }, status: :unauthorized }
      end
    end
  end
end
