class PlaylistsController < ApplicationController
  before_action :require_login
  before_action :set_spotify_user

  def show
    playlist_id = params[:id]
    begin
      @playlist = RSpotify::Playlist.find(@spotify_user.id, playlist_id)
      # RSpotify::Playlist.find はユーザーIDを第一引数に取る場合と取らない場合があるため、
      # APIのバージョンや状況によって使い分けが必要なことがあります。
      # もし上記でうまく取得できない場合は、単に RSpotify::Playlist.find(playlist_id) を試してください。
      # ただし、ユーザーに紐づくプライベートプレイリストの場合はユーザーIDが必要になることが多いです。

      @tracks = @playlist.tracks(limit: 50) # 表示するトラック数を制限 (必要に応じて調整)
      # 全トラックを取得する場合は @playlist.all_tracks やループ処理が必要
    rescue RestClient::NotFound
      flash[:danger] = "指定されたプレイリストが見つかりませんでした。"
      redirect_to player_path
    rescue => e
      Rails.logger.error "Error fetching playlist details: #{e.message}"
      flash[:danger] = "プレイリストの読み込み中にエラーが発生しました。"
      redirect_to player_path
    end
  end

  private

  def set_spotify_user
    unless session[:spotify_user]
      flash[:danger] = "Spotifyとの連携が切れている可能性があります。再度ログインしてください。"
      redirect_to root_path
      return
    end
    @spotify_user = RSpotify::User.new(session[:spotify_user])
  end

  def require_login
    unless logged_in?
      flash[:danger] = "ログインが必要です"
      redirect_to root_path
    end
  end
end
