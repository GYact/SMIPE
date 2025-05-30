class User < ApplicationRecord
  def spotify_user
    return nil unless uid
    @spotify_user ||= RSpotify::User.find(uid)
  end
  
  def spotify_player
    return nil unless spotify_user
    @spotify_player ||= spotify_user
  end
end
