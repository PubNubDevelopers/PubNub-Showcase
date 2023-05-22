var pubnub = null
var user_avatar = ''
var selectedCustomAvatar = null
var loginModal = null;
const num_avatars = 20
const num_avatars_to_display = 5
const MAX_AVATAR_FILE_SIZE = 1024 * 1024 * 1

async function load () {
  if (!(await testForLoggedInUser()))
  {
    showLogin()
  }

  developerMessage('This demo uses an example UI but your app would use its own UX, invoking the PubNub SDK --> You are NOT locked to a specific UI');
  developerMessage('Your username and avatar URL are stored in PubNub App Context');
}

async function showLogin () {
  if (!testPubNubKeys()) {
    showLoginMsg(
      'Cannot find PubNub keys. Please specify your PubNub keys in keys.js.',
      true,
      false
    )
  } else {
    try {
      pubnub = await createPubNubObject()
    } catch (e) {
      console.log(e)
    }
  }

  document.getElementById('bottomNav').classList.add('blurred')
  document.getElementById('title').classList.add('blurred')
  document.getElementById('showcaseGrid').classList.add('blurred')

  loginModal = new bootstrap.Modal(document.getElementById('loginModal'), {
    keyboard: false,
    backdrop: 'static'
  })
  loginModal.show()

  //  Avatar logic
  var random_array = Array.from({ length: num_avatars }, (x, i) => i)
  random_array = shuffle(random_array)
  for (var i = 0; i < num_avatars_to_display; i++) {
    var avatar = document.getElementById('avatar-' + i)
    avatar.src =
      './img/avatar/' + (random_array[i] + 1 + '').padStart(3, '0') + '.png'
    if (i == 0) {
      selectedAvatar(0, avatar.src)
    }
  }
  document
    .getElementById('txtNickname')
    .addEventListener('keyup', function (e) {
      setEnableButtonState();
    })
  setTimeout(setEnableButtonState, 1)
}

function hideLogin()
{
  document.getElementById('bottomNav').classList.remove('blurred')
  document.getElementById('title').classList.remove('blurred')
  document.getElementById('showcaseGrid').classList.remove('blurred')
  if (loginModal !== null)
  {
    loginModal.hide();
  }
}

function shuffle (array) {
  var tmp,
    current,
    top = array.length
  if (top)
    while (--top) {
      current = Math.floor(Math.random() * (top + 1))
      tmp = array[current]
      array[current] = array[top]
      array[top] = tmp
    }
  return array
}

function setEnableButtonState () {
  if (
    document.getElementById('txtNickname').value.length == 0
  ) {
    //  Disable login button
    document.getElementById('btnLogin').classList.add('disabled')
  }
  else if (!document.getElementById('avatar-5').classList.contains('hidden'))
  {
    //  Enable login button
    document.getElementById('btnLogin').classList.remove('disabled')
  }
  else if (!document.getElementById('imageUploadPane').classList.contains('hidden')) {
    //  Disable login button
    document.getElementById('btnLogin').classList.add('disabled')
  } 
  else if (
    document.getElementById('txtNickname').value.length > 0
  ) {
    //  Enable login button
    document.getElementById('btnLogin').classList.remove('disabled')
  }

}

function selectedAvatar (avatarId, source) {
  user_avatar = source

  var id = 'avatar-' + avatarId
  var avatar = document.getElementById(id)
  for (var i = 0; (i < num_avatars_to_display + 1); i++) {
    var tempId = 'avatar-' + i
    if (tempId != id)
      document.getElementById(tempId).classList.remove('avatar-selected')
  }
  avatar.classList.add('avatar-selected')
}

function selectCustomAvatar () {
  var input = document.createElement('input')
  input.type = 'file'
  input.onchange = async e => {
    selectedCustomAvatar = e.target.files[0]

    if (customAvatarChecks(selectedCustomAvatar)) {
      document.getElementById('imageToUploadName').innerText =
        selectedCustomAvatar.name

      // setting up the reader
      var reader = new FileReader()
      reader.readAsDataURL(selectedCustomAvatar, 'UTF-8')

      reader.onload = readerEvent => {
        var content = readerEvent.target.result // this is the content!
        document.getElementById('imageToUpload').src = '' + content + ''
      }

      document.getElementById('imageUploadPane').classList.remove('hidden')
      document.getElementById('btnUpload').classList.remove('disabled')
      setEnableButtonState()
    }
    else
    {
      selectedCustomAvatar = null;
      cancelSelectedImage();
    }
  }
  input.click()
}

