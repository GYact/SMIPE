require "rspotify"
class StaticPagesController < ApplicationController
  def home
    if session[:spotify_user_data]
      access_token = session[:spotify_user_data]["credentials"]["token"]
      user = RSpotify::User.new(session[:spotify_user_data])

      playlists = user.playlists
      if playlists.any?
        first_playlist = playlists.first
        first_track = first_playlist.tracks(limit: 1).first
        @track_uri = first_track.uri if first_track
      end
    end
  end
end