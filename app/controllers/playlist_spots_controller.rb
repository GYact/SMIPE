class PlaylistSpotsController < ApplicationController
  # CSRFトークン検証をスキップ（APIのため）
  skip_before_action :verify_authenticity_token, only: [:create]

  def index
    @playlist_spots = PlaylistSpot.all
    render json: @playlist_spots
  end

  def create
    # deviseのcurrent_userや自前のsessions_helperのcurrent_userを想定
    # current_userが未ログインの場合のエラーハンドリングが必要
    unless current_user
      render json: { status: 'error', errors: ['ログインが必要です'] }, status: :unauthorized
      return
    end

    @playlist_spot = current_user.playlist_spots.build(playlist_spot_params)

    if @playlist_spot.save
      render json: { status: 'success', playlist_spot: @playlist_spot }, status: :created
    else
      render json: { status: 'error', errors: @playlist_spot.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def playlist_spot_params
    params.require(:playlist_spot).permit(:latitude, :longitude, :spotify_playlist_id)
  end
end
