/**
 * The PubNub streams used in this app are the same streams which power https://www.pubnub.com/demos/real-time-data-streaming/ 
 * IN PRODUCTION:
 * The streams shown in this demo are for demonstration purposes only and should not be used
 * in your production app.
 * For high level information on how to ingest large amounts on data into PubNub and have that data
 * stream to multiple endpoints, please see our 'how-to' guide for Real-time streaming:
 * https://www.pubnub.com/how-to/real-time-streaming-application/
 * For more detail on how to set up a stream, including *very high volume* use cases then
 * please refer to the real-time streaming tutorial:
 * https://www.pubnub.com/tutorials/real-time-data-streaming/
 */

const MAX_LIST_ITEMS = 200
var messageListDiv
var messageListContainer

//  Called on page load
function loadRealTime () {
  messageListDiv = document.getElementById('messageListContents')
  messageListContainer = document.getElementById('messageList')
  //  Unlike the other demos in this showcase application, the Real-time demo uses existing PubNub
  //  data, which is "housed" on different subscribe keys.
  //  Create a new PubNub object for each endpoint that hosts one of our real-time streams (Twitter,
  //  Wikipedia, simulated streams)
  Object.entries(streams).forEach(([key, value]) => {
    streams[key].pubnub = new PubNub({
      userId: 'showcase',
      subscribeKey: value.subKey
    })
    streams[key].pubnub.addListener({
      message: payload => {
        receivedMessage(payload)
      }
    })
  })

  //  Simulated streams is checked by default at launch
  var simulatedStreamsCheck = document.getElementById('sensors')
  streamSelected(simulatedStreamsCheck)
}

//  Handler for when the 'select streams' checkbox is ticked.
//  Streams are stored in a JSON object, keyed on the stream name (twitter, e.t.c.) 
function streamSelected (elem) {
  if (elem.checked) {
    streams[elem.id].pubnub.subscribe({ channels: streams[elem.id].channels })
  } else {
    streams[elem.id].pubnub.unsubscribe({ channels: streams[elem.id].channels })
  }
}

//  Single message to handle any message type.  Since each stream formats their messages slightly 
//  differently, handle each depending on the channel the message was received on.
function receivedMessage (payload) {
  var messageDiv = ''
  if (payload.channel === 'pubnub-market-orders')
    messageDiv = addFormattedMessageMarketOrders(payload)
  else if (payload.channel === 'pubnub-game-state')
    messageDiv = addFormattedMessageGameState(payload)
  else if (payload.channel === 'pubnub-sensor-network')
    messageDiv = addFormattedMessageSensorNetwork(payload)
  else if (payload.channel === 'pubnub-twitter')
    messageDiv = addFormattedMessageTwitter(payload)
  else if (payload.channel === 'pubnub-wikipedia')
    messageDiv = addFormattedMessageWikipedia(payload)

  if (messageDiv == '') return

  if (messageListDiv.children.length >= MAX_LIST_ITEMS) {
    messageListDiv.removeChild(messageListDiv.children[0])
  }
  document.getElementById('messageListContents').appendChild(messageDiv)
  messageListContainer.scrollTop = messageListContainer.scrollHeight
}

//  Received a message from the PubNub instance powered by the Twitter stream
function addFormattedMessageTwitter (payload) {
  if (
    payload == null ||
    payload.message == null ||
    payload.message.user == null ||
    payload.message.place == null
  ) {
    return ''
  }

  var newMsg = document.createElement('div')
  newMsg.className = 'rt-message-container'
  newMsg.innerHTML =
    "<span class='rt-title'><i class='bi bi-twitter'></i> Twitter: </span> <span class='rt-sub-title'>Tweet: </span>" +
    "<b>Text: </b><a href='https://twitter.com/" +
    payload.message.user.screen_name +
    '/status/' +
    payload.message.id_str +
    "'target='new'>" +
    payload.message.text +
    '</a>' +
    //". <span class='rt-sub-title'>Source: </span>" +
    //payload.message.source +
    ". <span class='rt-sub-title'>Tweeted from location: </span>" +
    payload.message.place.country +
    ". <span class='rt-sub-title'>Username: </span>" +
    "<a href='https://twitter.com/" +
    payload.message.user.screen_name +
    "'target='new'>" +
    payload.message.user.screen_name +
    '</a>' +
    ". <span class='rt-sub-title'>profile location: </span>" +
    payload.message.user.location +
    ". <span class='rt-sub-title'>follower count: </span>" +
    payload.message.user.followers_count +
    '</div>'

  return newMsg
}

