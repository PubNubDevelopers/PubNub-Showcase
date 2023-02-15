function launchApp (app) {
    console.log('launching ' + app)
    if (app === 'chat')
    {
      window.location.href = "./chat/chat.html";
    }
    else if(app === 'geolocation'){
      window.location.href = "../geolocation/geolocation.html";
    }
    else if (app === '../chat')
    {
      window.location.href = "../chat/chat.html";
    }
    else {
        notImplemented(app)
    }
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

function errorMessage (message) {
  const toastLiveExample = document.getElementById('liveToast')
  const toastBody = document.getElementById('toast-body')
  toastBody.innerHTML = message
  const toast = new bootstrap.Toast(toastLiveExample)
  toast.show()
}
