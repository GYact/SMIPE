class CreatePlaylists < ActiveRecord::Migration[8.0]
  def change
    create_table :playlists do |t|
      t.references :user, null: false, foreign_key: true
      t.string :spotify_id
      t.string :name
      t.float :latitude
      t.float :longitude

      t.timestamps
    end
  end
end
