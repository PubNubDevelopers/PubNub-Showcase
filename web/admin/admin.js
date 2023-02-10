var pubnub = null

function loadAdmin () {
  //  PubNub object
  pubnub = createPubNubObject()
  getUserIdentifier()
  getUserMetadata()
  //  todo load other data
}

function getUserIdentifier () {
  var userId = pubnub.getUserId()
  document.getElementById('lblUserId').innerHTML = userId
}

async function getUserMetadata () {
  //  todo add try catch around these methods (and other similar methods)
  //
  try {
    const result = await pubnub.objects.getUUIDMetadata({
      uuid: pubnub.getUserId()
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
    uuid: pubnub.getUserId()
  })
  const channels = await pubnub.objects.getMemberships({
    uuid: pubnub.getUserId()
  })
  var channelArray = []
  for (var i = 0; i < channels.data.length; i++) {
    channelArray.push(channels.data[i].channel.id)
  }
  if (channelArray.length > 0) {
    pubnub.objects.removeMemberships({
      uuid: pubnub.getUserId(),
      channels: channelArray
    })
  }

  location.href = '../index.html'
}

function changeName () {
  console.log('Changing Nickname')
  notImplemented('Changing nickname')
}

