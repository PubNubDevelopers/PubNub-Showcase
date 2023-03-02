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



async function testForLoggedInUser() {
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
      pubnub = createPubNubObject()
      const userInfo = await pubnub.objects.getUUIDMetadata(savedUUID)
      //  There is a valid user associated with this login
      return true
    } catch (ex) {
      //  There is no PubNub user data associated with the login.
      sessionStorage.clear();
      return false;
    }
  } else {
    //  The user has not yet logged in
    return false
  }
  return true
}
