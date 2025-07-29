class PlayerController < ApplicationController
  before_action :require_login

  def show
    # ピンからの遷移時にクエリパラメータでuriが来たらセッションに保存
    if params[:uri].present?
      session[:selected_playlist_uri] = params[:uri]
    end
    current_user.refresh_token_if_expired!
    @spotify_user = current_user.to_rspotify_user
    @access_token = @spotify_user.credentials['token']
    session[:spotify_user_data] ||= {}
    session[:spotify_user_data]['credentials'] ||= {}
    session[:spotify_user_data]['credentials']['token'] = @access_token

    @playlists = @spotify_user.playlists
    @selected_playlist_id = session[:selected_playlist_id]
    @selected_playlist_uri = session[:selected_playlist_uri]

    # 他ユーザープレイリストURIが優先
    if @selected_playlist_uri.present?
      uri_parts = @selected_playlist_uri.split(":")
      if @selected_playlist_uri.start_with?("spotify:user:") && uri_parts.length >= 5
        user_id = uri_parts[2]
        playlist_id = uri_parts[4]
      elsif @selected_playlist_uri.start_with?("spotify:playlist:") && uri_parts.length >= 3
        user_id = nil
        playlist_id = uri_parts[2]
      else
        user_id = nil
        playlist_id = @selected_playlist_id
      end

      begin
        playlist =
          if user_id
            RSpotify::Playlist.find(user_id, playlist_id)
          else
            RSpotify::Playlist.find_by_id(playlist_id)
          end

        if playlist && playlist.tracks.any?
          @first_track = playlist.tracks.first
          @first_track_uri = @first_track.uri
          @all_track_uris = playlist.tracks.map(&:uri)
        else
          @first_track = nil
          @first_track_uri = nil
          @all_track_uris = []
        end
      rescue => e
        Rails.logger.error "他ユーザープレイリスト取得エラー: #{e.message}"
        @first_track = nil
        @first_track_uri = nil
        @all_track_uris = []
      end

    # 自分のプレイリスト選択時
    elsif @selected_playlist_id.present?
      selected_playlist = @playlists.find { |p| p.id == @selected_playlist_id }

      if selected_playlist && selected_playlist.tracks.any?
        @first_track = selected_playlist.tracks.first
        @first_track_uri = @first_track.uri
        @all_track_uris = selected_playlist.tracks.map(&:uri)
      else
        @first_track = nil
        @first_track_uri = nil
        @all_track_uris = []
      end

    # fallback
    else
      first_playlist = @playlists.first
      if first_playlist&.tracks&.any?
        @first_track = first_playlist.tracks.first
        @first_track_uri = @first_track.uri
        @all_track_uris = first_playlist.tracks.map(&:uri)
      else
        @first_track = nil
        @first_track_uri = nil
        @all_track_uris = []
      end
    end

    @user_location = current_user.has_location? ? {
      latitude: current_user.latitude,
      longitude: current_user.longitude,
      location_name: current_user.location_name,
      last_updated: current_user.last_location_update,
      is_stale: current_user.location_stale?
    } : nil

  rescue RestClient::BadRequest, NoMethodError
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
    comment = params[:comment]
    first_track_uri = params[:first_track_uri]
    image = params[:image]

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
        location_name: location_name,
        comment: comment,
        first_track_uri: first_track_uri
      )
      playlist.image.attach(image) if image.present?

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

    playlist_images = {}
    @playlist_locations.each do |location|
      playlist_id = location.uri&.split(':')&.last
      # Spotify APIから直接取得
      begin
        spotify_playlist = RSpotify::Playlist.find_by_id(playlist_id)
        playlist_images[playlist_id] = spotify_playlist&.images&.first&.dig('url') if spotify_playlist&.images&.any?
      rescue => e
        Rails.logger.error "Error fetching playlist image for #{playlist_id}: #{e.message}"
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
        playlist_image: playlist_images[playlist_id],
        comment: location.comment,
        image_url: location.image.attached? ? url_for(location.image) : nil,
        first_track_uri: location.first_track_uri
      }
    }
  end

  # プレイリストに曲を追加（重複チェック付き）
  def add_track_to_playlist
    playlist_id = params[:playlist_id]
    track_uri = params[:track_uri]

    if playlist_id.blank? || track_uri.blank?
      render json: { status: 'error', message: 'パラメータが不足しています。' }, status: :bad_request
      return
    end

    begin
      spotify_user = current_user.to_rspotify_user
      playlist = RSpotify::Playlist.find_by_id(playlist_id)

      existing_uris = playlist.tracks.map(&:uri)
      if existing_uris.include?(track_uri)
        render json: { status: 'duplicate' }, status: :ok
      else
        track = RSpotify::Track.find(track_uri.split(':').last)
        playlist.add_tracks!([track])
        render json: { status: 'added' }, status: :ok
      end
    rescue => e
      Rails.logger.error "エラー: #{e.message}"
      render json: { status: 'error', message: '曲の追加中にエラーが発生しました。' }, status: :internal_server_error
    end
  end

  private

  def require_login
    unless logged_in?
      respond_to do |format|
        format.html { redirect_to root_path, alert: 'ログインが必要です。' }
        format.json { render json: { error: 'ログインが必要です。' }, status: :unauthorized }
      end
    end
  end
end