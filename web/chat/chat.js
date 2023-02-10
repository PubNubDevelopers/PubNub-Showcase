//  Connection to the PubNub API
var pubnub = null
//  The currently active channel ID
var channel = null
//  Local cache of members also in our channel (excluding ourselves)
var channelMembers = null
//  List of remote users (not ourselves) that we know about
var userData = null
//  Our own data, populated asynchronously on startup
var me = null
//  Local cache of channels we are currently subscribed to
var subscribedChannels = null
const MAX_MESSAGES_SHOWN_PER_CHAT = 50
const IGNORE_USER_AFTER_THIS_DURATION = 24 //  Hours

window.addEventListener('beforeunload', function () {
  console.log('unsubscribe all')
  pubnub.unsubscribeAll()
})

//////////////////////
//  Initial setup and configuration

async function loadChat () {
  channelMembers = {}
  userData = {}
  subscribedChannels = []
  activeTypers = {}

  //  Handle Message input
  document
    .getElementById('input-message')
    .addEventListener('keypress', function (event) {
      sendTypingIndicator()
      if (event.key === 'Enter') {
        messageInputSend()
      }
    })

  //  PubNub object
  pubnub = createPubNubObject()
  await getUserMetadataSelf() //  Populate own data for left hand pane
  getUserMetaDataOthers() //  Populate list of direct chats for left hand pane
  getGroupList() //  Populate list of group chats for left hand pane

  //  Add an event listener for the channel
  pnListener = pubnub.addListener({
    //  Status events
    status: statusEvent => {
      //console.log(statusEvent)
    },
    message: payload => {
      messageReceived(payload)
    },
    signal: signalEvent => {
      //console.log('SIGNAL EVENT')
      signalReceived(signalEvent)
    },
    presence: presenceEvent => {
      //console.log('PRESENCE EVENT')
      //console.log(presenceEvent)
      handlePresenceEvent(presenceEvent.action, presenceEvent.uuid)
      //  todo handle announce max
    },
    messageAction: messageActionEvent => {
      //console.log('MESSAGE ACTION')
      //console.log(messageActionEvent)
      maReadReceipt(messageActionEvent)
      maEmojiReaction(messageActionEvent)
    },
    objects: async objectEvent => {
      //console.log('OBJECT EVENT')
      //console.log(objectEvent)
      if (
        objectEvent.message.type == 'uuid' &&
        objectEvent.message.event == 'delete' &&
        objectEvent.message.data.id == pubnub.getUserId()
      ) {
        //  The Object associated with OUR UUID was deleted.
        //  log out.  This could have been caused e.g. by a duplicate tab logging out
        location.href = '../index.html'
      } else if (
        objectEvent.message.type == 'uuid' &&
        objectEvent.message.event == 'delete' &&
        objectEvent.message.data.id != pubnub.getUserId()
      ) {
        var userId = objectEvent.message.data.id
        //  The Object associated with some other UUID was deleted.
        if (userData[userId] != null) {
          removeUser(userId)
        }
        //  Consider 2 scenarios:
        //  Firstly, the current channel is a group chat
        if (channel.startsWith('Public.')) {
          //  If the removed user is part of the active group, remove them
          if (channelMembers[userId] != null) {
            console.log('removing user from current channel')
            removeUserFromCurrentChannel(userId)
            updateInfoPane()
          }
        } else if (channel.startsWith('DM')) {
          //  If the active group is a 1:1 conversation, if it is with the deleted user, quit the chat
          if (createDirectChannelName(userId, pubnub.getUserId()) == channel) {
            channel = predefined_groups.groups[0].channel
            await populateChatWindow(channel)
          }
        }
      } else if (
        objectEvent.message.type == 'membership' &&
        objectEvent.message.event == 'set' &&
        objectEvent.message.data.uuid.id == pubnub.getUserId()
      ) {
        //  We have joined a channel, logic for this is handled elsewhere.
        //  No action required
      } else if (
        objectEvent.message.type == 'membership' &&
        objectEvent.message.event == 'set' &&
        objectEvent.message.data.uuid.id != pubnub.getUserId()
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
            if (userInfo != null) {
              addUserToCurrentChannel(
                userId,
                userInfo.data.name,
                userInfo.data.profileUrl
              )
              updateInfoPane()
            }
          }
        }
      } else if (
        objectEvent.message.type == 'membership' &&
        objectEvent.message.event == 'delete' &&
        objectEvent.message.data.uuid == pubnub.getUserId()
      ) {
        //  This will only ever be called by this app if we log out, the logic of which is handled elsewhere.  Specifically, if we log out in a duplicate tab, we handle this in [uuid][delete]
        //  No action required
      } else if (
        objectEvent.message.type == 'membership' &&
        objectEvent.message.event == 'delete' &&
        objectEvent.message.data.uuid != pubnub.getUserId()
      ) {
        //  Somebody else has removed themselves from a channel
        //  In this application, this can only happen if the user has logged out (which clears their data), a scenario caught by the [uuid][delete] handler
        //  No action required
      }
    }
  })

  try {
    channel = sessionStorage.getItem('activeChatChannel')
    if (channel == null) {
      //  There is no active chat channel, load the default channel
      channel = predefined_groups.groups[0].channel
      await populateChatWindow(channel)
    } else {
      await populateChatWindow(channel)
    }
  } catch (err) {
    console.log(err)
  }

  updatePresenceInfoFirstLoad()
}

