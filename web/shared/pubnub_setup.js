/**
 * Configure the PubNub object.
 * Key configuration is handled in a separate file, keys.js
 */

var pubnubObjectGranted = false;

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
  });

  var pubnubAdmin = new PubNub({
    publishKey: publish_key,
    subscribeKey: subscribe_key,
    secretKey: "sec-c-ZmVkYmI5ZGEtMzNhNC00NTVmLWFmOWUtNzZkNjMxMmZiMWMx",
    userId: "Admin"
  })

  try{
    if(!pubnubObjectGranted){
      console.log("GRANTING PUBNUB OBJECT");
      console.log(UUID);

      var config = {
        ttl: 15,
        authorized_uuid: "Admin",
        resources: {
          channels: {
            "DM.*": {
              read: true,
              write: true
            },
            "Public.*": {
              read: true,
              write: true
            },
            "Private.*": {
              read: true,
              write: true
            },
            "device.*": {
              read: true,
              write: true
            },
            "GeoChannel": {
              read: true,
              write: true
            }
          },
          uuids: {
            [UUID]: {
              get: true,
              update: true
            }
          }
        }
      };

      console.log(config);

      // Grant permissions
      var token = await pubnubAdmin.grantToken(config);
      console.log("TOKEN");
      console.log(token);
      pubnubObjectGranted = true;
    }
  }
  catch(e){
    console.log(e);
  }
    // .ttl(15)
    // .authorizedUUID(UUID)
    //   .channels(Arrays.asList(
    //     ChannelGrant.name('DM.*').read().write(),
    //     ChannelGrant.name('Public.*').read().write(),
    //     ChannelGrant.name('Private.*').read().write(),
    //     ChannelGrant.name('"device.*"').read().write(),
    //     ChannelGrant.name('GeoChannel').read().write(),
    //     ChannelGrant.pattern("^channel-[A-Za-z0-9]*$").read()
    //   )
    // )
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
