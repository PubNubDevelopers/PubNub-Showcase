
//  Connection to the PubNub API
var pubnub = null
// List of IoT Devices and their readings
var iotDevices = null
// Current Values for alarm settings
var alarmSettings = null;
// Current Values for temperature settings
var valueSettings = null;

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
  pubnub.subscribe({channels: ["device.*", `Private.${pubnub.getUserId()}-iot`], withPresence: true}); // Subscribe
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

function SignalReceivedHandler(payload){
  console.log("SIGNAL RECEIVED");
  try{
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
  }
  catch(e){
    console.log(e);
  }

  updateValue(payload.publisher);
}

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
  }
  catch(e){
    console.log(e);
  }
}

// Slider Functionality

function controlFromInput(fromSlider, fromInput, toInput, controlSlider, deviceId) {
  const [from, to] = getParsed(fromInput, toInput);
  // fillSlider(fromInput, toInput, '#C6C6C6', '#25daa5', controlSlider);
  if (from > to) {
      fromSlider.value = to;
      fromInput.value = to;
  } else {
      fromSlider.value = from;
  }
  setAlarmSettings(from, to, deviceId);
}

function controlToInput(toSlider, fromInput, toInput, controlSlider, deviceId) {
  const [from, to] = getParsed(fromInput, toInput);
  // fillSlider(fromInput, toInput, '#C6C6C6', '#25daa5', controlSlider);
  setToggleAccessible(toInput, fromInput);
  if (from <= to) {
      toSlider.value = to;
      toInput.value = to;
  } else {
      toInput.value = from;
  }
  setAlarmSettings(from, to, deviceId);
}

function controlFromSlider(fromSlider, toSlider, fromInput, deviceId) {
  const [from, to] = getParsed(fromSlider, toSlider);
  if (from > to) {
    fromSlider.value = to;
    fromInput.value = to;
  } else {
    fromInput.value = from;
  }
  setAlarmSettings(from, to, deviceId);
}

function controlToSlider(fromSlider, toSlider, toInput, deviceId) {
  const [from, to] = getParsed(fromSlider, toSlider);
  setToggleAccessible(toSlider, fromSlider);
  if (from <= to) {
    toSlider.value = to;
    toInput.value = to;
  } else {
    toInput.value = from;
    toSlider.value = from;
  }
  setAlarmSettings(from, to, deviceId);
}

function getParsed(currentFrom, currentTo) {
  const from = parseInt(currentFrom.value, 10);
  const to = parseInt(currentTo.value, 10);
  return [from, to];
}

function controlSlider(slider, deviceId){
  const value = getParsedValue(slider);
  slider.value = value;
  document.getElementById(`singleSliderValue${deviceId}`).innerHTML = value;
  setValue(value, deviceId);
}

function getParsedValue(currentValue){
  const value = parseInt(currentValue.value, 10);
  return value;
}

function setToggleAccessible(to, from) {

}

function setAlarmSettings(from, to, deviceId){
  alarmSettings[deviceId] = {
    from: from,
    to: to,
  }
  saveButton = document.getElementById(`saveButton${deviceId}`);
  saveButton.style.visibility = 'visible';
}

function setValue(value, deviceId){
  valueSettings[deviceId] = value;
  saveButton = document.getElementById(`saveButton${deviceId}`);
  saveButton.style.visibility = 'visible';
}

function saveSettings(deviceId){
  saveButton = document.getElementById(`saveButton${deviceId}`);
  saveButton.style.visibility = 'hidden';
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

function changeDeviceState(on, deviceId){
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




