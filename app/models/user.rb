class User < ApplicationRecord

  # 位置情報関連のバリデーション
  validates :latitude, numericality: { 
    greater_than_or_equal_to: -90, 
    less_than_or_equal_to: 90 
  }, allow_nil: true
  validates :longitude, numericality: { 
    greater_than_or_equal_to: -180, 
    less_than_or_equal_to: 180 
  }, allow_nil: true

  # 位置情報関連のスコープ
  scope :with_location, -> { where.not(latitude: nil, longitude: nil) }
  scope :near_location, ->(lat, lng, radius_km = 10) {
    where(
      "6371 * acos(cos(radians(?)) * cos(radians(latitude)) * 
       cos(radians(longitude) - radians(?)) + 
       sin(radians(?)) * sin(radians(latitude))) < ?",
      lat, lng, lat, radius_km
    )
  }

  # 位置情報関連のメソッド
  def has_location?
    latitude.present? && longitude.present?
  end

  def location_coordinates
    return nil unless has_location?
    [latitude, longitude]
  end

  def update_location(lat, lng, location_name = nil)
    update(
      latitude: lat,
      longitude: lng,
      location_name: location_name,
      last_location_update: Time.current
    )
  end

  def location_stale?(hours = 1)
    return true if last_location_update.nil?
    last_location_update < hours.hours.ago
  end

end