class SessionsController < ApplicationController 
  def create 
    raw_data = request.env["omniauth.auth"]

    unless raw_data[:uid] 
      flash[:danger] = "連携に失敗しました" 
      redirect_to root_url and return 
    end 

    # 必要な情報を再構築（credentialsやinfoを保持）
    user_data = {
      uid:   raw_data[:uid],
      name:  raw_data[:info][:name],
      nickname: raw_data[:info][:nickname],
      image: raw_data[:info][:image],
      credentials: {
        token: raw_data[:credentials][:token],
        refresh_token: raw_data[:credentials][:refresh_token],
        expires: raw_data[:credentials][:expires],
        expires_at: raw_data[:credentials][:expires_at]
      },
      info: raw_data[:info]
    }

    user = User.find_by(uid: user_data[:uid]) 

    if user 
      log_in(user) 
      session[:spotify_user_data] = raw_data  # RSpotify用に完全データを保存
      flash[:success] = "ログインしました" 
      redirect_to player_page_path
    else 
      new_user = User.new(
        uid: user_data[:uid],
        name: user_data[:name],
        nickname: user_data[:nickname],
        image: user_data[:image]
      )

      if new_user.save 
        log_in(new_user) 
        session[:spotify_user_data] = raw_data
        flash[:success] = "ユーザー登録成功" 
        redirect_to player_page_path
      else 
        flash[:danger] = "予期せぬエラーが発生しました" 
        redirect_to root_url
      end 
    end 
  end 

  def failure
    error_message = case params[:message]
    when 'invalid_credentials'
      '認証情報が無効です。'
    when 'csrf_detected'
      'セキュリティエラーが発生しました。再度お試しください。'
    else
      '認証に失敗しました。'
    end
    
    flash[:danger] = error_message
    redirect_to root_url
  end

  def destroy 
    log_out if logged_in? 
    session.delete(:spotify_user_data)
    flash[:success] = "ログアウトしました" 
    redirect_to root_url(logged_out: true)
  end 

  def login
    if logged_in?
      redirect_to player_page_path
    else
      render 'static_pages/home'
    end
  end
end