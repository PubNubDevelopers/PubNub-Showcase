var pubnub = null
var channel = null
var channelMembers = null
var userData = null
var me = null
const IGNORE_USER_AFTER_THIS_DURATION = 24 //  Hours

async function loadChat () {
  channelMembers = {}
  userData = {}
  repositionMessageList()

  //  Long press handler for each chat message
  var m = document.getElementById('message-002')
  onLongPress(m, () => {
    console.log('Long pressed', m)
  })
  m.oncontextmenu = function (e) {
    console.log('Right click ' + e)
    return false
  }

  //  Handle Message input
  document
    .getElementById('input-message')
    .addEventListener('keypress', function (event) {
      if (event.key === 'Enter') {
        messageInputSend()
      }
    })

  //  PubNub object
  pubnub = createPubNubObject()
  getUserMetadataSelf() //  Populate own data for left hand pane
  getUserMetaDataOthers() //  Populate list of direct chats for left hand pane
  getGroupList() //  Populate list of group chats for left hand pane
  try {
    channel = sessionStorage.getItem('activeChatChannel')
    if (channel == null) {
      //  There is no active chat channel, load the default channel
      //console.log('channel is null, defaulting to group chat')
      channel = predefined_groups.groups[0].channel
      await populateChatWindow(channel)
    } else {
      await populateChatWindow(channel)
    }
  } catch (err) {
    console.log(err)
  }

  //  Add an event listener for the channel
  pnListener = pubnub.addListener({
    //  Status events
    status: statusEvent => {
      console.log(statusEvent)
    },
    message: payload => {
      messageReceived(payload)
      //  todo what if this message is from a user we haven't seen before?
    },
    signal: signalEvent => {
      signalReceived(payload)
    },
    presence: presenceEvent => {
      console.log(presenceEvent)
    },
    objects: async objectEvent => {
      //console.log('OBJECT EVENT')
      //console.log(objectEvent)
      if (
        objectEvent.message.type == 'uuid' &&
        objectEvent.message.event == 'delete' &&
        objectEvent.message.data.id == pubnub.getUUID()
      ) {
        //  The Object associated with OUR UUID was deleted.
        //  log out.  This could have been caused e.g. by a duplicate tab logging out
        location.href = '../index.html'
      } else if (
        objectEvent.message.type == 'uuid' &&
        objectEvent.message.event == 'delete' &&
        objectEvent.message.data.id != pubnub.getUUID()
      ) {
        var userId = objectEvent.message.data.id
        //  The Object associated with some other UUID was deleted.
        if (userData[userId] != null) {
          removeUser(userId)
        }
        //  Consider 2 scenarios:
        //  Firstly, the current channel is a group chat
        if (channel.startsWith('group.')) {
          //  If the removed user is part of the active group, remove them
          if (channelMembers[userId] != null) {
            console.log('removing user from current channel')
            removeUserFromCurrentChannel(userId)
            updateInfoPane()
          }
        } else if (channel.startsWith('direct')) {
          //  If the active group is a 1:1 conversation, if it is with the deleted user, quit the chat
          if (createDirectChannelName(userId, pubnub.getUUID()) == channel) {
            channel = predefined_groups.groups[0].channel
            await populateChatWindow(channel)
          }
        }
      } else if (
        objectEvent.message.type == 'membership' &&
        objectEvent.message.event == 'set' &&
        objectEvent.message.data.uuid.id == pubnub.getUUID()
      ) {
        //  We have joined a channel, logic for this is handled elsewhere.
        //  No action required
      } else if (
        objectEvent.message.type == 'membership' &&
        objectEvent.message.event == 'set' &&
        objectEvent.message.data.uuid.id != pubnub.getUUID()
      ) {
        //  Somebody else has joined a channel
        //  Regardless of our active channel, add this person to our list of direct chats if they aren't there already (this is our indication a new user is added)
        var userId = objectEvent.message.data.uuid.id
        if (userData[userId] == null) {
          userData[userId] = {}
          //  Find out the information about this user
          const userInfo = await getUUIDMetaData(userId)
          addNewUser(userId, userInfo.data.name, userInfo.data.profileUrl)
        }
        if (objectEvent.message.data.channel.id == channel) {
          if (channelMembers[userId] == null) {
            //  if the user has joined the active channel, add them to the list of channel members
            const userInfo = await getUUIDMetaData(userId)
            addUserToCurrentChannel(
              userId,
              userInfo.data.name,
              userInfo.data.profileUrl
            )
          }
        }
      } else if (
        objectEvent.message.type == 'membership' &&
        objectEvent.message.event == 'delete' &&
        objectEvent.message.data.uuid == pubnub.getUUID()
      ) {
        //  This will only ever be called by this app if we log out, the logic of which is handled elsewhere.  Specifically, if we log out in a duplicate tab, we handle this in [uuid][delete]
        //  No action required
      } else if (
        objectEvent.message.type == 'membership' &&
        objectEvent.message.event == 'delete' &&
        objectEvent.message.data.uuid != pubnub.getUUID()
      ) {
        //  Somebody else has removed themselves from a channel
        //  In this application, this can only happen if the user has logged out (which clears their data), a scenario caught by the [uuid][delete] handler
        //  No action required
      }
    }
  })
}

