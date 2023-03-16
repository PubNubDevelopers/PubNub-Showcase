
/**
* - With PubNub you can implement any real-time solution possible.
* - In this code base, we will explore how you would use PubNub to communicate over PubNub Signals with IoT Devices.
* - This file deals with all the sending and receiving of information to and from the devices
*/

//  Connection to the PubNub API
var pubnub = null
// List of IoT Devices and their readings
var iotDevices = null
// Current Values for alarm settings
var alarmSettings = null;
// Current Values for temperature settings
var valueSettings = null;

// Called when navigating away from iot
window.onbeforeunload = function() {
  // Terminate Web Workers
  for(key in iotDevices){
    try{
      iotDevices[key].worker.postMessage({action: 'close'});
    }
    catch(e){
      console.log(e);
    }
  }
};

// Called on page load
async function initialize () {

  // Declarations
  iotDevices = {}
  alarmSettings = {};
  valueSettings = {}

  //  PubNub object - connection with the PubNub infrastructure
  pubnub = createPubNubObject();

  activatePubNubListener(); // Listen to channels device.* for any updates

  //  Subscribing to all possible channels we will want to know about.
  //  Need to know about device.* channel as it will send us updates of sensor readings
  //  Using the recommended naming convention:
  //  Public.<name> for public groups
  //  Private.<name> for private groups
  //  DM.A&B for direct messages between two users
  pubnub.subscribe({channels: ["device.*", `Private.${pubnub.getUUID()}-iot`], withPresence: true}); // Subscribe
}

// Listen to PubNub events (message events, object events)
function activatePubNubListener(){
  pnListener = pubnub.addListener({
    // Status events
    status: async statusEvent => {
      //  Channel subscription is now complete, pre-populate with simulators.
      if (statusEvent.hasOwnProperty('affectedChannels') && statusEvent.affectedChannels[0] === 'device.*') {
        initializeSimulators();
      }
    },
    signal: (payload) => {
      // Signals are used for sensor updates
      SignalReceivedHandler(payload);
    },
    message: (payload) => {
      // An alert is received
      handleMessageHandler(payload);
    }
  });
}

// Consistent updates are received by the IoT devices through signals
// This will handle displaying those changes visibially on the dashboard
function SignalReceivedHandler(payload){
  try{
    if(iotDevices.hasOwnProperty(payload.publisher)){
      iotDevices[payload.publisher].sensorName = payload.message.sensor_type;
      iotDevices[payload.publisher].sensorUnit = payload.message.sensor_units;
      var value = payload.message.sensor_value;
      if(typeof value === "number"){
        iotDevices[payload.publisher].sensorValue = Math.round(
          (payload.message.sensor_value + Number.EPSILON) * 100
        ) / 100;
      }
      else{
        iotDevices[payload.publisher].sensorValue = value;
      }
      updateValue(payload.publisher);
    }
  }
  catch(e){
    console.log(e);
  }
}

// Alerts/Status updates are sent through messages from the IoT Devices
function handleMessageHandler(payload){;
  try{
    var statusBadge = document.getElementById(`deviceStatus${payload.publisher}`);
    if(payload.message.status == Status.Good){
      statusBadge?.setAttribute('class', 'deviceStatusGood');
    }
    else if (payload.message.status == Status.Warning){
      statusBadge?.setAttribute('class', 'deviceStatusWarning');
    }
    else if(payload.message.status == Status.Alert){
      statusBadge?.setAttribute('class', 'deviceStatusError');
    }
    else {
      statusBadge?.setAttribute('class', 'deviceStatusNone');
    }
    handleStatusMessage(payload.message.message, payload.message.status);
  }
  catch(e){
    console.log(e);
  }
}

async function handleStatusMessage(message, status){
  var statusSection = document.getElementById('status-message-section');
  var div = document.createElement('div');
  if(status == Status.Good){
    div.innerHTML = getStatusMessageGoodHTML(message);
  }
  else if (status == Status.Warning){
    div.innerHTML = getStatusMessageWarningHTML(message);
  }
  else if(status == Status.Alert){
    div.innerHTML = getStatusMessageErrorHTML(message);
  }
  statusSection.prepend(div);
  // Animation Duration
  await timeout(5);
  // Remove the Component
  div.remove();
}

function getStatusMessageErrorHTML(message){
  return `<div id="slide" class="status-message status-message-error">
    <div class="status-message-body-wrapper">
        <img class="deviceStatusError icon-layout"></img>
        <p class="text-label status-message-warning-message">${message}</p>
    </div>
  </div>`;
}

