class SessionsController < ApplicationController 
  def create 
    raw_data = request.env["omniauth.auth"]

    unless raw_data[:uid] 
      flash[:danger] = "連携に失敗しました" 
      redirect_to root_url and return 
    end 

    # 必要な情報だけを抽出
    user_data = {
      uid:   raw_data[:uid],
      name:  raw_data[:info][:name],
      image: raw_data[:info][:image],
      credentials: {
        token: raw_data[:credentials][:token],
        refresh_token: raw_data[:credentials][:refresh_token],
        expires_at: raw_data[:credentials][:expires_at]
        }      
    }

    user = User.find_by(uid: user_data[:uid]) 

    if user 
      log_in(user) 
      session[:spotify_user_data] = user_data
      flash[:success] = "ログインしました" 
      redirect_to player_page_path
    else 
      new_user = User.new(user_data)

      if new_user.save 
        log_in(new_user) 
        session[:spotify_user_data] = user_data
        flash[:success] = "ユーザー登録成功" 
        redirect_to player_page_path
      else 
        flash[:danger] = "予期せぬエラーが発生しました" 
        redirect_to root_url
      end 
    end 
  end 

  def destroy 
    log_out if logged_in? 
    session.delete(:spotify_user_data)
    flash[:success] = "ログアウトしました" 
    redirect_to root_url
  end 

  def login
    if logged_in?
      redirect_to player_page_path
    else
      render 'static_pages/home'
    end
  end
end
