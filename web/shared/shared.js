function launchApp (app) {
    console.log('launching ' + app)
    if (app === 'chat')
    {
      window.location.href = "./chat/chat.html";
    }
    else if (app === '../chat')
    {
      window.location.href = "../chat/chat.html";
    }
    else {
        notImplemented(app)
    }
  }
  
  function notImplemented (feature) {
    const toastLiveExample = document.getElementById('liveToast')
    const toastBody = document.getElementById('toast-body')
    toastBody.innerHTML =
      'This feature (' + feature + ') has not yet been implemented'
    const toast = new bootstrap.Toast(toastLiveExample)
    toast.show()
  }  