function repositionMessageList () {
  //  Position the message list
  var top = document.getElementById('header').offsetHeight
  var bottom = document.getElementById('bottomNav').offsetHeight
  var messageListDiv = document.getElementById('messageList')
  messageListDiv.style.top = top
  messageListDiv.style.bottom = bottom
}

function scrollChatToEnd () {
  var messageListDiv = document.getElementById('messageList')
  messageListDiv.scrollTop = messageListDiv.scrollHeight
}

async function getUserMetadataSelf () {
  try {
    const result = await pubnub.objects.getUUIDMetadata({
      uuid: pubnub.getUUID()
    })
    me = result.data
    document.getElementById('currentUser').innerText = me.name
    document.getElementById('avatar').src = me.profileUrl
  } catch (e) {
    console.log('ERROR GETTING OWN META DATA')
    console.log(e)
    //  Some error retrieving our own meta data - probably the objects were deleted, therefore log off (possible duplicate tab)
    location.href = '../index.html'
  }
}

async function getUserMetaDataOthers () {
  // Get all UUIDs
  userData = {}
  try {
    const users = await pubnub.objects.getAllUUIDMetadata({
      sort: { updated: 'asc' },
      limit: 50
    })
    //  Populate the Direct 1:1 Chat list with people you can chat with
    for (var i = 0; i < users.data.length; i++) {
      if (users.data[i].id == pubnub.getUUID()) continue
      var lastUpdated = new Date(users.data[i].updated)
      var cutoff = new Date()
      cutoff.setHours(cutoff.getHours() - IGNORE_USER_AFTER_THIS_DURATION)
      if (lastUpdated < cutoff) continue
      //  Only add new users recently created
      addNewUser(users.data[i].id, users.data[i].name, users.data[i].profileUrl)
    }
    //  Subscribing to all possible channels we will want to know about.  Need to know about all channels so we can track the unread message counter
    pubnub.subscribe({
      channels: ['direct.*', 'group.*'],
      withPresence: true
    })
  } catch (status) {
    console.log('Failed to retrieve user meta data for other users: ', status)
  }
}

function addNewUser (userId, name, profileUrl) {
  //  A new user is present in the chat system.
  //  Add this user's details to our local cache of user details
  userData[userId] = { name: name, profileUrl: profileUrl }

  //  Add this user to the left hand pane of direct chats
  var oneOneUser =
    " <div id='user-" +
    userId +
    "' class='user-with-presence mb-2' onclick='launchDirectChat(\"" +
    userId +
    "\")'><img src='" +
    profileUrl +
    "' class='chat-list-avatar'><span id='pres-" +
    userId +
    "' class='presence-dot-none'></span><span class='chat-list-name'>" +
    name +
    "</span><span id='unread-" +
    userId +
    "' class='unread-message-indicator hidden'></span></div>"
  document.getElementById('oneOneUserList').innerHTML =
    oneOneUser + document.getElementById('oneOneUserList').innerHTML

  var tempChannel = createDirectChannelName(pubnub.getUUID(), userId)

  //  Add myself and the recipient to the direct chat channel
  //  In production this would probably be done from a central server with access control but for
  //  simplicity, we'll do this on every client
  //      pubnub.objects.setChannelMembers({
  //        channel: tempChannel,
  //        uuids: [pubnub.getUUID()]
  //        //uuids: [userId1, userId2]
  //      })
  pubnub.objects.setMemberships({
    channels: [tempChannel],
    uuid: pubnub.getUUID()
  })
}

