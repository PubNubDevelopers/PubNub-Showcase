function addRegisteredDevice (deviceId) {

  var wrap = document.getElementById('registeredDevicesList');

  if(iotDevices[deviceId].alarmSettings != undefined){
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
    setToggleAccessible(toSlider, fromSlider);
    slider.oninput = () => controlSlider(slider, deviceId);
    fromSlider.oninput = () => controlFromSlider(fromSlider, toSlider, fromInput, deviceId);
    toSlider.oninput = () => controlToSlider(fromSlider, toSlider, toInput, deviceId);
    fromInput.oninput = () => controlFromInput(fromSlider, fromInput, toInput, toSlider, deviceId);
    toInput.oninput = () => controlToInput(toSlider, fromInput, toInput, toSlider, deviceId);

    document.getElementById(`saveButton${deviceId}`).addEventListener("click", () => saveSettings(deviceId));
  }
  else{
    wrap.appendChild(getDiscreteDeviceElement(deviceId));
    const slider = document.getElementById(`singleSlider${deviceId}`);
    slider.oninput = () => controlSlider(slider, deviceId);
    document.getElementById(`saveButton${deviceId}`).addEventListener("click", () => saveSettings(deviceId));
    document.getElementById(`ToggleButton${deviceId}`).addEventListener('change', function(){
      changeDeviceState(document.getElementById(`ToggleButton${deviceId}`).checked, deviceId);
    });
  }
}

function getContinuousDeviceElement(deviceID){
  var section = document.createElement('section');
  section.innerHTML = `
    <div class="container">

    <div class="row d-flex justify-content-center align-items-center h-100">
      <div>

        <div class="card" style="color: #4B515D; border-radius: 35px;">
          <div class="card-body p-4">

            <div class="d-flex">
              <h6 class="flex-grow-1">${iotDevices[deviceID].name}</h6>
              <div class="deviceStatusGood" id="deviceStatus${deviceID}">
                <h4 style="color: white; margin: 3px">&#10003</h4>
              </div>
            </div>

            <div class="d-flex flex-column text-center mt-5 mb-4">
              <h6 class="display-4 mb-0 font-weight-bold" style="color: #1C2331; font-size: 40px" id=${deviceID}> Connecting... </h6>
            </div>
            <div class="col">
              <p>Alarm Setting</p>
              <div class="d-flex align-items-center">
                <div class="flex-grow-1" style="font-size: 1rem;" id="deviceInformation">
                  <div class="range_container">
                    <div class="sliders_control">
                        <input class="fromSlider" id="fromSlider${deviceID}" type="range" value="${iotDevices[deviceID].alarmSettings.minValue}" min="${iotDevices[deviceID].alarmSettings.lowerBound}" max="${iotDevices[deviceID].alarmSettings.upperBound}"/>
                        <input id="toSlider${deviceID}" type="range" value="${iotDevices[deviceID].alarmSettings.maxValue}" min="${iotDevices[deviceID].alarmSettings.lowerBound}" max="${iotDevices[deviceID].alarmSettings.upperBound}"/>
                    </div>
                    <div class="form_control">
                        <div class="form_control_container">
                            <div class="form_control_container__time">Min</div>
                            <input class="form_control_container__time__input" type="number" id="fromInput${deviceID}" value="${iotDevices[deviceID].alarmSettings.minValue}" min="${iotDevices[deviceID].alarmSettings.lowerBound}" max="${iotDevices[deviceID].alarmSettings.upperBound}"/>
                        </div>
                        <div class="form_control_container">
                            <div class="form_control_container__time">Max</div>
                            <input class="form_control_container__time__input" type="number" id="toInput${deviceID}" value="${iotDevices[deviceID].alarmSettings.maxValue}" min="${iotDevices[deviceID].alarmSettings.lowerBound}" max="${iotDevices[deviceID].alarmSettings.upperBound}"/>
                        </div>
                    </div>
                </div>
                <p>Temperature Setting</p>
                <div class="range_container row">
                    <div class="sliders_control">
                        <input type="range" id="singleSlider${deviceID}" value="${iotDevices[deviceID].setValue}" min="${iotDevices[deviceID].alarmSettings.lowerBound}" max="${iotDevices[deviceID].alarmSettings.upperBound}"/>
                    </div>
                    <h3 id="singleSliderValue${deviceID}">${iotDevices[deviceID].setValue}</h3>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="justify-content-end" style="display: flex">
                <div id="saveButton${deviceID}" class="contentBox" style="visibility: hidden">
                  <div id="first" class="buttonBox div_button">
                    <button class="div_button_text">Save</button>
                    <div class="border"></div>
                    <div class="border"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>
  `

  return section;
}

function getDiscreteDeviceElement(deviceID){
  var section = document.createElement('section');
  section.innerHTML = `
    <div class="container">

      <div class="row d-flex justify-content-center align-items-center h-100">
        <div>

          <div class="card" style="color: #4B515D; border-radius: 35px;">
            <div class="card-body">
            <div class="d-flex">
              <h6 class="flex-grow-1">${iotDevices[deviceID].name}</h6>
              <div class="deviceStatusGood" id="deviceStatus${deviceID}">
                <h4 style="color: white; margin: 3px">&#10003</h4>
              </div>
            </div>

            <div class="d-flex flex-column text-center mt-5 mb-4">
              <h6 class="display-4 mb-0 font-weight-bold" style="color: #1C2331; font-size: 40px" id=${deviceID}> Connecting... </h6>
            </div>
            <div class="col">
              <div class="d-flex align-items-center">
                <div class="flex-grow-1" style="font-size: 1rem;" id="deviceInformation">
                  <div class="range_container d-flex flex-row">
                  <h6 style="margin-top: 10px; margin-right: 20px"> ON/OFF </h6>
                    <label class="switch">
                      <input id="ToggleButton${deviceID}" type="checkbox" checked>
                      <span class="slider round"></span>
                    </label>
                  </div>
                </div>
              </div>
              <p>Sensitivity Setting</p>
                <div class="range_container row">
                    <div class="sliders_control">
                        <input type="range" id="singleSlider${deviceID}" value="${iotDevices[deviceID].setValue}" min="0" max="100"/>
                    </div>
                    <h3 id="singleSliderValue${deviceID}">${iotDevices[deviceID].setValue}%</h3>
                </div>
              </div>
              <div class="row">
              <div class="justify-content-end" style="display: flex">
                <div id="saveButton${deviceID}" class="contentBox" style="visibility: hidden">
                  <div id="first" class="buttonBox div_button">
                    <button class="div_button_text">Save</button>
                    <div class="border"></div>
                    <div class="border"></div>
                  </div>
                </div>
              </div>
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
