import { Controller } from "@hotwired/stimulus"
import Swiper from 'swiper';

export default class extends Controller {
  connect() {
    this.swiper = new Swiper(this.element, {
      loop: true,
      speed: 3000,
      autoplay: {
        delay: 1000,
        disableOnInteraction: false,
      },
      slidesPerView: 1,
      spaceBetween: 10,
      touchRatio: 1,
      touchAngle: 45,
      grabCursor: true,
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
      on: {
        slideChange: () => {
          console.log('Slide changed via swipe or navigation');
        }
      }
    });
  }

  disconnect() {
    if (this.swiper && !this.swiper.destroyed) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }
  }

  next() {
    if (this.swiper) {
      this.swiper.slideNext();
    }
  }

  previous() {
    if (this.swiper) {
      this.swiper.slidePrev();
    }
  }
}