function createDirectChannelName (userId1, userId2) {
  //  Create a channel for us to talk 1:1 with another user
  //  Channel name of direct chats is just "direct.[userId1]-[userId2]" where userId1 / userId2 are defined by whoever is lexicographically earliest
  if (userId1 <= userId2) return 'direct.' + userId1 + '-' + userId2
  else return 'direct.' + userId2 + '-' + userId1
}

function removeUser (userId) {
  delete userData[userId]

  var leftPaneUser = document.getElementById('user-' + userId)
  leftPaneUser.parentNode.removeChild(leftPaneUser)

  var tempChannel = createDirectChannelName(pubnub.getUUID(), userId)
  pubnub.objects.removeMemberships({
    uuid: pubnub.getUUID(),
    channels: [tempChannel]
  })
}

function removeUserFromCurrentChannel (userId) {
  delete channelMembers[userId]
}

function addUserToCurrentChannel (userId, name, profileUrl) {
  channelMembers[userId] = {
    name: name,
    profileUrl: profileUrl
  }

  updateInfoPane()
}

async function getGroupList () {
  var groupList = ''

  for (const group of predefined_groups.groups) {
    var groupHtml =
      "<div class='user-with-presence mb-2' onclick='launchGroupChat(\"" +
      group.channel +
      "\")'><img src='../img/group/" +
      group.profileIcon +
      "' class='chat-list-avatar'> <span style='font-size: larger;padding-left: 0.5em;'>" +
      group.name +
      "</span> <span class='unread-message-indicator' style='display:none'></span></div>"
    groupList += groupHtml

    //await pubnub.objects.setChannelMembers({
    //  channel: group.channel,
    //  uuids: [pubnub.getUUID()]
    //})
    await pubnub.objects.setMemberships({
      channels: [group.channel],
      uuid: pubnub.getUUID()
    })

  }
  document.getElementById('groupList').innerHTML = groupList
}

async function launchDirectChat (withUserId) {

  //  Channel name of direct chats is just "direct-[userId1]-[userId2]" where userId1 / userId2 are defined by whoever is lexicographically earliest
  var userId1 = pubnub.getUUID()
  var userId2 = withUserId
  if (withUserId < pubnub.getUUID()) {
    userId1 = withUserId
    userId2 = pubnub.getUUID()
  }

  channel = 'direct.' + userId1 + '-' + userId2
  await populateChatWindow(channel)

  let myOffCanvas = document.getElementById('chatLeftSide')
  let openedCanvas = bootstrap.Offcanvas.getInstance(myOffCanvas)
  openedCanvas.hide()
}

async function launchGroupChat (channelName) {

  channel = channelName
  await populateChatWindow(channel)

  let myOffCanvas = document.getElementById('chatLeftSide')
  let openedCanvas = bootstrap.Offcanvas.getInstance(myOffCanvas)
  openedCanvas.hide()
}

async function populateChatWindow (channelName) {
  sessionStorage.setItem('activeChatChannel', channelName)
  if (channelName.startsWith('group')) {
    //  todo put the name of the group here
    document.getElementById('heading').innerHTML =
      'Group: ' + lookupGroupName(channelName)
  } else if (channelName.startsWith('direct')) {
    var recipientName = await lookupRemoteOneOneUser(channelName)
    document.getElementById('heading').innerHTML = 'Chat with ' + recipientName
  }
  clearMessageList()
  //  Get the meta data for users in this chat
  try {
    const result = await pubnub.objects.getChannelMembers({
      channel: channel,
      sort: { updated: 'desc' },
      include: {
        UUIDFields: true
      },
      limit: 50,
      totalCount: true
    })
    channelMembers = {}
    for (var i = 0; i < result.data.length; i++) {
      //  Since this is a shared system with essentially ephemeral users, only display users who were created in the last 24 hours
      //  The 'updated' field, for our purposes, will be when the user was created (or changed their name), but either way, this
      //  allows the list of 'users' to be kept manageable.
      //  There is logic to load the names / avatars on historical messages separately, so they are not blank.
      var lastUpdated = new Date(result.data[i].updated)
      var cutoff = new Date()
      cutoff.setHours(cutoff.getHours() - IGNORE_USER_AFTER_THIS_DURATION)
      if (lastUpdated > cutoff) {
        addUserToCurrentChannel(
          result.data[i].uuid.id,
          result.data[i].uuid.name,
          result.data[i].uuid.profileUrl
        )
      }
    }

    updateInfoPane()

    repositionMessageList()

    //  Load channel history
    const history = await pubnub.fetchMessages({
      channels: [channelName],
      count: 10,
      includeUUID: true
    })
    //console.log('HISTORY HISTORY for ' + channelName)
    //console.log(history)
    if (history.channels[channelName] != null) {
      for (const historicalMsg of history.channels[channelName]) {
        //    history.channels[channelName].forEach(msg => {
        historicalMsg.publisher = historicalMsg.uuid

        if (channelMembers[historicalMsg.uuid] != null) {
          //  Only show past messages from users who didn't log out
          messageReceived(historicalMsg)
        }
      }
    }
  } catch (status) {
    //  todo verify the feature is enabled on the portal
    console.log('error: ' + status)
  }
}

