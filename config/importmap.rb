# Pin npm packages by running ./bin/importmap

pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"

# Pin Swiper from CDN (ES Module version for browsers)
pin "swiper", to: "https://cdn.jsdelivr.net/npm/swiper@11/swiper.esm.browser.min.js"
