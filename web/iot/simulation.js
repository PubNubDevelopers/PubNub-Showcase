/**
 * Logic related to creating predefined and user-specified simulators.
 */

async function initializeSimulators () {
  var id = 'sim_1' + makeid(6);
  await createSimulator({
    id: id,
    name: 'Refrigerator Temperature',
    type: SensorType.FirdgeTemperature,
    alarmSettings: {
      minValue: -10,
      maxValue: 0,
      lowerBound: -20,
      upperBound: 10
    },
    setValue: -9
  }).then(webWorker => {
    iotDevices[id].worker = webWorker
  });
  iotDevices[id].worker.postMessage({ action: 'start' });

  var id = 'sim_2' + makeid(6);
  await createSimulator({
    id: id,
    name: 'Freezer Temperature',
    type: SensorType.FreezerTemperature,
    alarmSettings: {
      minValue: -23,
      maxValue: -13,
      lowerBound: -30,
      upperBound: 0
    },
    setValue: -18
  }).then(webWorker => {
    iotDevices[id].worker = webWorker
  });
  iotDevices[id].worker.postMessage({ action: 'start' });

  var id = 'sim_3' + makeid(6);
  await createSimulator({
    id: id,
    name: 'Air Conditioning Temperature',
    type: SensorType.AirConditioningTemperature,
    alarmSettings: {
      minValue: 17,
      maxValue: 27,
      lowerBound: 10,
      upperBound: 40,
    },
    setValue: 22
  }).then(webWorker => {
    iotDevices[id].worker = webWorker
  });
  iotDevices[id].worker.postMessage({ action: 'start' });

  var id = 'sim_4' + makeid(6);
  await createSimulator({
    id: id,
    name: 'Thermostat Temperature',
    type: SensorType.TermostatTemperature,
    alarmSettings: {
      minValue: 15,
      maxValue: 25,
      lowerBound: 0,
      upperBound: 35
    },
    setValue: 20
  }).then(webWorker => {
    iotDevices[id].worker = webWorker
  });
  iotDevices[id].worker.postMessage({ action: 'start' });

  var id = 'sim_5' + makeid(6);
  await createSimulator({
    id: id,
    name: 'Baby Crib Temperature',
    type: SensorType.BabySleep,
    alarmSettings: {
      minValue: 11,
      maxValue: 21,
      lowerBound: 0,
      upperBound: 30
    },
    setValue: 16
  }).then(webWorker => {
    iotDevices[id].worker = webWorker
  });
  iotDevices[id].worker.postMessage({ action: 'start' });

  var id = 'sim_6' + makeid(6);
  await createSimulator({
    id: id,
    name: 'Door Alarm',
    type: SensorType.DoorBell,
    setValue: 50
  }).then(webWorker => {
    iotDevices[id].worker = webWorker
  });
  iotDevices[id].worker.postMessage({ action: 'start' });

  var id = 'sim_7' + makeid(6);
  await createSimulator({
    id: id,
    name: 'Window Alarm',
    type: SensorType.WindowAlarm,
    setValue: 50
  }).then(webWorker => {
    iotDevices[id].worker = webWorker
  });
  iotDevices[id].worker.postMessage({ action: 'start' });
}

async function createSimulator (args) {
  return new Promise((resolve, reject) => {
    var simulatorTask = new Worker(URL.createObjectURL(new Blob(["("+worker_node.toString()+")()"], {type: 'text/javascript'})));;

    simulatorTask.onmessage = async function (event) {
      if (event.data.command === 'provisionDevice') {
        //  A NOTE ON PROVISIONING:
        //  Whilst it may seem silly to assign the simulator an ID and then ask the simulator for the ID it was assigned, the intention is to show that these two pieces of information would usually come from a provisioning server, in production.
        var channelName = event.data.values.channelName;
        var deviceId = event.data.values.deviceId;
        var deviceName = event.data.values.deviceName;
        var alarmSettings = event.data.values.hasOwnProperty("alarmSettings") ? event.data.values.alarmSettings : null;
        var setValue = event.data.values.hasOwnProperty("setValue") ? event.data.values.setValue : null;
        if (!iotDevices[deviceId]) {
          iotDevices[deviceId] = {
            online: 'yes',
            selected: false,
            name: deviceName,
            channelName: channelName,
            alarmSettings: alarmSettings,
            setValue: setValue,
            worker: simulatorTask
          }
          // Add Device to HTML
          addRegisteredDevice(deviceId)
        }
        simulatorTask.postMessage({
          action: 'finalizeProvisioning',
          params: { sub: subscribe_key, pub: publish_key}
        })
      }
      else if (event.data.command === 'provisionComplete') {
        var deviceId = event.data.values.deviceId
        resolve(simulatorTask)
      }
    }
    simulatorTask.postMessage({
      action: 'init',
      params: {
        UUID: pubnub.getUUID(),
        id: args.id,
        name: args.name,
        type: args.type,
        alarmSettings: args.alarmSettings,
        setValue: args.setValue
      }
    })
  });
}