function getStatusMessageWarningHTML(message){
  return `<div id="slide" class="status-message status-message-warning">
    <div class="status-message-body-wrapper">
        <img class="deviceStatusWarning icon-layout"></img>
        <p class="text-label status-message-warning-message">${message}</p>
    </div>
  </div>`;
}

function getStatusMessageGoodHTML(message){
  return `<div id="slide" class="status-message status-message-good">
    <div class="status-message-body-wrapper">
        <img class="deviceStatusGood icon-layout"></img>
        <p class="text-label status-message-warning-message">${message}</p>
    </div>
  </div>`;
}

// Slider Functionality

function controlFromInput(fromSlider, fromInput, toInput, controlSlider, deviceId) {
  const [from, to] = getParsed(fromInput, toInput);
  fillSlider(fromInput, toInput, '#22C55E', '#94A3B8', controlSlider);
  var val = 0;
  if (from > to) {
      fromSlider.value = to;
      fromInput.value = to;
      val = to;
  } else {
      fromSlider.value = from;
      val = from;
  }
  setAlarmSettings(from, to, deviceId);
}

function controlToInput(toSlider, fromInput, toInput, controlSlider, deviceId) {
  const [from, to] = getParsed(fromInput, toInput);
  fillSlider(fromInput, toInput, '#22C55E', '#94A3B8', controlSlider);
  var val = 0;
  if (from <= to) {
      toSlider.value = to;
      toInput.value = to;
      val = to;
  } else {
      toInput.value = from;
      val = from;
  }
  setAlarmSettings(from, to, deviceId);
}

function controlFromSlider(fromSlider, toSlider, fromInput, deviceId) {
  const [from, to] = getParsed(fromSlider, toSlider);
  fillSlider(fromSlider, toSlider, '#C6C6C6', '#25daa5', fromSlider);
  var val = 0;
  if (from > to) {
    fromSlider.value = to;
    fromInput.innerHTML = to + '&#176C';
    val = to;
  } else {
    fromInput.innerHTML = from + '&#176C';
    val = from;
  }
  updateRelativePositionOfMinValue(deviceId, val);
  setAlarmSettings(from, to, deviceId);
}

function controlToSlider(fromSlider, toSlider, toInput, deviceId) {
  const [from, to] = getParsed(fromSlider, toSlider);
  fillSlider(fromSlider, toSlider, '#C6C6C6', '#25daa5', fromSlider);
  var val = 0;
  if (from <= to) {
    toSlider.value = to;
    toInput.innerHTML = to + '&#176C';
    val = to;
  } else {
    toInput.innerHTML = from + '&#176C';
    toSlider.value = from;
    val = from;
  }
  console.log("Updating max value");
  updateRelativePositionOfMaxValue(deviceId, val);
  setAlarmSettings(from, to, deviceId);
}

function updateRelativePositionOfMinValue(deviceId, val){
    // Adjust Positioning of min number
    var sliderValue = document.getElementById(`minSliderValue${deviceId}`);
    var diff = iotDevices[deviceId].alarmSettings.upperBound - iotDevices[deviceId].alarmSettings.lowerBound;
    var valDiff = val - iotDevices[deviceId].alarmSettings.lowerBound;
    var percent = valDiff/diff;
    sliderValue.style.left = (percent*100 - 3).toString() + "%";
}

function updateRelativePositionOfMaxValue(deviceId, val){
  // Adjust Positioning of max number
  var sliderValue = document.getElementById(`maxSliderValue${deviceId}`);
  var diff = iotDevices[deviceId].alarmSettings.upperBound - iotDevices[deviceId].alarmSettings.lowerBound;
  var valDiff = val - iotDevices[deviceId].alarmSettings.lowerBound;
  var percent = valDiff/diff;
  sliderValue.style.left = (percent*100 - 3).toString() + "%";
}

function updateRelativePositionOfStaticValue(deviceId, val){
  // Adjust Positioning of number
  var sliderValue = document.getElementById(`sliderValue${deviceId}`);
  var diff = iotDevices[deviceId].alarmSettings.upperBound - iotDevices[deviceId].alarmSettings.lowerBound;
  var valDiff = val - iotDevices[deviceId].alarmSettings.lowerBound;
  var percent = valDiff/diff;
  sliderValue.style.left = (percent*100 - 3).toString() + "%";
}

function updateRelativePositionOfDoorSlider(deviceId, val){
  // Adjust Positioning of number
  var sliderValue = document.getElementById(`sliderValue${deviceId}`);
  var percent = val/100;
  sliderValue.style.left = (percent*100 - 3).toString() + "%";
}

