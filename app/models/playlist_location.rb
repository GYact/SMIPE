class PlaylistLocation < ApplicationRecord
  belongs_to :user
  validates :name, :uri, :latitude, :longitude, :location_name, presence: true
end
