
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

var tempDeviceCounter = 0;
var alarmDeviceCounter = 0;

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
  pubnub = await createPubNubObject();

  activatePubNubListener(); // Listen to channels device.* for any updates

  //  Subscribing to all possible channels we will want to know about.
  //  Need to know about device.* channel as it will send us updates of sensor readings
  //  Using the recommended naming convention:
  //  Public.<name> for public groups
  //  Private.<name> for private groups
  //  DM.A&B for direct messages between two users
  pubnub.subscribe({channels: ["device.*", `Private.${pubnub.getUUID()}-iot`]}); // Subscribe

  // Debug Messages
  developerMessage("PubNub is designed to exchange messages at large scale in real-time, so you can even implement a real-time IoT application.");
  developerMessage("This demo uses a combination of Pub/Sub / signal messages to update and send IoT status updates that can be handled on the client-side.");
  developerMessage("IoT Devices can also listen to setting updates using a PubNub message or signal listener.");
}

// Listen to PubNub events (message events, app context events)
function activatePubNubListener(){
  developerMessage('IoT Devices will either send back signals for a status update, or messages when there is an alert with the IoT Device which can be listened to using PubNubs message and signal listener.');
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
function handleMessageHandler(payload){
  try{
    var statusBadge = document.getElementById(`deviceStatus${payload.publisher}`);
    if(payload.message.content.status == Status.Good){
      statusBadge?.setAttribute('class', 'deviceStatusGood');
    }
    else if (payload.message.content.status == Status.Warning){
      statusBadge?.setAttribute('class', 'deviceStatusWarning');
    }
    else if(payload.message.content.status == Status.Alert){
      statusBadge?.setAttribute('class', 'deviceStatusError');
    }
    else {
      statusBadge?.setAttribute('class', 'deviceStatusNone');
    }
    handleStatusMessage(payload.message.content.text, payload.message.content.status);
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
  var marginClass;
  if(message.length < 45){
    marginClass = 'status-message-caption-layout';
  }
  else{
    marginClass = 'status-message-caption-layout-divert'
  }
  return `<div id="slide" class="status-message status-message-error">
    <div class="col status-message-body-layout">
      <div class="status-message-body-wrapper">
          <img class="deviceStatusError icon-layout"></img>
          <p class="text-label status-message-warning-message">${message}</p>
      </div>
      <div class="status-message-caption-layout-wrapper">
        <a href="../chat/chat.html" class="text-caption ${marginClass} status-message-caption-layout-wrapper">see chat demo for details</a>
      </div>
    </div>
  </div>`;
}

function getStatusMessageWarningHTML(message){
  var marginClass;
  if(message.length < 43){
    marginClass = 'status-message-caption-layout';
  }
  else{
    marginClass = 'status-message-caption-layout-divert'
  }
  return `<div id="slide" class="status-message status-message-warning">
    <div class="col status-message-body-layout">
      <div class="status-message-body-wrapper">
          <img class="deviceStatusWarning icon-layout"></img>
          <p class="text-label status-message-warning-message">${message}</p>
      </div>
      <div class="status-message-caption-layout-wrapper">
        <a href="../chat/chat.html" class="text-caption ${marginClass} status-message-caption-layout-wrapper">see chat demo for details</a>
      </div>
    </div>
  </div>`;
}

function getStatusMessageGoodHTML(message){
  var marginClass;
  if(message.length < 45){
    marginClass = 'status-message-caption-layout';
  }
  else{
    marginClass = 'status-message-caption-layout-divert'
  }
  return `<div id="slide" class="status-message status-message-good">
    <div class="col status-message-body-layout">
      <div class="status-message-body-wrapper">
          <img class="deviceStatusGood icon-layout"></img>
          <p class="text-label status-message-warning-message">${message}</p>
      </div>
      <div class="status-message-caption-layout-wrapper">
        <a href="../chat/chat.html" class="text-caption ${marginClass} status-message-caption-layout-wrapper">see chat demo for details</a>
      </div>
    </div>
  </div>`;
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
        content: {
          type: "iotUpdate",
          alarmSettings: alarmSettings[deviceId],
          value: valueSettings[deviceId]
        }
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
        content: {
          type: "iotControl",
          deviceState: on
        }
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