function fillSlider(from, to, sliderColor, rangeColor, controlSlider) {
  const rangeDistance = to.max-to.min;
  const fromPosition = from.value - to.min;
  const toPosition = to.value - to.min;
  controlSlider.style.background = `linear-gradient(
    to right,
    ${sliderColor} 0%,
    ${sliderColor} ${(fromPosition)/(rangeDistance)*100}%,
    ${rangeColor} ${((fromPosition)/(rangeDistance))*100}%,
    ${rangeColor} ${(toPosition)/(rangeDistance)*100}%,
    ${sliderColor} ${(toPosition)/(rangeDistance)*100}%,
    ${sliderColor} 100%)`;
}

function fillSingleSlider(slider, currentValue, sliderColor, rangeColor, newValue){
  const rangeDistance = slider.max-slider.min;
  var toPosition = currentValue - newValue;
  var beforePosition = currentValue < newValue ? Math.abs(currentValue) - Math.abs(slider.min) : Math.abs(newValue) - Math.abs(slider.min);
  var afterPosition = currentValue < newValue ? Math.abs(slider.max) - Math.abs(newValue) : Math.abs(slider.max) - Math.abs(currentValue);
  toPosition = Math.abs(toPosition);
  beforePosition = Math.abs(beforePosition);
  afterPosition = Math.abs(afterPosition);
  var beforePositionPercent = (beforePosition)/(rangeDistance);
  var toPositionPercent = (toPosition)/(rangeDistance);
  var afterPositionPeercent = (afterPosition)/(rangeDistance);
  slider.style.background = `linear-gradient(
    to right,
    ${sliderColor} 0%,
    ${sliderColor} ${beforePositionPercent*100}%,
    ${rangeColor} ${beforePositionPercent*100}%,
    ${rangeColor} ${(toPositionPercent + beforePositionPercent)*100}%,
    ${sliderColor} ${(toPositionPercent + beforePositionPercent)*100}%,
    ${sliderColor} 100%`;
}

function removeFill(controlSlider){
  controlSlider.style.background = '#94A3B8';
}

function getParsed(currentFrom, currentTo) {
  const from = parseInt(currentFrom.value, 10);
  const to = parseInt(currentTo.value, 10);
  return [from, to];
}

function controlSlider(slider, deviceId, isPercent){
  const value = getParsedValue(slider);
  slider.value = value;
  console.log(value);
  document.getElementById(`singleSliderValue${deviceId}`).innerHTML = value + (isPercent ? '%' : '&#176C');
  setValue(value, deviceId);
  fillSingleSlider(slider, iotDevices[deviceId].setValue, '#C6C6C6', '#25daa5', value);
  if(isPercent){
    updateRelativePositionOfDoorSlider(deviceId, value);
  }
  else{
    updateRelativePositionOfStaticValue(deviceId, value);
  }
}

function getParsedValue(currentValue){
  const value = parseInt(currentValue.value, 10);
  return value;
}

// When setting changes are made to the configurations of the continuous IoT devices
function setAlarmSettings(from, to, deviceId){
  alarmSettings[deviceId] = {
    from: from,
    to: to,
  }
  saveButton = document.getElementById(`saveButton${deviceId}`);
  saveButton.classList.remove('disabled');
}

// When setting changes are made to the configurations of the discrete IoT devices
function setValue(value, deviceId){
  valueSettings[deviceId] = value;
  saveButton = document.getElementById(`saveButton${deviceId}`);
  saveButton.classList.remove('disabled');
}

// Communicates with the IoT devices to send the new setting configurations
function saveSettings(deviceId){
  saveButton = document.getElementById(`saveButton${deviceId}`);
  saveButton.classList.add('disabled');
  iotDevices[deviceId].setValue = valueSettings[deviceId];
  try{
    pubnub.publish({
      channel: 'device.' + deviceId,
      message: {
        alarmSettings: alarmSettings[deviceId],
        value: valueSettings[deviceId]
      }
    });
  }
  catch(e){
    console.log("Failed to publish settings");
  }
}

// Communicates with the IoT device to either turn the device off or back on
function changeDeviceState(on, deviceId){
  toggleButtonLabel = document.getElementById(`toggleButtonLabel${deviceId}`);
  toggleButtonLabel.innerHTML = on ? "On" : "Off";
  try{
    pubnub.publish({
      channel: 'device.' + deviceId,
      message: {
        deviceState: on
      }
    });
  }
  catch(e){
    console.log("Failed to publish state");
  }
}

function timeout(s) {
	return new Promise(resolve => setTimeout(resolve, s*1000));
}






