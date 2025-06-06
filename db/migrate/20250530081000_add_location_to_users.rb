class AddLocationToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :latitude, :decimal
    add_column :users, :longitude, :decimal
    add_column :users, :location_name, :string
    add_column :users, :last_location_update, :datetime
  end
end
