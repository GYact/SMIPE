class PlaylistLocation < ApplicationRecord
  belongs_to :user
  
  validates :name, :uri, :latitude, :longitude, presence: true
  
  validates :latitude, numericality: { 
    greater_than_or_equal_to: -90, 
    less_than_or_equal_to: 90 
  }
  validates :longitude, numericality: { 
    greater_than_or_equal_to: -180, 
    less_than_or_equal_to: 180 
  }
  
  scope :near_location, ->(lat, lng, radius_km = 10) {
    where(
      "6371 * acos(cos(radians(?)) * cos(radians(latitude)) * 
       cos(radians(longitude) - radians(?)) + 
       sin(radians(?)) * sin(radians(latitude))) < ?",
      lat, lng, lat, radius_km
    )
  }
  
  def coordinates
    [latitude, longitude]
  end
end
