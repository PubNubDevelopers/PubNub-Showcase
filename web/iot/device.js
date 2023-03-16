
// Display the IoT dahsboard element visibilly onto the screen
// Configures two types of devices discrete and continuous with different setting configurations
function addRegisteredDevice (deviceId) {

  // Create Continuous Device Element
  if(iotDevices[deviceId].alarmSettings != undefined){
    var wrap = document.getElementById('registeredDevicesList');
    wrap.appendChild(getContinuousDeviceElement(deviceId));
    alarmSettings[deviceId] = {
      from: iotDevices[deviceId].alarmSettings.minValue,
      to: iotDevices[deviceId].alarmSettings.maxValue,
    }
    valueSettings[deviceId] = iotDevices[deviceId].setValue;
    const slider = document.getElementById(`singleSlider${deviceId}`);
    const fromSlider = document.getElementById(`fromSlider${deviceId}`);
    const toSlider = document.getElementById(`toSlider${deviceId}`);
    const fromInput = document.getElementById(`fromInput${deviceId}`);
    const toInput = document.getElementById(`toInput${deviceId}`);
    slider.oninput = () => controlSlider(slider, deviceId, false);
    fromSlider.oninput = () => controlFromSlider(fromSlider, toSlider, fromInput, deviceId);
    toSlider.oninput = () => controlToSlider(fromSlider, toSlider, toInput, deviceId);
    updateRelativePositionOfMinValue(deviceId, iotDevices[deviceId].alarmSettings.minValue);
    updateRelativePositionOfMaxValue(deviceId, iotDevices[deviceId].alarmSettings.maxValue);
    updateRelativePositionOfStaticValue(deviceId, iotDevices[deviceId].setValue);

    document.getElementById(`saveButton${deviceId}`).addEventListener("click", () => {
      removeFill(slider);
      removeFill(fromSlider);
      saveSettings(deviceId)
    });
  }
  // Create Discrete Device Element
  else{
    var wrap = document.getElementById('registedDeviceListDiscrete');
    wrap.appendChild(getDiscreteDeviceElement(deviceId));
    const slider = document.getElementById(`singleSlider${deviceId}`);
    slider.oninput = () => controlSlider(slider, deviceId, true);
    updateRelativePositionOfDoorSlider(deviceId, iotDevices[deviceId].setValue);
    document.getElementById(`saveButton${deviceId}`).addEventListener("click", () => {
      removeFill(slider);
      saveSettings(deviceId);
    });
    document.getElementById(`ToggleButton${deviceId}`).addEventListener('change', function(){
      changeDeviceState(document.getElementById(`ToggleButton${deviceId}`).checked, deviceId);
    });
  }
}

// Create Continuous IoT Device Dashboard Element through HTML injection
function getContinuousDeviceElement(deviceID){
  var section = document.createElement('section');
  section.innerHTML = `
    <div class='card-wrapper'>
      <div class="row d-flex justify-content-center align-items-center h-100">
        <div>
          <div class="card card-layout">
            <div class="d-flex">
              <h6 class="flex-grow-1 heading-5">${iotDevices[deviceID].name}</h6>
              <div class="deviceStatusGood" id="deviceStatus${deviceID}">

              </div>
            </div>

            <div class="d-flex flex-column text-center measurement-heading-layout">
              <h6 class="heading-2" id=${deviceID}> Connecting... </h6>
            </div>
            <div class="col">
              <p class="text-label">Alert Setting</p>
              <div class="d-flex align-items-center">
                <div class="flex-grow-1" style="font-size: 1rem;" id="deviceInformation">
                  <div class="range_container">
                    <div id="minSliderValue${deviceID}" class="sliderValue">
                      <span class="text-label" id="fromInput${deviceID}">${iotDevices[deviceID].alarmSettings.minValue}&#176C</span>
                    </div>
                    <div id="maxSliderValue${deviceID}" class="sliderValue">
                      <span class="text-label" id="toInput${deviceID}">${iotDevices[deviceID].alarmSettings.maxValue}&#176C</span>
                    </div>
                    <div class="sliders_control">
                        <input class="fromSlider" id="fromSlider${deviceID}" type="range" value="${iotDevices[deviceID].alarmSettings.minValue}" min="${iotDevices[deviceID].alarmSettings.lowerBound}" max="${iotDevices[deviceID].alarmSettings.upperBound}">
                        <input class="toSlider" id="toSlider${deviceID}" type="range" value="${iotDevices[deviceID].alarmSettings.maxValue}" min="${iotDevices[deviceID].alarmSettings.lowerBound}" max="${iotDevices[deviceID].alarmSettings.upperBound}"/>
                    </div>
                </div>
                <p class="text-label">Temperature Setting</p>
                <div class="flex-grow-1" id="deviceInformation">
                  <div class="range_container temp_layout">
                      <div id="sliderValue${deviceID}" class="sliderValue">
                        <span class="text-label" id="singleSliderValue${deviceID}">${iotDevices[deviceID].setValue}&#176C</span>
                      </div>
                      <div class="sliders_control">
                          <input class="fromSlider" type="range" id="singleSlider${deviceID}" value="${iotDevices[deviceID].setValue}" min="${iotDevices[deviceID].alarmSettings.lowerBound}" max="${iotDevices[deviceID].alarmSettings.upperBound}"/>
                      </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="row">
              <div id="saveButton${deviceID}" class="save-settings-layout pn-btn disabled">
                <p class="save-settings-label-layout">Save</p>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  `

  return section;
}

// Create Discrete IoT Device Dashboard Element through HTML injection
function getDiscreteDeviceElement(deviceID){
  var section = document.createElement('section');
  section.innerHTML = `
    <div class='card-wrapper'>

      <div class="row d-flex justify-content-center align-items-center h-100">
        <div>

          <div class="card card-layout">
            <div class="d-flex">
              <h6 class="flex-grow-1 heading-5">${iotDevices[deviceID].name}</h6>
              <div class="deviceStatusGood" id="deviceStatus${deviceID}">
              </div>
            </div>

            <div class="d-flex flex-column text-center mt-5 mb-4">
              <h6 class="heading-2" id=${deviceID}> Connecting... </h6>
            </div>
            <div class="col">
              <div class="d-flex align-items-center">
                <div class="flex-grow-1" style="font-size: 1rem;" id="deviceInformation">
                  <div class="range_container d-flex flex-row override_margins_range_container align_button_toggle_center">
                    <label class="switch">
                      <input id="ToggleButton${deviceID}" type="checkbox" checked>
                      <span class="slider round"></span>
                    </label>
                    <h6 id="toggleButtonLabel${deviceID}" class="toggle-button-label-layout text-body-2"> On </h6>
                  </div>
                </div>
              </div>
              <p class="text-label">Sensitivity Setting</p>
                <div class="range_container temp_layout">
                  <div id="sliderValue${deviceID}" class="sliderValue">
                    <span class="text-label" id="singleSliderValue${deviceID}">${iotDevices[deviceID].setValue}%</span>
                  </div>
                  <div class="sliders_control">
                      <input class='fromSlider' type="range" id="singleSlider${deviceID}" value="${iotDevices[deviceID].setValue}" min="0" max="100"/>
                  </div>
                </div>
              </div>
              <div class="row">
                <div id="saveButton${deviceID}" class="save-settings-layout pn-btn disabled">
                  <p class="save-settings-label-layout">Save</p>
                </div>
            </div>
        </div>
      </div>
  `

  return section;
}

function updateValue(deviceId){
  var div = document.getElementById(deviceId);
  div.innerHTML = iotDevices[deviceId].sensorValue + iotDevices[deviceId].sensorUnit;
}
