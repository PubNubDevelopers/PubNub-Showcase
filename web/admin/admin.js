var pubnub = null

function loadAdmin () {
  //  PubNub object
  pubnub = createPubNubObject()
  getUserId()
  getUserMetadata()
  //  todo load other data
}

function getUserId () {
  var userId = pubnub.getUUID()
  document.getElementById('lblUserId').innerHTML = userId
}

async function getUserMetadata () {
  //  todo add try catch around these methods (and other similar methods)
  //
  try {
    const result = await pubnub.objects.getUUIDMetadata({
      uuid: pubnub.getUUID()
    })
    document.getElementById('lblName').innerHTML = result.data.name
    document.getElementById('avatar').src = result.data.profileUrl
  } catch (e) {
    console.log(e)
  }
}

async function logout () {
  console.log('Logging Out')
  const res = await pubnub.objects.removeUUIDMetadata({
    uuid: pubnub.getUUID()
  })
  const channels = await pubnub.objects.getMemberships({
    uuid: pubnub.getUUID()
  })
  var channelArray = []
  for (var i = 0; i < channels.data.length; i++) {
    channelArray.push(channels.data[i].channel.id)
  }
  if (channelArray.length > 0) {
    pubnub.objects.removeMemberships({
      uuid: pubnub.getUUID(),
      channels: channelArray
    })
  }

  location.href = '../index.html'
}

function changeName () {
  console.log('Changing Nickname')
  notImplemented('Changing nickname')
}

