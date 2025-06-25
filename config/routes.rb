Rails.application.routes.draw do
  root 'static_pages#home'
  resources :locations, only: [:show, :update]
  
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
  post 'save_all_playlists', to: 'player#save_all'
  post 'playlists/save', to: 'playlists#save'
  get 'playlist_locations', to: 'player#locations'
end