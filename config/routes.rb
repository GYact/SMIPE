Rails.application.routes.draw do
  root 'static_pages#home'
  resources :locations, only: [:show, :update]
  get '/auth/:provider/callback', to: 'sessions#create'
  delete '/logout', to: 'sessions#destroy', as: 'logout'
  get 'show', to: 'users#show'
  get "up" => "rails/health#show", as: :rails_health_check
  get '/static_pages/home', to: 'static_pages#home', as: 'static_pages_home'
  get '/player', to: 'player#show', as: 'player_page'
  get 'map', to: 'maps#index'
  get '/login', to: 'sessions#login', as: 'login'
  get 'playlists', to: 'playlists#index'
  get 'playlists/:id/tracks', to: 'playlists#tracks'
  patch 'player/update_selected_playlist', to: 'player#update_selected_playlist'
  resources :playlists, only: [:index] do
    member do
      get :tracks
    end
  end
end