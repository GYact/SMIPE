require 'rack'

# Railsアプリケーションの読み込み
require_relative '../config/environment'

# RackアプリケーションとしてRailsを実行
run Rails.application 