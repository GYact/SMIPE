Rails.application.routes.draw do
  root 'static_pages#home'
  get '/auth/:provider/callback', to: 'sessions#create'
  delete '/logout', to: 'sessions#destroy', as: 'logout'
  get 'show', to: 'users#show'
  get "up" => "rails/health#show", as: :rails_health_check
  get '/static_pages/home', to: 'static_pages#home', as: 'static_pages_home'
  get '/player', to: 'player#show', as: 'player'
  
  resource :player, only: [:show] do
    collection do
      post :play_track, as: :play
      post :play_playlist
      post :pause
      post :skip
      get :token
    end
  end

  resources :playlists, only: [:show]
end
