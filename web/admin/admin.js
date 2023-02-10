var pubnub = null

function loadAdmin () {
  //  PubNub object
  pubnub = createPubNubObject()
  getUserIdentifier()
  getUserMetadata()
  getUserGroups()
}

function getUserIdentifier () {
  var userId = pubnub.getUserId()
  document.getElementById('lblUserId').innerHTML = userId
}

async function getUserMetadata () {
  try {
    const result = await pubnub.objects.getUUIDMetadata({
      uuid: pubnub.getUserId()
    })
    document.getElementById('lblName').innerHTML = result.data.name
    document.getElementById('avatar').src = result.data.profileUrl
    var d = new Date(result.data.updated)
    document.getElementById('lastModifiedDate').innerHTML =
      d.toLocaleDateString() + ' at ' + d.toLocaleTimeString()
  } catch (e) {
    console.log(e)
  }
}

async function getUserGroups () {
  const publicChannels = await pubnub.objects.getMemberships({
    uuid: pubnub.getUserId(),
    filter: "channel.id LIKE 'Public.*'"
  })
  const privateChannels = await pubnub.objects.getMemberships({
    uuid: pubnub.getUserId(),
    filter: "channel.id LIKE 'Private.*'"
  })
  if (publicChannels != null && publicChannels.data.length > 0) {
    var html = 'Total groups: ' + publicChannels.data.length + "<BR><UL>"
    for (var i = 0; i < publicChannels.data.length; i++) {
      html += "<LI>" + publicChannels.data[i].channel.id
    }
    html+= "</UL>"
    document.getElementById('groupMemberships').innerHTML = html;
  }
  else {
    document.getElementById('groupMemberships').innerHTML = "None"
  }
  if (privateChannels != null && privateChannels.data.length > 0) {
    var html = 'Total groups: ' + privateChannels.data.length + "<BR><UL>"
    for (var i = 0; i < privateChannels.data.length; i++) {
      html += "<LI>" + privateChannels.data[i].channel.id
    }
    html+= "</UL>"
    document.getElementById('groupMembershipsPrivate').innerHTML = html;
  }
  else {
    document.getElementById('groupMembershipsPrivate').innerHTML = "None"
  }
}

async function logout () {
  console.log('Logging Out')
  const res = await pubnub.objects.removeUUIDMetadata({
    uuid: pubnub.getUserId()
  })
  /*
  In production, you might be in a large number of groups and should paginate the response using the page next / prev fields.  
  See the documentation for more information
  */
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
