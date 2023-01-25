var pubnub = null;
var user_avatar = "";
const num_avatars = 20;
const num_avatars_to_display = 5;
function loadLogin () {
  sessionStorage.clear();
  if (!testPubNubKeys()) {
    document.getElementById('noKeysAlert').style.display = 'block'
  }

  //  Avatar logic
  var random_array = Array.from({length: num_avatars}, (x, i) => i);
  random_array = shuffle(random_array)
  for (var i = 0; i < num_avatars_to_display; i++) {
    var avatar = document.getElementById('avatar-' + i)
    avatar.src = "./img/avatar/" + ((random_array[i] + 1) + "").padStart(3, '0') + ".png";
    if (i == 0)
    {
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
      nickname = document.getElementById('txtNickname').value;
    })
    setTimeout(setEnableButtonState, 1);
    
}

function shuffle(array) {
  var tmp, current, top = array.length;
  if(top) while(--top) {
    current = Math.floor(Math.random() * (top + 1));
    tmp = array[current];
    array[current] = array[top];
    array[top] = tmp;
  }
  return array;
}

async function login(form) {
    try {
      pubnub = createPubNubObject()
    }
    catch (e) {console.log(e)}
    var nickname = document.getElementById('txtNickname').value;
    var avatarUrl = user_avatar;
    sessionStorage.setItem("nickname", nickname);
    sessionStorage.setItem("avatarUrl", avatarUrl);
    await pubnub.objects.setUUIDMetadata({
      data: {
        name: nickname,
        profileUrl: avatarUrl
      }
    });
    form.submit();
}

function setEnableButtonState()
{
    if (
      document.getElementById('txtNickname').value.length > 0 &&
      document.getElementById('btnLogin').classList.contains('disabled')
    ) {
      //  Enable login button
      document.getElementById('btnLogin').classList.remove('disabled')
    }
}

function selectedAvatar (avatarId, source) {
  user_avatar = source;

  var id = 'avatar-' + avatarId
  var avatar = document.getElementById(id)
  for (var i = 0; i < num_avatars_to_display; i++) {
    var tempId = 'avatar-' + i
    if (tempId != id)
      document.getElementById(tempId).classList.remove('selected-avatar')
  }
  avatar.classList.add('selected-avatar')
}

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


function test()
{
    console.log(sessionStorage.getItem("nickname"));
    console.log(sessionStorage.getItem("userId"));
    console.log(sessionStorage.getItem("avatarUrl"));
}
