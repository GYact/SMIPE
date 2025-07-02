class CreatePlaylistLocations < ActiveRecord::Migration[8.0]
  def change
    create_table :playlist_locations do |t|
      t.string :name
      t.string :uri
      t.float :latitude
      t.float :longitude
      t.string :location_name
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end
  end
end
