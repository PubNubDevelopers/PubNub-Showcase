/*
  Template file for the loading card.
  This file contains the HTML element largeCardTemplate and smallCardTemplate for when the IoT card is connecting.
*/

const largeCardTemplate = document.createElement('template');
const smallCardTemplate = document.createElement('template');
largeCardTemplate.innerHTML = `<div class='card-wrapper'>
      <div class="row d-flex justify-content-center align-items-center h-100">
          <div>
              <div class="card card-layout">
                  <div class="d-flex card__heading__height">
                      <div class="flex-grow-1 heading-5">
                        <div class="card__content card__content__heading"></div>
                      </div>
                      <div class="deviceStatusNone" id="deviceStatus">
                  </div>
              </div>
              <div class="d-flex flex-column text-center measurement-heading-layout">
                  <h6 class="heading-2"> Connecting... </h6>
              </div>
              <div class="col">
              <div class="card__content card__content__sliding__heading"></div>
                  <div class="d-flex align-items-center">
                      <div class="flex-grow-1" style="font-size: 1rem;" id="deviceInformation">
                      <div class="range_container">
                          <div id="minSliderValue" class="sliderValue">
                              <span class="text-label" id="fromInput"></span>
                          </div>
                          <div id="maxSliderValue" class="sliderValue">
                              <span class="text-label" id="toInput"></span>
                          </div>
                          <div class="sliders_control">
                              <input class="fromSlider" id="fromSlider" type="range" value="" min="" max="">
                              <input class="toSlider" id="toSlider" type="range" value="" min="" max=""/>
                          </div>
                      </div>
                      <div class="card__content card__content__sliding__heading"></div>
                      <div class="flex-grow-1" id="deviceInformation">
                      <div class="range_container temp_layout">
                          <div id="sliderValue" class="sliderValue">
                              <span class="text-label" id="singleSliderValue"></span>
                          </div>
                          <div class="sliders_control">
                              <input class="fromSlider" type="range" id="singleSlider" value="" min="" max=""/>
                          </div>
                      </div>
                      </div>
                  </div>
                  </div>
                  <div class="row">
                      <div id="saveButton" class="save-settings-layout pn-btn disabled save-button-layout-loading">
                          <p class="save-settings-label-layout">Save</p>
                      </div>
                  </div>
              </div>
          </div>
      </div>
      </div>

  </div>`

smallCardTemplate.innerHTML = `<div class='card-wrapper'>
  <div class="row d-flex justify-content-center align-items-center h-100">
    <div>

      <div class="card card-layout">
        <div class="d-flex">
          <h6 class="flex-grow-1 heading-5"></h6>
          <div class="deviceStatusNone" id="deviceStatus">
          </div>
        </div>

        <div class="d-flex flex-column text-center mt-5 mb-4">
          <h6 class="heading-2"> Connecting... </h6>
        </div>
        <div class="col">
          <div class="d-flex align-items-center">
            <div class="flex-grow-1" style="font-size: 1rem;" id="deviceInformation">
              <div class="range_container d-flex flex-row override_margins_range_container align_button_toggle_center">
                <label class="switch">
                  <span class="slider round"></span>
                </label>
              </div>
            </div>
          </div>
          <div class="card__content card__content__sliding__heading"></div>
            <div class="range_container temp_layout">
              <div id="sliderValue" class="sliderValue">
                <span class="text-label" id="singleSliderValue"></span>
              </div>
              <div class="sliders_control">
                  <input class='fromSlider' type="range" id="singleSlider" value="" min="0" max="100"/>
              </div>
            </div>
          </div>
          <div class="row">
            <div id="saveButton" class="save-settings-layout pn-btn disabled">
              <p class="save-settings-label-layout">Save</p>
            </div>
        </div>
    </div>
  </div>`

class LoadingCardLarge extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = largeCardTemplate.innerHTML;
  }
}

class LoadingCardSmall extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = smallCardTemplate.innerHTML;
  }
}

customElements.define("loading-card-small", LoadingCardSmall);
customElements.define("loading-card-large", LoadingCardLarge);