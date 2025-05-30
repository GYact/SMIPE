class ApplicationController < ActionController::Base
  include SessionsHelper
  helper_method :current_user, :logged_in?
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern
end
