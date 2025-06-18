class CreatePlaylistSpots < ActiveRecord::Migration[8.0]
  def change
    create_table :playlist_spots do |t|
      t.references :user, null: false, foreign_key: true
      t.float :latitude
      t.float :longitude
      t.string :spotify_track_id

      t.timestamps
    end
  end
end
