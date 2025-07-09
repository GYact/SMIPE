namespace :users do
  desc "Update user names from Spotify data"
  task update_names: :environment do
    puts "Updating user names..."
    
    User.find_each do |user|
      if user.name.blank? || user.name == user.uid
        # Spotifyからユーザー情報を取得して更新
        begin
          if user.spotify_data.present?
            spotify_user = RSpotify::User.new(user.spotify_data)
            display_name = spotify_user.display_name || spotify_user.id
            user.update(name: display_name)
            puts "Updated user #{user.uid}: #{display_name}"
          else
            puts "No Spotify data for user #{user.uid}"
          end
        rescue => e
          puts "Error updating user #{user.uid}: #{e.message}"
        end
      else
        puts "User #{user.uid} already has name: #{user.name}"
      end
    end
    
    puts "User name update completed!"
  end
end 