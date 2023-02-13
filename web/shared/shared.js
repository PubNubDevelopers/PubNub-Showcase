function launchApp (app) {
  console.log('launching ' + app)
  if (app === 'chat') {
    window.location.href = './chat/chat.html'
  } else if (app === '../chat') {
    window.location.href = '../chat/chat.html'
  } else if (app === 'virtual_events') {
    window.location.href = '../virtual-events/virtual-events.html'
  } else {
    notImplemented(app)
  }
}

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

function notImplemented (feature) {
  const toastLiveExample = document.getElementById('liveToast')
  const toastBody = document.getElementById('toast-body')
  toastBody.innerHTML =
    'This feature (' + feature + ') has not yet been implemented'
  const toast = new bootstrap.Toast(toastLiveExample)
  toast.show()
}

function errorMessage (message) {
  const toastLiveExample = document.getElementById('liveToast')
  const toastBody = document.getElementById('toast-body')
  toastBody.innerHTML = message
  const toast = new bootstrap.Toast(toastLiveExample)
  toast.show()
}
