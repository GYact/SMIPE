class MapsController < ApplicationController
  before_action :require_login

  def index
    # ユーザーの位置情報を取得
    @user_location = if current_user.has_location?
      {
        latitude: current_user.latitude,
        longitude: current_user.longitude
      }
    else
      # 緯度・経度がnilの場合でも、@user_location自体はハッシュとして存在させる
      # ただし、nilのままroundを呼ばないようにビュー側でnilチェックを強化する
      {
        latitude: nil,
        longitude: nil,
        location_name: nil
      }
    end

    # 緯度経度から住所を取得
    if @user_location[:latitude].present? && @user_location[:longitude].present?
      results = Geocoder.search([@user_location[:latitude], @user_location[:longitude]])
      @user_location[:address] = results.first.address if results.first
    end

    # Spotifyプレイリストの取得
    if logged_in? && current_user.access_token.present?
      begin
        current_user.refresh_token_if_expired!
        @spotify_user = current_user.to_rspotify_user
        @playlists = @spotify_user.playlists.map do |playlist|
          {
            name: playlist.name,
            uri: playlist.uri
          }
        end
      rescue => e
        Rails.logger.error "RSpotify error in maps: #{e.message}"
        @playlists = []
        flash[:warning] = "Spotifyとの連携に問題が発生しました。再度ログインしてください。"
      end
    else
      @playlists = []
      flash[:warning] = "Spotifyとの連携が必要です。"
    end
  end

  private

  def require_login
    unless logged_in?
      respond_to do |format|
        format.html { redirect_to login_path, alert: 'ログインが必要です。' }
        format.json { render json: { error: 'ログインが必要です。' }, status: :unauthorized }
      end
    end
  end
end
