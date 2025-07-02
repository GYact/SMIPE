class AddColumnsToPlaylists < ActiveRecord::Migration[8.0]
  def change
    add_column :playlists, :spotify_id, :string
    add_column :playlists, :latitude, :float
    add_column :playlists, :longitude, :float
  end
end
