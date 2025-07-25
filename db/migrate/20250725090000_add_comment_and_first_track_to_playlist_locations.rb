class AddCommentAndFirstTrackToPlaylistLocations < ActiveRecord::Migration[7.0]
  def change
    add_column :playlist_locations, :comment, :string
    add_column :playlist_locations, :first_track_uri, :string
  end
end
