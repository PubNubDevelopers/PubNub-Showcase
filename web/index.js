var pubnub = null
var user_avatar = ''
const num_avatars = 20
const num_avatars_to_display = 5
const MAX_AVATAR_FILE_SIZE = 1024 * 1024 * 1
function loadLogin () {
  sessionStorage.clear()
  if (!testPubNubKeys()) {
    document.getElementById('noKeysAlert').style.display = 'block'
  } else {
    try {
      pubnub = createPubNubObject()
    } catch (e) {
      console.log(e)
    }
  }

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
      nickname = document.getElementById('txtNickname').value
    })
  setTimeout(setEnableButtonState, 1)
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

async function login (form) {
  var nickname = document.getElementById('txtNickname').value
  var avatarUrl = user_avatar
  sessionStorage.setItem('nickname', nickname)
  sessionStorage.setItem('avatarUrl', avatarUrl)
  await pubnub.objects.setUUIDMetadata({
    data: {
      name: nickname,
      profileUrl: avatarUrl
    }
  })
  form.submit()
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
  for (var i = 0; i < num_avatars_to_display; i++) {
    var tempId = 'avatar-' + i
    if (tempId != id)
      document.getElementById(tempId).classList.remove('selected-avatar')
  }
  avatar.classList.add('selected-avatar')
}

async function uploadCustomAvatar () {
  var customAvatar = document.getElementById('customAvatarPicker').files[0]
  if (customAvatarChecks(customAvatar)) {
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
        var avatar = document.getElementById('avatar-0')
        avatar.src = fileUrl
        selectedAvatar(0, avatar.src)
      } else {
        //  The Image moderation function (PubNub function) will delete any image which does not pass moderation
        errorMessage(
          'Image Moderation Failed.  Please select a different image'
        )
      }
      uploadInProgress(false)
    } catch (err) {
      errorMessage('Error uploading custom avatar')
      console.log('Error uploading custom avatar: ' + err)
      uploadInProgress(false)
    }
  }
}

function uploadInProgress(inProgress)
{
  var spinner = document.getElementById('spinner');
  if (inProgress)
  {
    spinner.style.display = 'inline-block'
  }
  else
  {
    spinner.style.display = 'none'
  }
}

function customAvatarChecks (avatarFile) {
  if (avatarFile == null) {
    errorMessage('You have not chosen a custom avatar file')
    return false
  } else if (avatarFile.size > MAX_AVATAR_FILE_SIZE) {
    errorMessage('Your avatar should be under 1MB')
    return false
  } else if (
    !(
      avatarFile.type == 'image/png' ||
      avatarFile.type == 'image/jpeg' ||
      avatarFile.type == 'image/gif'
    )
  ) {
    errorMessage('Please choose a JPG, PNG or GIF file')
    return false
  }
  return true
}


