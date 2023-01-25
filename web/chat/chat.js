var pubnub = null
var channel = null
var channelMembers = null
var me = null

async function loadChat () {
  channelMembers = {}
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
  //  todo - check the name gets updated eventually if it is not available on first load.  (Channel Members array is updated - or just rerun populateChatWindow when an object is updated?)
  getGroupList() //  Populate list of group chats for left hand pane
  //  todo reinstate this
  //try {
  channel = sessionStorage.getItem('activeChatChannel')
  if (channel == null) {
    //  There is no active chat channel, load the default channel
    console.log('channel is null, defaulting to group chat')
    channel = predefined_groups.groups[0].channel
    await populateChatWindow(channel)
  } else {
    console.log('channel: ' + channel)

    await populateChatWindow(channel)
  }
  //} catch (err) {
  //}

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
    objects: objectEvent => {
      console.log('OBJECT EVENT')
      console.log(objectEvent)
      //  log out if our object was deleted, e.g. a duplicate tab logged out
      if (objectEvent.message.type == "uuid" && objectEvent.message.event == "delete" && objectEvent.message.data.id == pubnub.getUUID())
      {
        location.href = '../index.html'
      }
      //  todo update list of people present in the chat
      //  todo update any messages in the chat affected by this change
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
  var MAX_CHATS_TO_SHOW = 7
  // Get all UUIDs
  //  todo Might want to only get users who were active in the past 24 hours to match the logic in the group chat
  console.log('get user meta data others')
  try {
    const users = await pubnub.objects.getAllUUIDMetadata({
      sort: { updated: 'desc' }
    })
    //  Populate the Direct 1:1 Chat list with people you can chat with
    if (users.data.length < MAX_CHATS_TO_SHOW)
      MAX_CHATS_TO_SHOW = users.data.length
    for (var i = 0; i < MAX_CHATS_TO_SHOW; i++) {
      if (users.data[i].id == pubnub.getUUID()) continue
      var oneOneUser =
        " <div class='user-with-presence mb-2' onclick='launchDirectChat(\"" +
        users.data[i].id +
        "\")'><img src='" +
        users.data[i].profileUrl +
        "' class='chat-list-avatar'><span id='pres-" +
        users.data[i].id +
        "' class='presence-dot-none'></span><span class='chat-list-name'>" +
        users.data[i].name +
        "</span><span id='unread_" +
        users.data[i].id +
        "' class='unread-message-indicator hidden'></span></div>"
      document.getElementById('oneOneUserList').innerHTML += oneOneUser

      //  Channel name of direct chats is just "direct.[userId1]-[userId2]" where userId1 / userId2 are defined by whoever is lexicographically earliest
      var userId1 = pubnub.getUUID()
      var userId2 = users.data[i].id
      if (users.data[i].id < pubnub.getUUID()) {
        userId1 = users.data[i].id
        userId2 = pubnub.getUUID()
      }
      var tempChannel = 'direct.' + userId1 + '-' + userId2

      //  Add myself and the recipient to the direct chat channel
      //  In production this would probably be done from a central server with access control but for
      //  simplicity, we'll do this on every client
      pubnub.objects.setChannelMembers({
        channel: tempChannel,
        uuids: [userId1, userId2]
      })
      pubnub.objects.setMemberships({
        channels: [tempChannel],
        uuid: pubnub.getUUID(),
      })
    }
    //  Subscribe to the channel for the 1:1 user
    console.log('calling subscribe')
    pubnub.subscribe({
      channels: ['direct.*', 'group.*'],
      withPresence: true
    })
  } catch (status) {
    console.log('Failed to retrieve user meta data for other users: ', status)
  }
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

    console.log('setting membership')
    await pubnub.objects.setChannelMembers({
      channel: group.channel,
      uuids: [pubnub.getUUID()]
    })
    console.log('set membership')
  }
  document.getElementById('groupList').innerHTML = groupList
}

async function launchDirectChat (withUserId) {
  console.log('clicked user to launch direct chat with ' + withUserId)
  document.getElementById('heading').innerHTML = '1:1 Chat'

  //  Channel name of direct chats is just "direct-[userId1]-[userId2]" where userId1 / userId2 are defined by whoever is lexicographically earliest
  var userId1 = pubnub.getUUID()
  var userId2 = withUserId
  if (withUserId < pubnub.getUUID()) {
    userId1 = withUserId
    userId2 = pubnub.getUUID()
  }

  channel = 'direct.' + userId1 + '-' + userId2
  console.log('setting session storage: ' + channel)
  sessionStorage.setItem('activeChatChannel', channel)
  await populateChatWindow(channel)

  let myOffCanvas = document.getElementById('chatLeftSide')
  let openedCanvas = bootstrap.Offcanvas.getInstance(myOffCanvas)
  openedCanvas.hide()
}

