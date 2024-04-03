const HOST_URL = "https://showcase.pubnub.com/"

/////////////////////////
//  Default Channels

var default_channels = {
  public_channels: [
    {
      channel: 'Public.global',
      name: 'Global (All Users)',
      profileIcon: 'group-global.png',
      description: 'Group containing all users in the chat system'
    },
    {
      channel: 'Public.location-chat',
      name: 'Location Updates',
      profileIcon: 'group-location.png',
      description:
        'Used by the Geolocation demo.  Share your location with the world.  Remember, you can log out to stop your data being publicly visible',
      info: "Populated by the <a href='../geolocation/geolocation.html'>Geo</a> demo"
    },
    {
      channel: 'Public.healthcare',
      name: 'Healthcare',
      profileIcon: 'group-healthcare.png',
      description: 'Build HIPAA-compliant telemedicine apps with PubNub as well as GDPR and SOC2 compliant apps',
      info: "HIPAA & GDPR compliance"
    }
  ]
}

/////////////////////////
//  Emoji logic

function messageInputEmoji () {
  if (document.getElementById('emojiPicker').style.visibility == 'visible')
    document.getElementById('emojiPicker').style.visibility = 'hidden'
  else document.getElementById('emojiPicker').style.visibility = 'visible'
}

function selectEmoji (data) {
  var messageInput = document.getElementById('input-message')
  messageInput.value += data.native
}

function hideEmojiWindow () {
  document.getElementById('emojiPicker').style.visibility = 'hidden'
}

////////////////////////
//  Utilities

async function imageExists (url) {
  return new Promise(function (resolve, success) {
    var img = new Image()
    img.src = url
    img.onerror = () => {
      resolve(false)
    }
    img.onload = () => {
      resolve(img.height != 0)
    }
  })
}

async function testForLoggedInUser () {
  //  Do we have an existing login?
  var savedUUID = null
  try {
    savedUUID = sessionStorage.getItem('userId')
  } catch (err) {
    console.log('Session storage is unavailable')
    alert('This demo requires session storage')
  }
  //  If there is a previous login, check it is still valid
  if (savedUUID != null) {
    try {
      pubnub = await createPubNubObject()
      const userInfo = await pubnub.objects.getUUIDMetadata(savedUUID)
      //  There is a valid user associated with this login
      return true
    } catch (ex) {
      //  There is no PubNub user data associated with the login.
      sessionStorage.clear()
      return false
    }
  } else {
    //  The user has not yet logged in
    return false
  }
  return true
}

var developerMessages = {}

function developerMessage (message) {
  if (developerMessages[message] == null) {
    developerMessages[message] = true
    const style1 =
      'background-color: #0000AA; color: white; font-size: 1em; border:4px solid #0000AA'
    const style2 = ''
    console.info('%cPN Showcase:' + '%c ' + message, style1, style2)
  }
}

function toggleShowcase() {
  document.getElementById('bottomNav').classList.add

  if (document.getElementById('carousel').style.display == 'none') {
      //  Show carousel
      document.getElementById('bottomNav').classList.add('navbar-custom')
      document.getElementById('carousel').style.display = 'block'
      document.getElementById('nav-discover').classList.add('bottom-nav-selected')
  }
  else {
      //  Show carousel
      document.getElementById('bottomNav').classList.remove('navbar-custom')
      document.getElementById('carousel').style.display = 'none'
      document.getElementById('nav-discover').classList.remove('bottom-nav-selected')
  }
}