function repositionMessageList () {
  //  Position the message list
  var top = document.getElementById('header').offsetHeight
  var bottom = document.getElementById('bottomNav').offsetHeight
  var messageListDiv = document.getElementById('messageList')
  messageListDiv.style.top = top
  messageListDiv.style.bottom = bottom

  var emojiPicker = document.getElementById('emojiPicker')
  var navbarBottom = document.getElementById('bottomNav').offsetHeight
  emojiPicker.style.bottom = navbarBottom
}

function scrollChatToEnd () {
  var messageListDiv = document.getElementById('messageList')
  messageListDiv.scrollTop = messageListDiv.scrollHeight
}

async function populateChatWindow (channelName) {
  sessionStorage.setItem('activeChatChannel', channelName)
  if (channelName.startsWith('Public')) {
    document.getElementById('heading').innerHTML =
      'Group: ' + lookupGroupName(channelName)
  } else if (channelName.startsWith('DM')) {
    var recipientName = await lookupRemoteOneOneUser(channelName)
    document.getElementById('heading').innerHTML = 'Chat with ' + recipientName
  }
  clearMessageList()
  setChannelUnreadCounter(channelName, 0)
  sessionStorage.setItem('chatLastLoadTimestamp', Date.now() * 10000)
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

    //  Account for header potentially growing with group name
    repositionMessageList()

    //  Load channel history
    const history = await pubnub.fetchMessages({
      channels: [channelName],
      count: 10,
      includeUUID: true,
      includeMessageActions: true
    })
    if (history.channels[channelName] != null) {
      for (const historicalMsg of history.channels[channelName]) {
        //    history.channels[channelName].forEach(msg => {
        historicalMsg.publisher = historicalMsg.uuid

        if (channelMembers[historicalMsg.uuid] != null) {
          //  Only show past messages from users who didn't log out
          messageReceived(historicalMsg)
          //  Update the historically loaded messages based on message actions
          if (
            historicalMsg.actions != null &&
            historicalMsg.actions.read != null
          ) {
            //  Mark the sent message as read
            var originalMessage = document.getElementById(
              'message-check-' + historicalMsg.timetoken
            )
            originalMessage.classList.remove('bi-check')
            originalMessage.classList.add('bi-check-all')
          }
          //  React historical emoji readtions (message actions)
          if (
            historicalMsg.actions != null &&
            historicalMsg.actions.react != null &&
            historicalMsg.actions.react.smile != null
          ) {
            //  Handle the message reactions
            var messageEmojiElement = document.getElementById(
              'emoji-reactions-' + historicalMsg.timetoken
            )
            var reaction = ''
            for (const action of historicalMsg.actions.react.smile) {
              reaction += String.fromCodePoint(0x1f642)
              if (action.uuid == pubnub.getUserId()) {
                messageEmojiElement.classList.add('message-reacted')
                messageEmojiElement.dataset.actionid = action.actionTimetoken
              }
            }
            messageEmojiElement.innerHTML = reaction
          }
        }
      }
    }
  } catch (status) {
    //  todo verify the feature is enabled on the portal
    console.log('error: ' + status)
  }
}

//  Wrapper around pubnub objects getUUIDMetadata and set up our internal cache
async function getUserMetadataSelf () {
  try {
    const result = await pubnub.objects.getUUIDMetadata({
      uuid: pubnub.getUserId()
    })
    me = result.data
    document.getElementById('currentUser').innerText = me.name + ' (You)'
    document.getElementById('avatar').src = me.profileUrl
  } catch (e) {
    //  Some error retrieving our own meta data - probably the objects were deleted, therefore log off (possible duplicate tab)
    location.href = '../index.html'
  }
}

