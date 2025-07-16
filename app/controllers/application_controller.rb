class ApplicationController < ActionController::Base
  include SessionsHelper
  before_action :set_spotify_token
  helper_method :current_user, :logged_in?
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.

  private

  def set_spotify_token
    if logged_in? && current_user.access_token.present?
      @access_token = current_user.access_token
    end
  end
end
