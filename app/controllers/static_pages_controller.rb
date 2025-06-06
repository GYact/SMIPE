class StaticPagesController < ApplicationController
  def home
    if logged_in?
      redirect_to player_page_path and return
    end
  end
end