//  Wrapper around pubnub objects getAllUUIDMetadata and set up our internal cache
async function getUserMetaDataOthers () {
  // Get all UUIDs
  userData = {}
  try {
    const users = await pubnub.objects.getAllUUIDMetadata({
      sort: { updated: 'desc' },
      limit: 50
    })
    //  Populate the Direct 1:1 Chat list with people you can chat with
    for (var i = users.data.length - 1; i >= 0; i--) {
      if (users.data[i].id == pubnub.getUserId()) continue
      var lastUpdated = new Date(users.data[i].updated)
      var cutoff = new Date()
      cutoff.setHours(cutoff.getHours() - IGNORE_USER_AFTER_THIS_DURATION)
      if (lastUpdated < cutoff) continue
      //  Only add new users recently created
      addNewUser(users.data[i].id, users.data[i].name, users.data[i].profileUrl)
    }
    //  Subscribing to all possible channels we will want to know about.  Need to know about all channels so we can track the unread message counter
    //  Using the recommended naming convention:
    //  Public.<name> for public groups
    //  Private.<name> for private groups
    //  DM.A&B for direct messages between two users
    pubnub.subscribe({
      channels: ['DM.*', 'Public.*'],
      withPresence: true
    })
  } catch (status) {
    console.log('Failed to retrieve user meta data for other users: ', status)
  }
}

function clearMessageList () {
  var messageListContents = document.getElementById('messageListContents')
  messageListContents.innerHTML = ''
}

//////////////////////
//  User management and management of which users are in which channels

//  Add a new REMOTE user to the system, not including ourselves
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
    "' class='chat-list-avatar'><span id='user-pres-" +
    userId +
    "' class='presence-dot-gray'></span><span class='chat-list-name'>" +
    name +
    "</span><span id='unread-" +
    userId +
    "' class='unread-message-indicator hidden'>0</span></div>"
  document.getElementById('oneOneUserList').innerHTML =
    oneOneUser + document.getElementById('oneOneUserList').innerHTML

  var tempChannel = createDirectChannelName(pubnub.getUserId(), userId)
  subscribedChannels.push(tempChannel)

  //  Add myself and the recipient to the direct chat channel
  //  In production this would probably be done from a central server with access control but for
  //  simplicity, we'll do this on every client
  pubnub.objects.setMemberships({
    channels: [tempChannel],
    uuid: pubnub.getUserId()
  })
}

//  Remove a user from the system, this can happen if the user logs out
function removeUser (userId) {
  delete userData[userId]

  var leftPaneUser = document.getElementById('user-' + userId)
  leftPaneUser.parentNode.removeChild(leftPaneUser)

  var tempChannel = createDirectChannelName(pubnub.getUserId(), userId)
  pubnub.objects.removeMemberships({
    uuid: pubnub.getUserId(),
    channels: [tempChannel]
  })
}

//  Remove a user from a channel (just updates our internal cache)
function removeUserFromCurrentChannel (userId) {
  delete channelMembers[userId]
}

//  Update our cache of which users are in the current channel
async function addUserToCurrentChannel (userId, name, profileUrl) {
  try {
    if (name == null || profileUrl == null) {
      name = userInfo.data.name
      profileUrl = userInfo.data.profileUrl
    }
    channelMembers[userId] = {
      name: name,
      profileUrl: profileUrl
    }
  } catch (e) {
    //  Could not look up object
  }
}

async function getUUIDMetaData (userId) {
  const result = await pubnub.objects.getUUIDMetadata({
    uuid: userId
  })
  return result
}

//////////////////////
//  Left hand pane (Direct chats and Group) logic

//  Create a channel for us to talk 1:1 with another user
//  Channel name of direct chats is just "DM.[userId1]&[userId2]" where userId1 / userId2 are defined by whoever is lexicographically earliest
function createDirectChannelName (userId1, userId2) {
  if (userId1 <= userId2) return 'DM.' + userId1 + '&' + userId2
  else return 'DM.' + userId2 + '&' + userId1
}

//  Populate the 'Groups'
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
      "</span> <span id='unread-" +
      group.channel +
      "' class='unread-message-indicator hidden'>0</span></div>"
    groupList += groupHtml

    await pubnub.objects.setMemberships({
      channels: [group.channel],
      uuid: pubnub.getUserId()
    })
    subscribedChannels.push(group.channel)
  }
  document.getElementById('groupList').innerHTML = groupList
  updateMessageCountFirstLoad()
}

