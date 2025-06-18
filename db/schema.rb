# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_06_13_081407) do
  create_table "playlist_locations", force: :cascade do |t|
    t.string "name"
    t.string "uri"
    t.float "latitude"
    t.float "longitude"
    t.string "location_name"
    t.integer "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_playlist_locations_on_user_id"
  end

  create_table "playlists", force: :cascade do |t|
    t.integer "user_id", null: false
    t.string "spotify_id"
    t.string "name"
    t.float "latitude"
    t.float "longitude"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_playlists_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "uid"
    t.string "nickname"
    t.string "name"
    t.string "image"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "spotify_uid"
    t.text "spotify_data"
    t.decimal "latitude"
    t.decimal "longitude"
    t.string "location_name"
    t.datetime "last_location_update"
  end

  add_foreign_key "playlist_locations", "users"
  add_foreign_key "playlists", "users"
end