function cancelSelectedImage() {
  document.getElementById('imageUploadPane').classList.add('hidden')
  document.getElementById('btnUpload').classList.add('disabled')
  setEnableButtonState()
}

function customAvatarChecks (avatarFile) {
  if (avatarFile == null) {
    showLoginMsg('You have not chosen a custom avatar file', true, true)
    return false
  } else if (avatarFile.size > MAX_AVATAR_FILE_SIZE) {
    showLoginMsg('Your avatar should be under 1MB', true, true)
    return false
  } else if (
    !(
      avatarFile.type == 'image/png' ||
      avatarFile.type == 'image/jpeg' ||
      avatarFile.type == 'image/gif'
    )
  ) {
    showLoginMsg('Please choose a JPG, PNG or GIF file', true, true)
    return false
  }
  return true
}

async function uploadCustomAvatar () {
  var customAvatar = selectedCustomAvatar
    uploadInProgress(true)
    try {
      //  The image is OK, upload it to PubNub
      const uploadedFile = await pubnub.sendFile({
        channel: 'avatars',
        file: customAvatar
      })
      const fileUrl = await pubnub.getFileUrl({
        channel: 'avatars',
        id: uploadedFile.id,
        name: uploadedFile.name
      })
      //  Upload was successful, test whether we should moderate the image
      //  IN PRODUCTION: You will want to have a PubNub function with event type 'Before Publish File'
      //  Then you can analyse and re-route files which have been moderated to follow up later, or
      //  for archive / record-keeping purposes
      var response = await fetch("https://ps.pndsn.com/v1/blocks/sub-key/" + subscribe_key + "/moderate?" + new URLSearchParams({
          url: fileUrl
        }), {
        method: 'GET'
      })
      if (response.ok)
      {
        //  If response was not ok, the app was probably run against a custom keyset, in which case ignore moderation
        response = await response.text()
        if (response != "okay")
        {
          throw new Error ('Moderation failed')
        }
      }
      
      var avatar = document.getElementById('avatar-5')
      avatar.classList.remove('hidden')
      avatar.src = fileUrl
      selectedAvatar(5, avatar.src)
      setEnableButtonState()
      showLoginMsg("Image upload completed", false, true)
      uploadInProgress(false)
    } catch (err) {
      showLoginMsg('Error uploading custom avatar for moderation.  Try another image', true, true)
      console.log('Error uploading custom avatar: ' + err)
      uploadInProgress(false)
    }
}

function uploadInProgress (inProgress) {
  var spinner = document.getElementById('imageUploadSpinner')
  var imageCancelIcon = document.getElementById('imageUploadCancel')
  if (inProgress) {
    imageCancelIcon.style.display = 'none'
    spinner.style.display = 'inline-block'
  } else {
    imageCancelIcon.style.display = 'flex'
    spinner.style.display = 'none'
  }
}

async function login () {
  var nickname = document.getElementById('txtNickname').value
  var avatarUrl = user_avatar
  sessionStorage.setItem('nickname', nickname)
  sessionStorage.setItem('avatarUrl', avatarUrl)
  const result = await pubnub.objects.setUUIDMetadata({
    data: {
      name: nickname,
      profileUrl: avatarUrl
    }
  })
  hideLogin();
}

function showLoginMsg (msg, isError, shouldFade) {
  document.getElementById('login-message').style.display = 'block'
  if (isError) {
    document
      .getElementById('login-message')
      .classList.add('login-message-error')
    document
      .getElementById('login-message')
      .classList.remove('login-message-success')
    document
      .getElementById('login-message-icon')
      .classList.add('login-message-icon-error')
    document
      .getElementById('login-message-icon')
      .classList.remove('login-message-icon-success')
  } else {
    document
      .getElementById('login-message')
      .classList.remove('login-message-error')
    document
      .getElementById('login-message')
      .classList.add('login-message-success')
    document
      .getElementById('login-message-icon')
      .classList.remove('login-message-icon-error')
    document
      .getElementById('login-message-icon')
      .classList.add('login-message-icon-success')
  }
  document.getElementById('login-message-text').innerText = msg
  if (shouldFade) {
    setTimeout(function () {
      document.getElementById('login-message').style.display = 'none'
    }, 3000)
  }
}

