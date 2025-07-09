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
    Rails.logger.info "update_selected_playlist called with params: #{params.inspect}"
    
    playlist_id = params[:playlist_id] || params.dig(:playlist, :id)
    playlist_uri = params[:playlist_uri] || params.dig(:playlist, :uri)
    
    if playlist_id.present?
      session[:selected_playlist_id] = playlist_id
      Rails.logger.info "Selected playlist ID: #{playlist_id}"
      render json: { status: 'success', playlist_id: playlist_id }
    elsif playlist_uri.present?
      # URIからIDを抽出
      playlist_id_from_uri = playlist_uri.split(':').last
      session[:selected_playlist_id] = playlist_id_from_uri
      Rails.logger.info "Selected playlist ID from URI: #{playlist_id_from_uri}"
      render json: { status: 'success', playlist_id: playlist_id_from_uri }
    else
      Rails.logger.error "No playlist_id or playlist_uri provided"
      render json: { status: 'error', message: 'プレイリストIDまたはURIが必要です' }, status: :bad_request
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
    
    # デバッグ情報をログに出力
    Rails.logger.info "Playlist locations found: #{@playlist_locations.count}"
    @playlist_locations.each do |location|
      Rails.logger.info "Location: #{location.name}, User: #{location.user&.name || location.user&.nickname || 'Unknown'}"
    end
    
    # Spotify APIから画像URLを取得
    playlist_images = {}
    if logged_in? && current_user.access_token.present?
      begin
        current_user.refresh_token_if_expired!
        spotify_user = current_user.to_rspotify_user
        all_playlists = spotify_user.playlists
        all_playlists.each do |pl|
          playlist_images[pl.id] = pl.images.first['url'] if pl.images&.any?
        end
      rescue => e
        Rails.logger.error "Error fetching playlist images: #{e.message}"
      end
    end
    
    render json: @playlist_locations.map { |location|
      playlist_id = location.uri&.split(':')&.last
      {
        id: location.id,
        name: location.name,
        uri: location.uri,
        latitude: location.latitude,
        longitude: location.longitude,
        location_name: location.location_name,
        created_at: location.created_at,
        user_nickname: location.user&.name || location.user&.nickname || "不明なユーザー",
        user_image: location.user&.image,
        playlist_image: playlist_images[playlist_id]
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