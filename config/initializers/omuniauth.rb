# config/initializers/omniauth.rb
Rails.application.config.middleware.use OmniAuth::Builder do
  provider :spotify, ENV['SPOTIFY_CLIENT_ID'], ENV['SPOTIFY_CLIENT_SECRET'],
           scope: 'user-read-private user-read-email playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public streaming user-modify-playback-state user-read-playback-state user-read-currently-playing user-library-read user-library-modify',
           callback_url: ENV['SPOTIFY_CALLBACK_URL']
end
OmniAuth.config.allowed_request_methods = [:post, :get] 