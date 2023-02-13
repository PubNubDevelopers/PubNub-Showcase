async function updatePresenceInfoFirstLoad () {
    //  Called when chat window is first loaded, load initial presence state
    //console.log('Update Presence Info: ' + channel)
    try {
      const result = await pubnub.hereNow({
        channels: ['Public.*'],
        includeUUIDs: true,
        includeState: true
      })
      //console.log(result.channels["Public.*"])
      for (var i = 0; i < result.channels['Public.*'].occupancy; i++) {
        handlePresenceEvent('join', result.channels['Public.*'].occupants[i].uuid)
      }
    } catch (status) {
      console.log(status)
    }
  }
  
  function handlePresenceEvent (action, userId) {
    //console.log('Presence: ' + action + ' (' + userId + ')')
    var directChatAvatar = document.getElementById('user-pres-' + userId)
    var memberListAvatar = document.getElementById('member-pres-' + userId)
    if (action == 'join') {
      if (userData[userId] != null) {
        if (userData[userId] != null && userData[userId].presence != 'join') {
          userData[userId].presence = 'join'
          //console.log('user ' + userId + ' has joined')
          if (directChatAvatar != null) {
            directChatAvatar.classList.remove('presence-dot-gray')
            directChatAvatar.classList.add('presence-dot-online')
          }
          if (memberListAvatar != null) {
            memberListAvatar.classList.remove('presence-dot-gray')
            memberListAvatar.classList.add('presence-dot-online')
          }
        }
      }
    } else if (action == 'leave') {
      if (userData[userId] != null) {
        if (userData[userId].presence != 'leave') {
          userData[userId].presence = 'leave'
          //console.log('user ' + userId + ' has left')
          if (directChatAvatar != null) {
            directChatAvatar.classList.remove('presence-dot-online')
            directChatAvatar.classList.add('presence-dot-gray')
          }
          if (memberListAvatar != null) {
            memberListAvatar.classList.remove('presence-dot-online')
            memberListAvatar.classList.add('presence-dot-gray')
          }
        }
      }
    }
  }