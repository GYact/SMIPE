class MapsController < ApplicationController
  before_action :require_login
  
  def index
    @user_location = {
      latitude: current_user.latitude || 0,
      longitude: current_user.longitude || 0
    }
  end
  
  private
  
  def require_login
    redirect_to login_path unless logged_in?
  end
end