async function lookupRemoteOneOneUser (channelName) {
  //  Given the channel name of a direct chat, return the name of the person being spoken with
  try {
    //  Find the remote ID which is contained within the direct channel name
    var remoteId = channelName
    remoteId = remoteId.replace(pubnub.getUUID(), '')
    remoteId = remoteId.replace('direct.', '')
    remoteId = remoteId.replace('-', '')
    if (userData[remoteId] != null) return userData[remoteId].name
    else {
      //  Possibly we are calling this before the users are loaded from the server, for performance reasons don't wait for those to load
      //  Just find out our own uuid
      const userInfo = await getUUIDMetaData(remoteId)
      return userInfo.data.name
    }
  } catch (e) {
    return 'unknown '
  }
}

async function messageReceived (messageObj) {
  try {
    //console.log(messageObj)
    if (messageObj.channel != channel) return

    //  If we don't have the information about the message sender cached, retrieve that from objects
    if (channelMembers[messageObj.publisher] == null) {
      try {
        const result = await getUUIDMetaData(messageObj.publisher)
        if (result != null) {
          addUserToCurrentChannel(
            messageObj.publisher,
            result.data.name,
            result.data.profileUrl
          )
        }
      } catch (e) {
        console
          .log
          //  Lookup of unknown uuid failed - they probably logged out and cleared objects: '
          ()
      }
    }

    var messageDiv = ''
    if (messageObj.publisher == pubnub.getUUID()) {
      messageDiv = createMessageSent(messageObj)
    } else {
      messageDiv = createMessageReceived(messageObj)
    }

    document.getElementById('messageListContents').appendChild(messageDiv)

    scrollChatToEnd()

    //  todo create long press handler for this message
  } catch (e) {
    console.log('Exception during message reception: ' + e)
  }
}

async function getUUIDMetaData (userId) {
  const result = await pubnub.objects.getUUIDMetadata({
    uuid: userId
  })
  return result
}

function createMessageSent (messageObj) {
  var profileUrl = '../img/avatar/placeholder.png'
  var name = 'pending...'
  if (channelMembers[messageObj.publisher] != null) {
    profileUrl = channelMembers[messageObj.publisher].profileUrl
    name = channelMembers[messageObj.publisher].name
  }
  var newMsg = document.createElement('div')
  newMsg.id = messageObj.timetoken
  newMsg.className = 'message-you align-self-end'
  newMsg.innerHTML =
    ' \
  ' +
    messageObj.message.message +
    " \
  <div class='message-you-avatar'> \
      <div class='user-with-presence mx-2 message-you-avatar-contents'> \
          <img src='" +
    profileUrl +
    "' class='chat-list-avatar'> \
          <span id='pres-msg-" +
    messageObj.timetoken +
    "' class='presence-dot-none'></span> \
      </div> \
      <div class='float-end' style='display:inline;width:fit-content'> \
          <div class='' style='text-align:right'><span id='message-reactions-" +
    messageObj.timetoken +
    "'></span> \
              <span class='messageCheck'><i id='message-check-" +
    messageObj.timetoken +
    "' class='bi bi-check'></i></span> \
              <div class='message-sender'>" +
    name +
    " (You)</div> \
              <div class='message-time'>" +
    convertTimetokenToDate(messageObj.timetoken) +
    "</div> \
          </div> \
      </div> \
  </div> \
  <div id='message-contextmenu-" +
    messageObj.timetoken +
    "' class='message-contextmenu-you py-2' style='display:none;'> \
      <button type='button' class='btn btn-danger'>Delete</button> \
      <i class='bi bi-emoji-smile'></i> \
      <i class='bi bi-emoji-frown'></i> \
      <i class='bi bi-heart-fill'></i> \
      <i class='bi bi-lightning'></i> \
  </div>"
  return newMsg
}

