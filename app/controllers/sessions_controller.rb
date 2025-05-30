class SessionsController < ApplicationController
def create
  unless request.env["omniauth.auth"][:uid]
    flash[:danger] = "連携に失敗しました"
    redirect_to root_url and return
  end

  user_data = request.env["omniauth.auth"]
  user = User.find_by(uid: user_data[:uid])

  if user
    update_user_spotify_credentials(user, user_data)
    log_in(user)
    flash[:success] = "ログインしました"
    redirect_to root_url

  else
    new_user = User.new(
      uid:      user_data[:uid],
      nickname: user_data[:info][:nickname],
      name:     user_data[:info][:name],
      image:    user_data[:info][:image]
    )

    if new_user.save
      update_user_spotify_credentials(new_user, user_data)
      log_in(new_user)
      flash[:success] = "ユーザー登録成功"
    else
      flash[:danger] = "予期せぬエラーが発生しました"
    end
    redirect_to root_url
  end
end

private

def update_user_spotify_credentials(user, auth_data)
  spotify_user = RSpotify::User.new(auth_data)
  session[:spotify_user] = spotify_user.to_hash
end

def destroy
  log_out if logged_in?
  flash[:success] = "ログアウトしました"
  redirect_to root_url
end

#ログイン処理
def login
  if logged_in?
    redirect_to player_path
  end
end

end