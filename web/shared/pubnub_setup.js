/**
 * Configure the PubNub object.
 * Key configuration is handled in a separate file, keys.js
 */

async function createPubNubObject () {
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
  //  IN PRODUCTION you should use your own backend to deliver a token based on your own ruleset for Access Manager
  var accessManagerToken = await requestAccessManagerToken(UUID);
  if (accessManagerToken == null)
  {
    console.log('Error retrieving access manager token')
  }
  else
  {
    pubnub.setToken(accessManagerToken)
    //  The server that provides the token for this app is configured to grant a time to live (TTL)
    //  of 21600 minutes (i.e. 15 days).  IN PRODUCTION, for security reasons, you should set a value 
    //  between 10 and 60 minutes and refresh the token before it expires.
    //  For simplicity, this app does not refresh the token, so will only run continuously for 15 days.
    developerMessage('The Showcase keyset is protected by Access Manager to control user and channel permissions - this is strongly recommended for all production keysets')
  }
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

//  Access Manager is used to lock down your keyset and only assign permissions to registered users.
//  In production, you would have some kind of log-in server and authentication, then once logged in
//  you can assign permissions based on that user's ID.  Since the showcase does not require authentication
//  to log-in, it is more permissive than a production app would be.
async function requestAccessManagerToken(userId) {
  try{
    const TOKEN_SERVER = 'https://devrel-demos-access-manager.netlify.app/.netlify/functions/api/showcase'
    const response = await fetch(`${TOKEN_SERVER}/grant`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ "UUID": userId })
    });

    const token = (await response.json()).body.token;

    return token;
  }
  catch(e){
    return null;
  }
}
