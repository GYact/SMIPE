Rails.application.routes.draw do
  root 'static_pages#home'
  get '/auth/:provider/callback', to: 'sessions#create'
  delete '/logout', to: 'sessions#destroy', as: 'logout'
  get 'show', to: 'users#show'
  get "up" => "rails/health#show", as: :rails_health_check
  get '/static_pages/home', to: 'static_pages#home', as: 'static_pages_home'
  get 'player', to: 'player#show', as: :player_page
end
