Rails.application.routes.draw do
  # Chrome DevToolsの不要なリクエストを無視する
  get '/.well-known/appspecific/com.chrome.devtools.json', to: ->(env) { [204, {}, []] }

  root 'static_pages#home'
  resources :locations, only: [:show, :update] do
    collection do
      get :reverse_geocode
    end
  end
  
  # OmniAuth routes
  get '/auth/:provider/callback', to: 'sessions#create'
  post '/auth/:provider/callback', to: 'sessions#create'
  get '/auth/failure', to: 'sessions#failure'
  
  delete '/logout', to: 'sessions#destroy', as: 'logout'
  get 'show', to: 'users#show'
  get "up" => "rails/health#show", as: :rails_health_check
  get '/static_pages/home', to: 'static_pages#home', as: 'static_pages_home'
  get '/player', to: 'player#show', as: 'player_page'
  get 'map', to: 'maps#index'
  get '/login', to: 'sessions#login', as: 'login'

  # modelsブランチのルート
  post 'save_playlist', to: 'player#save_playlist'
  post 'playlists/save', to: 'playlists#save'
  get 'playlist_locations', to: 'player#locations'

  # mainブランチのルート
  get 'playlists', to: 'playlists#index'
  get 'playlists/:id/tracks', to: 'playlists#tracks'
  patch 'player/update_selected_playlist', to: 'player#update_selected_playlist'
  resources :playlists, only: [:index] do
    member do
      get :tracks
    end
  end
  post '/player/add_track_to_playlist', to: 'player#add_track_to_playlist'
end