async function launchGroupChat (channelName) {
  console.log('Launch Group Chat for channel: ' + channelName)

  channel = channelName
  console.log('setting session storage: ' + channel)
  sessionStorage.setItem('activeChatChannel', channel)
  await populateChatWindow(channel)

  let myOffCanvas = document.getElementById('chatLeftSide')
  let openedCanvas = bootstrap.Offcanvas.getInstance(myOffCanvas)
  openedCanvas.hide()
}

async function populateChatWindow (channelName) {
  console.log('populating chat window for ' + channelName)
  if (channelName.startsWith('group')) {
    //  todo put the name of the group here
    document.getElementById('heading').innerHTML =
      'Group: ' + lookupGroupName(channelName)
  } else if (channelName.startsWith('direct')) {
    document.getElementById('heading').innerHTML = '1:1 Chat'
  }
  clearMessageList()
  //  Get the meta data for users in this chat
  //  todo reinstate this
  //try {
  const result = await pubnub.objects.getChannelMembers({
    channel: channel,
    sort: { updated: 'desc' },
    include: {
      UUIDFields: true
    },
    limit: 50,
    totalCount: true
  })
  console.log('got channel members of ' + channelName)
  console.log(result)
  channelMembers = {}
  for (var i = 0; i < result.data.length; i++) {
    //  Since this is a shared system with essentially ephemeral users, only display users who were created in the last 24 hours
    //  The 'updated' field, for our purposes, will be when the user was created (or changed their name), but either way, this
    //  allows the list of 'users' to be kept manageable.
    //  There is logic to load the names / avatars on historical messages separately, so they are not blank.
    var lastUpdated = new Date(result.data[i].updated)
    var cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - 24)
    if (lastUpdated > cutoff) {
      channelMembers[result.data[i].uuid.id] = {
        name: result.data[i].uuid.name,
        profileUrl: result.data[i].uuid.profileUrl
      }
    }
  }
  console.log(channelMembers)

  //  Update page header
  //  todo take care here - the channelMembers won't be up to date if this user is newly created - update when Object event occurs
  //  todo only include 'present' members who were created in the past hour

  //  todo this logic belongs in the info pane
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

  //document.getElementById('header-subheading').innerHTML =
  //  'Members recently active: ' + Object.keys(channelMembers).length

  repositionMessageList()

  //  Load channel history
  const history = await pubnub.fetchMessages({
    channels: [channelName],
    count: 10,
    includeUUID: true
  })
  console.log('HISTORY HISTORY for ' + channelName)
  console.log(history)
  if (history.channels[channelName] != null) {
    for (const historicalMsg of history.channels[channelName]) {
      //    history.channels[channelName].forEach(msg => {
      historicalMsg.publisher = historicalMsg.uuid

      //  If we don't have the information about the message sender cached, retrieve that from objects
      if (channelMembers[historicalMsg.uuid] == null) {
        console.log('MISSING USER INFO')
        try {
          const result = await pubnub.objects.getUUIDMetadata({
            uuid: historicalMsg.uuid
          })
          if (result != null) {
            console.log('POPULATING MISSING INFO')
            console.log(result)
            channelMembers[historicalMsg.uuid] = {
              name: result.data.name,
              profileUrl: result.data.profileUrl
            }
          }
        } catch (e) {
          console.log(
            'Lookup of unknown uuid failed - they probably logged out and cleared objects: ' +
              e
          )
        }
      }

      if (channelMembers[historicalMsg.uuid] != null) {
        //  Only show past messages from users who didn't log out
        messageReceived(historicalMsg)
      }
    }
  }
  //} catch (status) {
  //  //  todo verify the feature is enabled on the portal
  //  console.log('error: ' + status)
  //}
}

function messageReceived (messageObj) {
  try {
    console.log(messageObj)
    if (messageObj.channel != channel) return
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
  console.log('Sending Message')
  var messageText = document.getElementById('input-message').value
  console.log(channel)
  if (messageText !== '') {
    console.log('publishing to ' + channel)
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

