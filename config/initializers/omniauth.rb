# config/initializers/omniauth.rb
Rails.application.config.middleware.use OmniAuth::Builder do
  provider :spotify, ENV['SPOTIFY_CLIENT_ID'], ENV['SPOTIFY_CLIENT_SECRET'],
           scope: 'user-read-private user-read-email playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public streaming user-modify-playback-state user-read-playback-state user-read-currently-playing user-library-read user-library-modify',
           callback_url: ENV['SPOTIFY_CALLBACK_URL']
end

# 失敗時の処理
OmniAuth.config.on_failure = proc { |env|
  message_key = env['omniauth.error.type']
  error_description = env['omniauth.error']&.error_reason
  new_path = "/auth/failure?message=#{message_key}&error=#{error_description}"
  [302, {'Location' => new_path, 'Content-Type'=> 'text/plain'}, []]
}

# エラーハンドリング
OmniAuth.config.logger = Rails.logger 