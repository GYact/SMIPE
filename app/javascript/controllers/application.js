import { Application } from "@hotwired/stimulus"
import Swiper from 'swiper';

const application = Application.start()

// Configure Stimulus development experience
application.debug = false
window.Stimulus   = application

export { application }
