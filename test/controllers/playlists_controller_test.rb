require "test_helper"

class PlaylistsControllerTest < ActionDispatch::IntegrationTest
  test "should get show" do
    get playlists_show_url
    assert_response :success
  end
end
