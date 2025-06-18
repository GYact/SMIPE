class ChangeTrackToPlaylistInPlaylistSpots < ActiveRecord::Migration[7.1]
  def change
    rename_column :playlist_spots, :spotify_track_id, :spotify_playlist_id
  end
end