//  Received a message from the PubNub instance powered by the Wikipedia change stream
function addFormattedMessageWikipedia (payload) {
  var newMsg = document.createElement('div')
  newMsg.className = 'rt-message-container'
  newMsg.innerHTML =
    "<span class='rt-title'><i class='bi bi-wikipedia'></i> Wikipedia: </span> <span class='rt-sub-title'>Event: </span>" +
    payload.message.event +
    ". <span class='rt-sub-title'>Changed item: </span>" +
    payload.message.item +
    ". <span class='rt-sub-title'>Link: </span>" +
    "<a href='" +
    payload.message.link +
    "' target='new'>" +
    payload.message.link +
    '</a>' +
    ". <span class='rt-sub-title'>User: </span>" +
    payload.message.user +
    '</div>'

  return newMsg
}

//  Received a message from the PubNub instance publishing simulated game data
function addFormattedMessageGameState (payload) {
  var newMsg = document.createElement('div')
  newMsg.className = 'rt-message-container'
  newMsg.innerHTML =
    "<span class='rt-title'><i class='bi bi-joystick'></i> Game State: </span> <span class='rt-sub-title'>Action Name: </span>" +
    payload.message.action_name +
    ". <span class='rt-sub-title'>Action Type: </span>" +
    payload.message.action_type +
    ". <span class='rt-sub-title'>Action Value: </span>" +
    payload.message.action_value +
    ". <span class='rt-sub-title'>Coordinates: </span>" +
    '{ x = ' +
    payload.message.coord_x +
    ', y = ' +
    payload.message.coord_y +
    ' }' +
    '</div>'

  return newMsg
}

//  Received a message from the PubNub instance publishing simulated sensor data
function addFormattedMessageSensorNetwork (payload) {
  var newMsg = document.createElement('div')
  newMsg.className = 'rt-message-container'
  newMsg.innerHTML =
    "<span class='rt-title'><i class='bi bi-thermometer-sun'></i> Sensor Network: </span> <span class='rt-sub-title'>Ambient Temperature: </span>" +
    payload.message.ambient_temperature +
    "&#8451;. <span class='rt-sub-title'>Humidity: </span>" +
    payload.message.humidity +
    "%. <span class='rt-sub-title'>Photosensor: </span>" +
    payload.message.photosensor +
    "w/m<sup>2</sup>. <span class='rt-sub-title'>Radiation level: </span>" +
    payload.message.radiation_level +
    " millirads/hr. <span class='rt-sub-title'>Sensor ID: </span>" +
    payload.message.sensor_uuid +
    '</div>'

  return newMsg
}

//  Received a message from the PubNub instance publishing simulated market orders (stock market)
function addFormattedMessageMarketOrders (payload) {
  var newMsg = document.createElement('div')
  newMsg.className = 'rt-message-container'
  newMsg.innerHTML =
    "<span class='rt-title'><i class='bi bi-bank'></i> Market Order: </span> <span class='rt-sub-title'>Stock: </span>" +
    payload.message.symbol +
    ". <span class='rt-sub-title'>Bid Price: </span>" +
    Math.round(payload.message.bid_price * 100) / 100 +
    ". <span class='rt-sub-title'>Order Quantity: </span>" +
    payload.message.order_quantity +
    ". <span class='rt-sub-title'>Trade Type: </span>" +
    payload.message.trade_type +
    '</div>'

  return newMsg
}
