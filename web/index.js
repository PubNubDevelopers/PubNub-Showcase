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
}

function showLogin () {
  if (!testPubNubKeys()) {
    showLoginMsg(
      'Cannot find PubNub keys. Please specify your PubNub keys in keys.js.',
      true,
      false
    )
  } else {
    try {
      pubnub = createPubNubObject()
    } catch (e) {
      console.log(e)
    }
  }

  document.getElementById('navbar').classList.add('blurred')
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
      if (
        document.getElementById('txtNickname').value.length == 0 &&
        !document.getElementById('btnLogin').classList.contains('disabled')
      ) {
        //  Disable login button
        document.getElementById('btnLogin').classList.add('disabled')
      } else if (
        document.getElementById('txtNickname').value.length > 0 &&
        document.getElementById('btnLogin').classList.contains('disabled')
      ) {
        //  Enable login button
        document.getElementById('btnLogin').classList.remove('disabled')
      }
    })
  setTimeout(setEnableButtonState, 1)
}

function hideLogin()
{
  document.getElementById('navbar').classList.remove('blurred')
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
    document.getElementById('txtNickname').value.length > 0 &&
    document.getElementById('btnLogin').classList.contains('disabled')
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

      document.getElementById('imageUploadPane').style.display = 'flex'
      document.getElementById('btnUpload').classList.remove('disabled')
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
  document.getElementById('imageUploadPane').style.display = 'none'
  document.getElementById('btnUpload').classList.add('disabled')
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
      if (await imageExists(fileUrl)) {
        //  Upload was successful, replace the first avatar with our custom avatar
        var avatar = document.getElementById('avatar-5')
        avatar.src = fileUrl
        selectedAvatar(5, avatar.src)
      } else {
        //  The Image moderation function (PubNub function) will delete any image which does not pass moderation
        showLoginMsg(
          'Image Moderation Failed.  Please select a different image', true, true
        )
      }
      uploadInProgress(false)
      showLoginMsg("Image upload completed", false, true)
    } catch (err) {
      showLoginMsg('Error uploading custom avatar', true, true)
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
