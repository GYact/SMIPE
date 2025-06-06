class LocationsController < ApplicationController
  before_action :require_login

  def update
    if current_user.update_location(
      location_params[:latitude],
      location_params[:longitude],
      location_params[:location_name]
    )
      render json: { 
        status: 'success', 
        location: {
          latitude: current_user.latitude,
          longitude: current_user.longitude,
          location_name: current_user.location_name
        }
      }
    else
      render json: { 
        status: 'error', 
        errors: current_user.errors.full_messages 
      }, status: :unprocessable_entity
    end
  end

  def show
    if current_user&.has_location?
      render json: {
        latitude: current_user.latitude,
        longitude: current_user.longitude,
        location_name: current_user.location_name,
        last_updated: current_user.last_location_update
      }
    else
      render json: { status: 'no_location' }, status: :not_found
    end
  end

  private

  def location_params
    params.require(:location).permit(:latitude, :longitude, :location_name)
  end

  def require_login
    unless logged_in?
      render json: { error: 'Unauthorized' }, status: :unauthorized
    end
  end
end