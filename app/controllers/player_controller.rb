class PlayerController < ApplicationController
  before_action :require_login

  def show
    if session[:spotify_user_data]
      begin
        spotify_user_data = {
          'credentials' => {
            'token' => session[:spotify_user_data]['credentials']['token'],
            'refresh_token' => session[:spotify_user_data]['credentials']['refresh_token'],
            'expires' => session[:spotify_user_data]['credentials']['expires'],
            'expires_at' => session[:spotify_user_data]['credentials']['expires_at']
          },
          'id' => session[:spotify_user_data]['uid'],
          'info' => session[:spotify_user_data]['info']
        }

        @spotify_user = RSpotify::User.new(spotify_user_data)
        @playlists = @spotify_user.playlists
        @all_track_uris = []
        @playlists.each do |playlist|
          tracks = playlist.tracks
          @all_track_uris.concat(tracks.map(&:uri))
        end

        @selected_playlist_id = session[:selected_playlist_id] || @playlists.first&.id

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
      rescue => e
        Rails.logger.error "RSpotify error: #{e.message}"
        log_out
        session.delete(:spotify_user_data)
        flash[:warning] = "Spotifyとの連携に問題が発生しました。再度ログインしてください。"
        redirect_to root_path
      end
    else
      log_out
      session.delete(:spotify_user_data)
      flash[:warning] = "Spotifyとの連携が必要です。再度ログインしてください。"
      redirect_to root_path
    end
  end

  def save
    if session[:spotify_user_data]
      begin
        spotify_user_data = {
          'credentials' => {
            'token' => session[:spotify_user_data]['credentials']['token'],
            'refresh_token' => session[:spotify_user_data]['credentials']['refresh_token'],
            'expires' => session[:spotify_user_data]['credentials']['expires'],
            'expires_at' => session[:spotify_user_data]['credentials']['expires_at']
          },
          'id' => session[:spotify_user_data]['uid'],
          'info' => session[:spotify_user_data]['info']
        }

        spotify_user = RSpotify::User.new(spotify_user_data)
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
      rescue => e
        Rails.logger.error "RSpotify error in save: #{e.message}"
        render json: { status: 'error', message: 'Spotifyとの連携に問題が発生しました。' }, status: :unprocessable_entity
      end
    else
      render json: { status: 'error', message: 'Spotifyセッションが無効です。' }, status: :unauthorized
    end
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
      render json: { error: 'ログインが必要です。' }, status: :unauthorized
    end
  end
end