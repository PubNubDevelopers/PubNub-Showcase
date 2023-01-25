
  
  function notImplemented (feature) {
    const toastLiveExample = document.getElementById('liveToast')
    const toastBody = document.getElementById('toast-body')
    toastBody.innerHTML =
      'This feature (' + feature + ') has not yet been implemented'
    const toast = new bootstrap.Toast(toastLiveExample)
    toast.show()
  }