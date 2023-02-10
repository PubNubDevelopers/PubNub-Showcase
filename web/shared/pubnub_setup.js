/**
 * Configure the PubNub object.
 * Key configuration is handled in a separate file, keys.js
 */

function createPubNubObject () {
  var savedUUID = null
  var UUID;
    try {
      savedUUID = sessionStorage.getItem('userId')
    } catch (err) {
      console.log('Session storage is unavailable')
    } //  Session storage not available
    if (!savedUUID) {
      UUID = makeid(20) // Make new UUID
    } else {
      UUID = savedUUID
    }
  try {
    sessionStorage.setItem('userId', UUID)
  } catch (err) {} //  Session storage is not available


  //  Publish and Subscribe keys are retrieved from keys.js
  var pubnub = new PubNub({
    publishKey: publish_key,
    subscribeKey: subscribe_key,
    userId: UUID
  })
  PubNub.prototype.getUserId = function(){return this.getUUID()}
  return pubnub
}

function makeid (length) {
  var result = ''
  var characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

function testPubNubKeys () {
  if (publish_key === '' || subscribe_key === '') return false
  else return true
}
