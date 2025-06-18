require "test_helper"

class PlaylistSpotsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get playlist_spots_index_url
    assert_response :success
  end

  test "should get create" do
    get playlist_spots_create_url
    assert_response :success
  end
end
