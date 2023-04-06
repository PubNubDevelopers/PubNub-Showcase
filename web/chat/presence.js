/**
 * This file contains the logic for monitoring whether other users are online or offline.
 * For notes about transitioningbetween this demo and a production app, see chat.js.
 */

//  Using the pubnub.hereNow() function, determine who is present in the Public groups.
//  Private groups are not necessary for this app since they only handle IOT updates, though
//  in a production app, with private groups, will also want to update the presence for those.
//  Since all users of this app will be present in at least one public group, we do not need
//  to consider the direct 1:1 groups, though your production app implementation may vary.
async function updatePresenceInfoFirstLoad () {
  try {
    developerMessage("User Presence can either be determined on change, or a full list can be returned by the hereNow() API")
    const result = await pubnub.hereNow({
      channels: ['Public.*'],
      includeUUIDs: true,
      includeState: true
    })
    for (var i = 0; i < result.channels['Public.*'].occupancy; i++) {
      handlePresenceEvent('join', {'uuid': result.channels['Public.*'].occupants[i].uuid})
    }
  } catch (status) {
    console.log(status)
  }
}

//  Handler for a Presence event, either 'join', 'leave', or 'interval'
function handlePresenceEvent (action, presenceEvent) {
  developerMessage("Presence events are returned when users join or leave a channel.  Be aware of the ANNOUNCE_MAX setting, to enable an efficient implementation")
  var userId = presenceEvent.uuid
  if (action == 'join') {
    memberJoined(userId)
  } else if (action == 'leave') {
    memberLeft(userId)
  } else if (action == 'interval') {
    //  'join' and 'leave' will work up to the ANNOUNCE_MAX setting (defaults to 20 users)
    //  Over ANNOUNCE_MAX, an 'interval' message is sent.  More info: https://www.pubnub.com/docs/presence/presence-events#interval-mode
    //  The below logic requires that 'Presence Deltas' be defined for the keyset, you can do this from the admin dashboard
    if (
      typeof presenceEvent.join === 'undefined' &&
      typeof presenceEvent.leave === 'undefined'
    ) {
      //  No change since last interval update.
    } else {
      if (
        typeof presenceEvent.join !== 'undefined' &&
        presenceEvent.join.length > 0
      ) {
        for (const joiner of presenceEvent.join) {
          memberJoined(joiner)
        }
      }
      if (
        typeof presenceEvent.leave !== 'undefined' &&
        presenceEvent.leave.length > 0
      ) {
        for (const leaver of presenceEvent.leave) {
          memberLeft(leaver)
        }
      }

    }
  }
}

//  The specified user has joined the chat.  For clarity, this demo app is considering the user 'present' if they
//  are viewing ANY group, though you could also choose to have the user present only if they are viewing
//  (or subscribed to) a specific group (channel)
function memberJoined (userId) {
  var directChatAvatar = document.getElementById('user-pres-' + userId)
  var memberListAvatar = document.getElementById('member-pres-' + userId)
  if (userData[userId] != null) {
    if (userData[userId] != null && userData[userId].presence != 'join') {
      userData[userId].presence = 'join'
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
}

//  The specified user has left the chat
function memberLeft (userId) {
  var directChatAvatar = document.getElementById('user-pres-' + userId)
  var memberListAvatar = document.getElementById('member-pres-' + userId)
  if (userData[userId] != null) {
    if (userData[userId].presence != 'leave') {
      userData[userId].presence = 'leave'
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
