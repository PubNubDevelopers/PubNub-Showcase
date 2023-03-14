/**
* - This file simulates the IoT devices through different model functions.
* - The device simulators will listen for setting updates through PubNub messages
* - When a PubNub message is received will configure it's settings accordingly and send the new pre-defined signals
* - This file has no relation to the rest or the repo and can be hosted by itself. All communication between this file and the repo is done through PubNub.
* - It can even be hosted on your local host and the demo will still work if the simulation.js is update with the new URL parameter for where it is hosted (Ex: Localhost:8080).
* - For Demo purposes we wanted it to run on your computer without additional set-up which is why there is currently a work around solution
*/


function worker_node(){
  const SensorType = {
    TermostatTemperature: 'Thermostat Temperature',
    AirConditioningTemperature: 'Air Conditioning Temperature',
    FirdgeTemperature: 'Fridge Temperature',
    FreezerTemperature: 'Freezer Temperature',
    WindowAlarm: 'Window Alarm Reading',
    DoorBell: 'Door Bell Reading',
    BabySleep: 'Baby Sleep Comfort'
  }

  const Status = {
    Good: 'Good',
    Warning: 'Warning',
    Alert: 'Alert',
    None: 'None'
  }

  if ('function' === typeof importScripts) {
    const window = null
    importScripts('https://cdn.pubnub.com/sdk/javascript/pubnub.7.0.1.min.js')

    var UUID
    var deviceSimulator
    var deviceChannelName
    var defaultDeviceName
    var id
    var type
    var alarmSettings
    var setValue
    var tick = 0
    var localPubNub

    onmessage = async function (args) {
      //  Initialization / provisioning has been implemented this way to more closely resemble how provisioning will work in production.
      if (args.data.action === 'init') {
        UUID = args.data.params.UUID;
        id = args.data.params.id;
        deviceChannelName = 'device.' + id;
        defaultDeviceName = args.data.params.name;
        type = args.data.params.type;
        alarmSettings = args.data.params.alarmSettings,
        setValue = args.data.params.setValue
        this.postMessage({
          command: 'provisionDevice',
          values: {
            channelName: deviceChannelName,
            deviceId: id,
            type: type,
            deviceName: defaultDeviceName,
            alarmSettings: alarmSettings,
            setValue: setValue
          }
        })
      }
      else if (args.data.action === 'finalizeProvisioning') {
        var subKey = args.data.params.sub
        var pubKey = args.data.params.pub
        var url = args.data.params.url
        localPubNub = new PubNub({
          publishKey: pubKey,
          subscribeKey: subKey,
          uuid: id,
          listenToBrowserNetworkEvents: false //  Allows us to call the PubNub SDK from a web worker
        })

        // Set MetaData and Channel Members for each sim
        await setMetaData(url);

        // Listen for status (provisioning) and message (setting) updates from PubNub
        await localPubNub.addListener({
          status: async () => {
            this.postMessage({
              command: 'provisionComplete',
              values: { deviceId: id }
            })
          },
          message: (payload) => {
            if(payload.message.hasOwnProperty("deviceState")){
              deviceSimulator.updateState(payload.message.deviceState);
            }
            else{
              if(payload.message.hasOwnProperty("alarmSettings")){
                deviceSimulator.updateSettings(payload.message.alarmSettings);
              }
              deviceSimulator.updateValue(payload.message.value);
            }
          }
        });

        // Subscribe to the specific device channel that will warn you when a device needs to be updated
        await localPubNub.subscribe({
          channels: [deviceChannelName],
          withPresence: false
        });

        // Create device simulator
        deviceSimulator = new DeviceSimulator(
          defaultDeviceName,
          type,
          setValue,
          alarmSettings
        )
      }
      else if (args.data.action === 'start') {
        deviceSimulator.start();
      }
      else if (args.data.action === 'close') {
        self.close()
      }
    }
  }

  class DeviceSimulator {
    interval = 5000
    intervalId
    previousSensorStatus = Status.Good;
    sensorStatus = Status.Good;
    value;
    settings = {}
    model = function () {}

    constructor (defaultDeviceName, type, value, alarmSettings) {
      this.deviceName = defaultDeviceName;
      this.sensorType = type;
      this.settings = alarmSettings;
      this.value = value;
      this.setModel(value);
    }

    setModel(value){
      if (this.sensorType === SensorType.FirdgeTemperature) {
        //  Average around a temperature of -5.  Vary by 1 (celsius)
        //  y = 1sin(x) -5
        this.model = function (x) {
          return 2 * Math.sin(x) + value;
        }
        this.units = '&degC';
      }
      else if(this.sensorType === SensorType.FreezerTemperature){
        //  Average around a temperature of -18.  Vary by 1 (celsius)
        //  y = 1sin(x) - 18
        this.model = function (x) {
          return 2 * Math.sin(x) + value;
        }
        this.units = '&degC';
      }
      else if(this.sensorType === SensorType.AirConditioningTemperature){
        //  Average around a temperature of -18.  Vary by 1 (celsius)
        //  y = 1sin(x) - 18
        this.model = function (x) {
          return 2 * Math.sin(x) + value;
        }
        this.units = '&degC';
      }
      else if(this.sensorType === SensorType.TermostatTemperature){
        //  Average around a temperature of 20.  Vary by 1 (celsius)
        //  y = 1sin(x) + 20
        this.model = function (x) {
          return 2 * Math.sin(x) + value;
        }
        this.units = '&degC';
      }
      else if(this.sensorType === SensorType.BabySleep){
        //  Average around a temperature of 20.  Vary by 1 (celsius)
        //  y = 1sin(x) + 20
        this.model = function (x) {
          return 2 * Math.sin(x) + value;
        }
        this.units = '&degC';
      }
      else if(this.sensorType == SensorType.WindowAlarm){
        this.model = function(x){
          var num = Math.floor(Math.random() * 10);
          num += (value - 50)/10;
          if(num < 5){
            return "Window Closed";
          }else{
            return "Window Open";
          }
        }
        this.units = '';
      }
      else if(this.sensorType === SensorType.DoorBell){
        this.model = function(x){
          var num = Math.floor(Math.random() * 10);
          num += (value - 50)/10;
          if(num < 5){
            return "Door Closed";
          }else{
            return "Door Open";
          }
        }
        this.units = '';
      }
    }

    start () {
      this.publishSignal(
        localPubNub,
        deviceChannelName,
        this.model,
        this.units,
      )
      try{
        this.intervalId = setInterval(() => {
          this.publishSignal(
            localPubNub,
            deviceChannelName,
            this.model,
            this.units,
          )
        }, this.interval)
      }
      catch(e){
        console.log(e);
      }
    }

    stop () {
      clearInterval(this.intervalId)
    }

    updateSettings(alarmSettings){
      this.settings = {
        minValue: alarmSettings.from,
        maxValue: alarmSettings.to
      };
    }

    updateState(state){
      try{
        if(state){
          this.setModel(this.value);
        }
        else{
          this.model = function(x){
            return "Off";
          }
        }
        this.publishSignal(
          localPubNub,
          deviceChannelName,
          this.model,
          this.units
        );
      }
      catch(e){
        console.log(e);
      }
    }

    updateValue(value){
      if(this.model(tick) != "Off"){
        this.value = value;
        this.setModel(value);
        this.publishSignal(
          localPubNub,
          deviceChannelName,
          this.model,
          this.units
        );
      }
    }

    publishSignal(
      localPubNub,
      deviceChannelName,
      model,
      sensorUnits,
    ){
      try{
        var sensorValue = model(tick);

        if(this.settings != null){
          if(this.settings != null && (sensorValue > this.settings.maxValue || sensorValue < this.settings.minValue)){
            this.sensorStatus = Status.Alert;
          }
          else if(sensorValue > this.settings.maxValue - 2 || sensorValue < this.settings.minValue + 2){
            this.sensorStatus = Status.Warning;
          }
          else{
            this.sensorStatus = Status.Good
          }
        }
        else{
          if(sensorValue == "Window Open" || sensorValue == "Door Open"){
            this.sensorStatus = Status.Alert;
          }
          else if(sensorValue == "Window Closed" || sensorValue == "Door Closed"){
            this.sensorStatus = Status.Good;
          }
          else{
            this.sensorStatus = Status.None;
          }
        }

        localPubNub.signal({
          channel: deviceChannelName,
          message: {
            sensor_value: sensorValue,
            sensor_units: sensorUnits
          },
        });

        tick++
      }
      catch(e){
        console.log("Failed sending signal");
        console.log(e);
      }


      try{
        if(this.previousSensorStatus != this.sensorStatus){
          this.previousSensorStatus = this.sensorStatus;
          localPubNub.publish({
            channel: `Private.${UUID}-iot`,
            storeInHistory: true,
            message: {
              status: this.sensorStatus,
              message: this.parseMessage(typeof this.settings === 'undefined'),
            }
          });
        }
      }
      catch(e){
        console.log("Failed to Publish Message");
        console.log(e);
      }
    }

    parseMessage(discrete){
      if(!discrete){
        if(this.sensorStatus == Status.Alert && typeof sensorValue !== 'undefined'){
          return `The ${defaultDeviceName} ${sensorValue > this.settings.maxValue ? 'is to warm' : 'is to cold'}`;
        }
        else if(this.sensorStatus == Status.Warning){
          return `The ${defaultDeviceName} is approaching its alert value. Please adjust the temperature!`;
        }
        else{
          return `The ${defaultDeviceName} alert has been resolved!`;
        }
      }
      else{
        if(this.sensorStatus == Status.Alert){
          return `The ${defaultDeviceName} has been set off!`;
        }
        else if(this.sensorStatus == Status.None){
          return `The ${defaultDeviceName} has been turned off!`;
        }
        else{
          return `The ${defaultDeviceName} has been rearmed`;
        }
      }
    }
  }
  // Set the UUID MetaData for the device simulators
  // Set channel members for the IOT Channel in Chat
  async function setMetaData(url){
    try{
      // Create Simulator Metadata
      await localPubNub.objects.setUUIDMetadata({
        data: {
          name: defaultDeviceName,
          profileUrl: url
        }
      });
      await localPubNub.objects.setChannelMembers({
        channel: `Private.${UUID}-iot`,
        uuids: [
          localPubNub.getUUID(),
            {
                id: localPubNub.getUUID(),
                custom: {
                    name: defaultDeviceName,
                    profileUrl: url
                }
            }
          ]
      })
      .catch((err) => {
          console.log(err);
      });
    }
    catch(e){
      console.log("Failed to set sim metadata");
      console.log(e);
    }
  }
}