//  Handler for when a user is selected in the 1:1 chat window
async function launchDirectChat (withUserId) {
  //  Channel name of direct chats is just "DM.[userId1]&[userId2]" where userId1 / userId2 are defined by whoever is lexicographically earliest
  var userId1 = pubnub.getUserId()
  var userId2 = withUserId
  if (withUserId < pubnub.getUserId()) {
    userId1 = withUserId
    userId2 = pubnub.getUserId()
  }

  channel = 'DM.' + userId1 + '&' + userId2
  await populateChatWindow(channel)

  let myOffCanvas = document.getElementById('chatLeftSide')
  let openedCanvas = bootstrap.Offcanvas.getInstance(myOffCanvas)
  openedCanvas.hide()
}

//  Handler for when a group is selected from the left hand pane
async function launchGroupChat (channelName) {
  channel = channelName
  await populateChatWindow(channel)

  let myOffCanvas = document.getElementById('chatLeftSide')
  let openedCanvas = bootstrap.Offcanvas.getInstance(myOffCanvas)
  openedCanvas.hide()
}

//  Given the channel name of a direct chat, return the name of the person being spoken with
async function lookupRemoteOneOneUser (channelName) {
  try {
    //  Find the remote ID which is contained within the direct channel name
    var remoteId = channelName
    remoteId = remoteId.replace(pubnub.getUserId(), '')
    remoteId = remoteId.replace('DM.', '')
    remoteId = remoteId.replace('&', '')
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

function updateInfoPane () {
  //  We are always present in any chat we are viewing information for
  var memberListHtml = generateHtmlChatMember(
    pubnub.getUserId(),
    me.name + ' (You)',
    me.profileUrl,
    true
  )
  for (var userId in channelMembers) {
    if (userId != pubnub.getUserId()) {
      memberListHtml += generateHtmlChatMember(
        userId,
        channelMembers[userId].name,
        channelMembers[userId].profileUrl,
        false
      )
    }
  }
  document.getElementById('memberList').innerHTML = memberListHtml
}

function generateHtmlChatMember (userId, name, profileUrl, online) {
  var presenceClass = 'presence-dot-gray'
  if (online) presenceClass = 'presence-dot-online'
  return (
    "<div id='member-" +
    userId +
    "' class='user-with-presence mb-2'> \
            <img src='" +
    profileUrl +
    "' class='chat-list-avatar'> \
              <span id='member-pres-" +
    userId +
    "' class='" +
    presenceClass +
    "'></span> \
              <span class='chat-list-name'>" +
    name +
    '</span> \
          </div>'
  )
}

function addGroupClick () {
  notImplemented('Adding a group')
  //  This will be a private group, whose channel name will be of the form 'Private.<name>'
}

function lookupGroupName (channelName) {
  //  Look in the predefined groups
  for (const group of predefined_groups.groups) {
    if (group.channel == channelName) return group.name
  }

  //  look in the dynamically created groups
  //  todo use pubnub objects for channels
  //  these private groups will have channel names 'Private.<name>'
}

//////////////////////////////////////
//  Right click handler and context menu

function addContextHandler (element, callback) {
  //  On desktop environments, handle right click
  if (!('ontouchstart' in window)) {
    element.oncontextmenu = function (e) {
      callback(element.id)
      return false
    }
  } else {
    onLongPress(element, callback)
  }
}

//  Handler for when user right clicks or long presses the element
async function onContextHandler (messageId) {
  console.log(messageId)
  maAddEmojiReaction(messageId)
}

//  Long press happens on mobile devices
function onLongPress (element, callback) {
  let timer

  element.addEventListener('touchstart', () => {
    timer = setTimeout(() => {
      timer = null
      callback(element.id)
    }, 500)
  })

  function cancel () {
    clearTimeout(timer)
  }

  element.addEventListener('touchend', cancel)
  element.addEventListener('touchmove', cancel)
}

//////////////////////////////////////
//  Right click handler and context menu

function messageInputEmoji () {
  if (document.getElementById('emojiPicker').style.visibility == 'visible')
    document.getElementById('emojiPicker').style.visibility = 'hidden'
  else document.getElementById('emojiPicker').style.visibility = 'visible'
}

function selectEmoji (data) {
  var messageInput = document.getElementById('input-message')
  messageInput.value += data.native
}

function messageInputAttachment () {
  console.log('Adding Message Attachment')
  notImplemented('Adding an attachment')
}

function messageInputSend () {
  var messageText = document.getElementById('input-message').value
  if (messageText !== '') {
    try {
      pubnub.publish({
        channel: channel,
        storeInHistory: true,
        message: {
          message: messageText
        }
      })
    } catch (err) {
      console.log('Error sending message: ' + err)
    }
  }
  document.getElementById('input-message').value = ''
}