function createMessageReceived (messageObj) {
  var profileUrl = '../img/avatar/placeholder.png'
  var name = 'pending...'
  if (channelMembers[messageObj.publisher] != null) {
    profileUrl = channelMembers[messageObj.publisher].profileUrl
    name = channelMembers[messageObj.publisher].name
  }
  var newMsg = document.createElement('div')
  newMsg.id = messageObj.timetoken
  newMsg.className = 'message-them align-self-start'
  newMsg.innerHTML =
    "<div class='user-with-presence float-start mx-2'> <img src='" +
    profileUrl +
    "' class='chat-list-avatar'> <span class='presence-dot-none'></span> </div><span class='messageCheck'><i id='message-check-" +
    messageObj.timetoken +
    "' class='bi bi-check'></i></span>" +
    messageObj.message.message +
    "<div class='float-end' style='text-align:right'><div id='message-001-contextmenu' class='message-contextmenu-them py-2' style='display:none;'> \
    <button type='button' class='btn btn-danger'>Delete</button> \
    <i class='bi bi-emoji-smile'></i> \
    <i class='bi bi-emoji-frown'></i> \
    <i class='bi bi-heart-fill'></i> \
    <i class='bi bi-lightning'></i> \
</div> \
</div> \
<span id='message-reactions-" +
    messageObj.timetoken +
    "'></span> \
<div class='message-sender' style='display:block'>" +
    name +
    "</div> \
<div class='message-time' style='display:inline'>" +
    convertTimetokenToDate(messageObj.timetoken) +
    '</div> \
</div>'
  return newMsg
}

function updateInfoPane () {
  //  todo this is just a bare bones example
  var withMembers = 'Pending... (you)'
  if (channelMembers[pubnub.getUUID()] != null) {
    withMembers =
      'Active in last 24 hours: ' +
      channelMembers[pubnub.getUUID()].name +
      '(you)'
  }

  for (var userId in channelMembers) {
    if (userId != pubnub.getUUID()) {
      if (channelMembers[userId] != null) {
        withMembers += ', ' + channelMembers[userId].name
      } else {
        withMembers += ', pending' //  todo - new idea: if the user isn't present in channelMembers then don't include it here (only add users to channelMembers if they were recently active)
      }
    }
  }
  document.getElementById('infoPaneTemp').innerHTML = withMembers
}

function clearMessageList () {
  var messageListContents = document.getElementById('messageListContents')
  messageListContents.innerHTML = ''
}

function signalReceived (signalObj) {
  console.log(signalObj)
}

function messageInputEmoji () {
  console.log('Adding Emoji')
  notImplemented('Adding an emoji')
}

function addGroupClick () {
  notImplemented('Adding a group')
}

function messageInputAttachment () {
  console.log('Adding Message Attachment')
  notImplemented('Adding an attachment')
}

function messageInputSend () {
  var messageText = document.getElementById('input-message').value
  if (messageText !== '') {
    pubnub.publish({
      channel: channel,
      storeInHistory: true,
      message: {
        message: messageText
      }
    })
  }
  document.getElementById('input-message').value = ''
}

function lookupGroupName (channelName) {
  //  Look in the predefined groups
  for (const group of predefined_groups.groups) {
    if (group.channel == channelName) return group.name
  }

  //  look in the dynamically created groups
  //  todo use pubnub objects for channels
}

function onLongPress (element, callback) {
  let timer

  element.addEventListener('touchstart', () => {
    timer = setTimeout(() => {
      timer = null
      callback()
    }, 500)
  })

  function cancel () {
    clearTimeout(timer)
  }

  element.addEventListener('touchend', cancel)
  element.addEventListener('touchmove', cancel)
}

function convertTimetokenToDate (timetoken) {
  var timestamp = new Date(timetoken / 10000)
  return (
    timestamp.toDateString() +
    '' +
    ' - ' +
    (timestamp.getHours() + '').padStart(2, '0') +
    ':' +
    (timestamp.getMinutes() + '').padStart(2, '0') +
    ':' +
    (timestamp.getSeconds() + '').padStart(2, '0')
  )
}

function notImplemented (feature) {
  const toastLiveExample = document.getElementById('liveToast')
  const toastBody = document.getElementById('toast-body')
  toastBody.innerHTML =
    'This feature (' + feature + ') has not yet been implemented'
  const toast = new bootstrap.Toast(toastLiveExample)
  toast.show()
}
