require "rspotify"
class StaticPagesController < ApplicationController
  def home
    if logged_in?
      if session[:spotify_user_data]
        redirect_to player_page_path
      else
        # Spotifyセッションがない場合は、ログアウトして再認証を促す
        log_out
        session.delete(:spotify_user_data)
      end
    end
  end
end