/*
  * This file contains all the design logic for the single a dual slider.
*/


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
  updateRelativePositionOfMaxValue(deviceId, val);
  setAlarmSettings(from, to, deviceId);
}

function controlSlider(slider, deviceId, isPercent){
  const value = getParsedValue(slider);
  slider.value = value;
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

function getParsedValue(currentValue){
  const value = parseInt(currentValue.value, 10);
  return value;
}