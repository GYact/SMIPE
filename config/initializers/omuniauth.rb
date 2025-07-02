# config/initializers/omniauth.rb
Rails.application.config.middleware.use OmniAuth::Builder do
  provider :spotify, ENV['SPOTIFY_CLIENT_ID'], ENV['SPOTIFY_CLIENT_SECRET'],
           scope: 'user-read-private user-read-email playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public streaming user-modify-playback-state user-read-playback-state user-read-currently-playing user-library-read user-library-modify',
           callback_url: ENV['SPOTIFY_CALLBACK_URL']
end

# CSRF保護の設定
OmniAuth.config.allowed_request_methods = [:post, :get]

# 開発環境での設定
if Rails.env.development?
  OmniAuth.config.silence_get_warning = true
  OmniAuth.config.full_host = 'http://127.0.0.1:3000'
  
  # CSRF保護を一時的に無効化（開発環境のみ）
  OmniAuth.config.allowed_request_methods = [:get, :post]
  OmniAuth.config.silence_get_warning = true
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