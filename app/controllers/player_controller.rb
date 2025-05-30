class PlayerController < ApplicationController
  before_action :require_login
  
  def show
    @current_track = get_current_playing_track
    @playlists = get_user_playlists
    @queue = get_queue_tracks
  end
  
  def play_track
    track_uri = params[:track_uri]
    if spotify_user&.play!(uris: [track_uri])
      render json: { status: 'success', message: 'Track started playing' }
    else
      render json: { status: 'error', message: 'Failed to play track' }
    end
  end
  
  def pause
    if spotify_user&.pause!
      render json: { status: 'success', message: 'Playback paused' }
    else
      render json: { status: 'error', message: 'Failed to pause' }
    end
  end
  
  def skip
    if spotify_user&.next!
      render json: { status: 'success', message: 'Track skipped' }
    else
      render json: { status: 'error', message: 'Failed to skip' }
    end
  end
  
  private
  
  def spotify_user
    return nil unless session[:spotify_user]
    @spotify_user ||= RSpotify::User.new(session[:spotify_user])
  end
  
  def get_current_playing_track
    return nil unless spotify_user
    spotify_user.currently_playing
  rescue => e
    Rails.logger.error "Error getting current track: #{e.message}"
    nil
  end
  
  def get_user_playlists
    return [] unless spotify_user
    spotify_user.playlists(limit: 10)
  rescue => e
    Rails.logger.error "Error getting playlists: #{e.message}"
    []
  end
  
  def get_queue_tracks
    # Spotify APIではキューの直接取得が制限されているため、
    # 最近再生した曲やおすすめを代わりに表示
    return [] unless spotify_user
    spotify_user.recently_played(limit: 5)
  rescue => e
    Rails.logger.error "Error getting queue: #{e.message}"
    []
  end
  
  def require_login
    unless logged_in?
      flash[:danger] = "ログインが必要です"
      redirect_to root_path
    end
  end
end