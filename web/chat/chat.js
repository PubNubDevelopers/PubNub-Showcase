/**
 * Many customers use PubNub to implement chat into their solution, so they don't have to
 * worry about scale, reliability or other infrastructure considerations.  If you are reading
 * this source code, hopefully you are implementing an app with PubNub :)  THANK YOU!
 * Here are some tips for things you'll need to watch out for as you move to production, this is
 * just a demo and beyond the usual caveats to add 'error handling' code, it's worth bearing the
 * following in mind
 * IN PRODUCTION:
 * - PubNub provides all the underlying APIs you need to implement your chat solution but we don't
 *   provide an opinionated visual design - feel free to build your own UI on top of our APIs, this
 *   demo uses a very basic chat UI to 'get the idea across'
 * - PubNub uses a flexible channel architecture for communication, endpoints 'subscribe' and 'publish'
 *   messages to channels.  By naming channels in a sensible hierarchy you can enable public and
 *   private groups.  This demo follows the same naming convention a number of our customers use for
 *   'Public.<channel>', 'Private.<channel>' and 'DM.A&B', enabling all possible grouping use cases.
 *   In production, you will use Access Manager to restrict access to channels as appropriate but that
 *   is not done in this demo, for readability.
 * - This demo does not encrypt any messages, but you could do this if you chose to do so for additional
 *   privacy and security.  Obviously all messages are already sent over secure connection and PubNub
 *   is SOC2 compliant so even if you do not choose to implement message encryption, your messages are
 *   still secure.
 * - Subscription: This demo uses wildcard subscription in conjunction with the channel naming topology
 *   to listen for new messages.  This will be sufficient for most production use cases but if you need
 *   an even greater number of channels then please see our Channel Groups feature.
 * - Presence: This demo uses PubNub's Presence APIs to detect who is online.  Presence is based subscription
 *   which, in the case of this demo, is to 'channel.*', so a user will be shown as online even if they are
 *   not viewing the same conversation as you.  Presence is configurable at both the client and server level,
 *   for example you can choose to unsubscribe / resubscribe to channels as you switch conversations and additional
 *   options are available on the admin portal (for example, unsubscribing when a TCP ACK is received).
 * - Read receipts and message reactions: Both of these are implemented in this demo using PubNub's message
 *   reactions feature.  Message reactions allow you to add meta data to a specific message, which can subsequently
 *   be read by recipients and stored in history.  You can also use message reactions to edit message data (still
 *   retaining the original message content) and 'delete' existing messages.  The logic around read receipts
 *   can get particularly complex with groups (messages are sent, delivered, read by a subset of the group, then
 *   finally are read by the entire group).  To keep things simple, this demo implements a simplified mechanism
 *   for read receipts (they are sent, then marked as read when only one person has read them) BUT this is not
 *   a limitation of PubNub, it is just a simple demo to show the principle.
 * - App Context: If you are building a chat app based on the PubNub SDK you will have a number of requirements in
 *   common with other chat implementations, i.e. you will need to store metadata associated with a user (name,
 *   avatar URL, mood), channel and which users are members of which channel.  This demo uses PubNub App Context
 *   extensively to track user information including which channels they are members of.  App Context is particularly
 *   useful if you do not have an existing backend or you want to isolate your chat functionality so it is
 *   entirely within the PubNub domain.  Public groups are also tracked using Channel context, and you can
 *   modify this data yourself, on your own keyset, using the Channel Management feature of BizOps Workspace
 * - Typing indicator: We recommend you use PubNub signals, as this demo does.  This demo's logic for the typing
 *   indicator with groups, where multiple people are typing, is quite simple (especially the use of setTimeout).
 *   In production, you would have more robust logic but, again, the demo was written with readibility in mind.
 *   PubNub signals will meet your typing indicator use case regardless of scale.
 * - Attachments are handled using the PubNub file API.  In production, you will probably have some complex use
 *   cases around sharing files, previewing them and opening them externally.  The PubNub file API provides
 *   serverside storage for ANY file type, though this demo restricts itself to images only.  The file API also
 *   supports files up to 5MB (increasible if you contact support), though this demo restricts images to 1MB.
 *   Images in this demo are moderated using Functions and it is strongly recommended you moderate any images
 *   in your own chat solution.  This demo will delete any image that does not pass moderation before it is
 *   delivered to the recipient, though in production you will want a more complex logic around 'banning' users
 *   who do not follow your chat rules.
 * - Message Persistence: The data in this demo (messages, files) only persist for 1 day.  That is a deliberate choice since
 *   this is only a demo but in production, this is something you can configure from your PubNub admin dashboard, so
 *   data can be persisted as long as you need.  The Message Persistence API (you may also see this referred to as the history API) can retrieve messages (along with
 *   their accompanying reaction) as far back as you need but for readibility, this demo only goes back to the past
 *   50 messages.
 * - Paging: Related to message persistence, in production you will need to page through the results from a number of API
 *   calls that return a lot of data (message persistence including message reactions, app context data, etc.).  This is
 *   standard for Network APIs but to keep things simple, this demo has been designed to avoid having to page any
 *   data.  Be sure to add paging logic to any API call you make that returns a 'next' page.
 * - Functions: Functions provide server logic that can be exeuted after an event occurs, such as a message is published
 *   or a file is uploaded.  Functions are used by this demo to moderate both text and images but are not used beyond
 *   that.  In production, you might choose to use functions to perform inline language translation or to store a
 *   copy of any message in your own storage for analytics purposes (you can also use Events & Actions for this
 *   analytics use case)
 */
//  Connection to the PubNub API
var pubnub = null
//  The currently active channel ID
var channel = null
//  Local cache of members also in our channel (excluding ourselves)
var channelMembers = null
//  List of remote users (not ourselves) that we know about
var userData = null
//  Our own data, populated synchronously on startup
var me = null
//  Local cache of channels we are currently subscribed to
var subscribedChannels = null
//  The current attachment (image)
var fileAttachment = null
//  Avoid duplicate sends
var isMessageSendingInProgress = false
const MAX_MESSAGES_SHOWN_PER_CHAT = 50
const IGNORE_USER_AFTER_THIS_DURATION = 24 //  Hours
const MAX_ATTACHMENT_FILE_SIZE = 1024 * 1024 * 1 //  bytes
const DEFAULT_AVATAR = HOST_URL + 'img/avatar/placeholder.png'
const BLANK_AVATAR = HOST_URL + 'img/avatar/placeholder_blank.png'

//  To make Presence indications more accurate if the webpage is being refreshed, notify PubNub that the client is leaving .
//  PubNub will eventually catch up, but this makes it quicker
window.addEventListener('beforeunload', function () {
  pubnub.unsubscribeAll()
})

//////////////////////
//  Initial setup and configuration

//  Called on page load
async function loadChat () {
  channelMembers = {}
  userData = {}
  subscribedChannels = []
  activeTypers = {}

  //  Handle Message input field
  document
    .getElementById('input-message')
    .addEventListener('keypress', function (event) {
      sendTypingIndicator()
      if (event.key === 'Enter') {
        messageInputSend()
      }
    })

  //  PubNub object - connection with the PubNub infrastructure
  pubnub = await createPubNubObject()
  await getUserMetadataSelf() //  Populate own data for left hand pane
  const directChatsLoaded = getUserMetaDataOthers() //  Populate list of direct chats for left hand pane
  const privateGroupsLoaded = getPrivateGroupList() //  Populate list of private group chats for left hand pane
  //  Populate list of public group chats for left hand pane
  const publicGroupsLoaded = getGroupList()
  Promise.all([
    directChatsLoaded,
    privateGroupsLoaded,
    publicGroupsLoaded
  ]).then(async () => {
    //  Call PubNub's hereNow() API to see who else is here
    updatePresenceInfoFirstLoad()
    updateMessageCountFirstLoad()

    //  When the chat app first loads, read the current active channel from session storage
    try {
      channel = sessionStorage.getItem('activeChatChannel')
      if (channel == null) {
        //  There is no active chat channel, load the default channel (global group)
        channel = cached_groups.public_groups[0].channel
        if (!channel) 
        {
          console.log("No public channels.  Please log out and back in again to regenerate");
        }
        else{
          await populateChatWindow(channel)
        }
      } else {
        await populateChatWindow(channel)
      }
    } catch (err) {
      console.log(
        'Error retrieving session storage.  This is needed to run the demo' + err
      )
      alert('Demo will not run without session storage')
    }

  })

  developerMessage(
    'A PubNub event listener will receive data from PubNub, including status, messages, signals, presence and app context updates'
  )

  //  Add an event listener for the channel
  pnListener = pubnub.addListener({
    //  Status events
    status: statusEvent => {
      //console.log(statusEvent)
    },
    message: payload => {
      //  Messages are used for chat messages
      developerMessage(
        'Messages can contain any serializable data and, when published to a channel, will be received by all subscribers of that channel'
      )
      messageReceived(payload, false)
    },
    signal: signalEvent => {
      //  Signals are used for the typing indicator
      developerMessage(
        "Signals are small messages ideal for typing or 'message read' notifications"
      )
      signalReceived(signalEvent)
    },
    presence: presenceEvent => {
      //  Presence is used to determine whether users are online or offline
      developerMessage(
        "User online and offline status is provided by PubNub's Presence feature, giving a channel's occupants"
      )
      handlePresenceEvent(presenceEvent.action, presenceEvent)
    },
    messageAction: messageActionEvent => {
      //  Message reactions are used to handle read receipts and message reactions (add emoji to messages)
      developerMessage(
        "PubNub's Message Reactions are used to augment existing messages with extra data, such as read receipts or reactions"
      )
      maReadReceipt(messageActionEvent)
      maEmojiReaction(messageActionEvent)
    },
    objects: async objectEvent => {
      //console.log(objectEvent)
      //  App Context is used to maintain the state of users in the system, as well as which channels
      //  they are members of
      if (
        objectEvent.message.type == 'uuid' &&
        objectEvent.message.event == 'delete' &&
        objectEvent.message.data.id == pubnub.getUserId()
      ) {
        //  The App Context associated with OUR UUID was deleted.
        //  log out.  This could have been caused e.g. by a duplicate tab logging out
        location.href = '../index.html'
      } else if (
        objectEvent.message.type == 'uuid' &&
        objectEvent.message.event == 'delete' &&
        objectEvent.message.data.id != pubnub.getUserId()
      ) {
        var userId = objectEvent.message.data.id
        //  The App Context associated with some other UUID was deleted.
        if (userData[userId] != null) {
          removeUser(userId)
        }
        //  Consider 2 scenarios:
        //  Firstly, the current channel is a public group chat
        if (channel.startsWith('Public.')) {
          //  If the removed user is part of the active group, remove them
          if (channelMembers[userId] != null) {
            removeUserFromCurrentChannel(userId)
            updateInfoPane()
          }
        } else if (channel.startsWith('DM')) {
          //  Secondly, if the active group is a 1:1 conversation, if it is with the deleted user, quit the chat
          if (createDirectChannelName(userId, pubnub.getUserId()) == channel) {
            channel = cached_groups.public_groups[0].channel
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
        if (userId.includes('sim_')) return
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
      } else if (
        objectEvent.message.type == 'channel' &&
        objectEvent.message.event == 'set')
        {
          //  The Channel information has been updated, probably through the Channel Management feature of BizOps Workspace
          channelMetaDataHasUpdated(objectEvent)
        }
        else if (
          objectEvent.message.type == 'channel' &&
          objectEvent.message.event == 'delete')
        {
          //  A Channel has been deleted, probably through the Channel Management feature of BizOps Workspace
          channelDeleted(objectEvent)
        }
        else if (
          objectEvent.message.type === "uuid" &&
          objectEvent.message.event === "set")
        {
          //  User ID information has been changed
          await userMetaDataHasUpdated(objectEvent.message.data)
        }
    }
  })

  var infoPane = document.getElementById('chatRightSide')
  chatRightSide.addEventListener('hidden.bs.offcanvas', function () {
    document.getElementById('chat-container').classList.remove('blurred')
  })
  chatRightSide.addEventListener('show.bs.offcanvas', function () {
    document.getElementById('chat-container').classList.add('blurred')
  })
}

//  Very large method to handle all the logic of populating the chat window with the chat
//  associated with the specified channel
async function populateChatWindow (channelName) {
  sessionStorage.setItem('activeChatChannel', channelName)
  hideEmojiWindow()
  showMessageSendingInProgressSpinner(false)

  //  Update the heading
  if (channelName.startsWith('Public')) {
    //  This is a public group
    document.getElementById('heading').innerHTML = lookupGroupName(channelName)
  } else if (channelName.startsWith('Private')) {
    document.getElementById('heading').innerHTML = lookupGroupName(channelName)
  } else if (channelName.startsWith('DM')) {
    //  1:1 message between two users
    var recipientName = await lookupRemoteOneOneUser(channelName)
    document.getElementById('heading').innerHTML = 'Chat with ' + recipientName
  }
  clearMessageList()
  messageReactions = {}
  //  If we select a channel to view it, clear all unread messages for this channel regardless of the
  //  position of the scrollbar (to keep the demo simple)
  setChannelUnreadCounter(channelName, 0)

  //  Get the meta data for other users in this chat.  This will be stored locally for efficiency.  If we see a new user after the chat
  //  is loaded, that user's data will be loaded dynamically as needed
  try {
    developerMessage(
      'PubNub App Context is used to store data about users, channels and who is a member of each channel'
    )

    pubnub.objects
      .getChannelMembers({
        channel: channel,
        sort: { updated: 'desc' },
        include: {
          UUIDFields: true
        },
        limit: 50, //  To keep the logic simple, this demo is limited to 50 simultaneous users.  See notes about paging at the top of this file.
        totalCount: true
      })
      .then(result => {
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

        //  The current channel members are shown in the right hand pane
        updateInfoPane()

        //  Load channel history
        pubnub
          .fetchMessages({
            channels: [channelName],
            count: 20, //  Limit to 20 messages.  Design decision for this app, not a limitation of PubNUb
            includeUUID: true,
            includeMessageActions: true
          })
          .then(async history => {
            if (history.channels[channelName] != null) {
              for (const historicalMsg of history.channels[channelName]) {
                developerMessage(
                  'PubNub can persist previous messages which can then be loaded into the conversation at launch'
                )
                try {
                  historicalMsg.publisher = historicalMsg.uuid

                  await messageReceived(historicalMsg, true)

                  //  Update the historically loaded messages based on message reactions
                  if (
                    historicalMsg.actions != null &&
                    historicalMsg.actions.read != null
                  ) {
                    //  Mark the sent message as read
                    var originalMessage = document.getElementById(
                      'message-check-' + historicalMsg.timetoken
                    )

                    originalMessage.src = '../img/icons/read.png'
                  }
                  //  Read in message reactions for historical messages (message reactions)
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
                      var reactionPayload = {
                        event: 'added',
                        data: {
                          type: 'react',
                          messageTimetoken: historicalMsg.timetoken
                        }
                      }
                      maEmojiReaction(reactionPayload)
                      if (action.uuid == pubnub.getUserId()) {
                        messageEmojiElement.classList.add(
                          'temp-message-reacted'
                        )
                        messageEmojiElement.dataset.actionid =
                          action.actionTimetoken
                      }
                    }
                  }
                } catch (e) {
                  //  Malformed message in history
                }
              }
            }
          })
      })

    setChannelLastReadTimetoken(channelName, Date.now() * 10000)
  } catch (status) {
    console.log(
      'error (check you have message persistence & App Context enabled in the admin portal): ' +
        status
    )
  }
}

function setChannelLastReadTimetoken (channel, timetoken) {
  developerMessage(
    "PubNub App Context also allows you to specify meta data for a channel, in this case when the channel's messages were last read"
  )
  pubnub.objects.setMemberships({
    channels: [{ id: channel, custom: { lastReadTimetoken: timetoken } }],
    uuid: pubnub.getUserId()
  })
}

//  Wrapper around PubNub App Context getUUIDMetadata and set up our internal cache
async function getUserMetadataSelf () {
  try {
    const result = await pubnub.objects.getUUIDMetadata({
      uuid: pubnub.getUserId()
    })
    me = result.data
    if (!me.profileUrl) { me.profileUrl = BLANK_AVATAR }
    document.getElementById('currentUser').innerText = (me.name === null ? "" : me.name) + ' (You)'
    document.getElementById('currentUser-side').innerText = (me.name === null ? "" : me.name) + ' (You)'
    document.getElementById('avatar').src = me.profileUrl
    document.getElementById('avatar-side').src = me.profileUrl
  } catch (e) {
    //  Some error retrieving our own meta data - probably the App Context was deleted, therefore log off (possible duplicate tab)
    location.href = '../index.html'
  }
}

//  Wrapper around PubNub App Context getAllUUIDMetadata and set up our internal cache
async function getUserMetaDataOthers () {
  //  Subscribing to all possible channels we will want to know about.  Need to know about all channels so we can track the unread message counter
  //  Using the recommended naming convention:
  //  Public.<name> for public groups
  //  Private.<name> for private groups
  //  DM.A&B for direct messages between two users
  developerMessage(
    'You can specify a wildcard (*) to subscribe to all channels which match a specific pattern'
  )
  pubnub.subscribe({
    channels: ['DM.*', 'Public.*', 'Private.*'],
    withPresence: true
  })

  // Get all UUIDs
  userData = {}
  try {
    return new Promise((res, rej) => {
      developerMessage(
        "This demo retrieves all user's information from PubNub's App Context API (you may choose to do this from your server in production for security)"
      )
      //  IN PRODUCTION: You may not wish every user to have access to every other user's information, in which case PubNub's Access Manager can restrict who has access to what data.
      pubnub.objects
        .getAllUUIDMetadata({
          sort: { updated: 'desc' },
          limit: 50
        })
        .then(async users => {
          //  Populate the Direct 1:1 Chat list with people you can chat with
          for (var i = users.data.length - 1; i >= 0; i--) {
            if (users.data[i].id == pubnub.getUserId()) continue
            if (users.data[i].id.includes('sim_')) continue
            var lastUpdated = new Date(users.data[i].updated)
            //  Do not show users who logged in more than 24 hours ago.  To avoid stale data in the demo - you probably would not do this in production
            var cutoff = new Date()
            cutoff.setHours(cutoff.getHours() - IGNORE_USER_AFTER_THIS_DURATION)
            if (lastUpdated < cutoff) continue
            //  Only add new users recently created
            await addNewUser(
              users.data[i].id,
              users.data[i].name,
              users.data[i].profileUrl
            )
          }
          res()
        })
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
async function addNewUser (userId, name, profileUrl) {
  if (userId === 'PUBNUB_INTERNAL_MODERATOR')
  {
    //  We do not support the internal moderator in this app (added if you select Channel Monitor in the keyset)
    return;
  }
  if (userData[userId] != null && Object.keys(userData[userId]).length != 0) {
    //  Do not add the same user more than once
    console.log('did not add user, already exists: ' + userId)
    return
  }
  if (!profileUrl) { profileUrl = BLANK_AVATAR }
  //  A new user is present in the chat system.
  //  Add this user's details to our local cache of user details
  userData[userId] = { name: name, profileUrl: profileUrl }

  //  Add this user to the left hand pane of direct chats.  Not amazing practice to include styling within the JS code, sorry :)
  var oneOneUser = generateOneOneUser(userId, profileUrl, name, false)
  var oneOneUserSide = generateOneOneUser(userId, profileUrl, name, true)
  
  document.getElementById('oneOneUserList').innerHTML =
    oneOneUser + document.getElementById('oneOneUserList').innerHTML
  document.getElementById('oneOneUserList-side').innerHTML =
    oneOneUserSide + document.getElementById('oneOneUserList-side').innerHTML

  var tempChannel = createDirectChannelName(pubnub.getUserId(), userId)
  subscribedChannels.push(tempChannel)

  //  Add myself and the recipient to the direct chat channel
  //  In production this would probably be done from a central server with access control but for
  //  simplicity, we'll do this on every client
  developerMessage(
    "PubNub's App Context enables you to specify which channel(s) a user is a member of, then you will receive events as that channel's data changes."
  )
  return new Promise((res, rej) => {
    pubnub.objects
      .setMemberships({
        channels: [tempChannel],
        uuid: pubnub.getUserId()
      })
      .then(() => {
        res()
      })
  })
}

//  Generate the HTML for the list of direct chats in the left hand pane.  Note that there are two
//  copies of each user, one shown on mobile and one shown on the desktop
function generateOneOneUser (userId, profileUrl, name, isSide) {
  var idDelta = ''
  if (isSide) idDelta = 's'
  var user =
    " <div id='user-" +
    userId +
    "' class='user-with-presence group-row' onclick='launchDirectChat(\"" +
    userId +
    "\")'><img id='" + userId + idDelta + "-remoteProfileUrl' src='" +
    profileUrl +
    "' class='chat-list-avatar'><span id='user-pres-" +
    idDelta +
    userId +
    "' class='presence-dot-gray'></span><div id='unread-" +
    idDelta +
    userId +
    "' class='text-caption presence-dot-online-num' style='visibility: hidden'>0</div><span class='chat-list-name' id='" + userId + idDelta + "-channelName'>" +
    name +
    '</span></div>'
  return user
}

//  Remove a user from the system, this can happen if the user logs out.
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
    if (profileUrl == null) { profileUrl = BLANK_AVATAR }
    if (name == null || profileUrl == null) {
      name = userInfo.data.name
      profileUrl = userInfo.data.profileUrl
    }
    channelMembers[userId] = {
      name: name,
      profileUrl: profileUrl
    }
  } catch (e) {
    //  Could not look up app context
  }
}

//  Wrapper for pubnub's getUUIDMetadata for code readability
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

//  Populate the public 'Groups', in the left hand pane
async function getGroupList () {
  return new Promise((res, rej) => {
    var groupList = ''
    var groupListSide = ''
    var channels = []
    //  Read the public groups from the channel metadata and cache it
    pubnub.objects.getAllChannelMetadata({
      include: { customFields: true },
      limit: 50,
    }).then((channelMeta) => {
      for (var i = 0; i < channelMeta.data.length; i++)
      {
        cacheChannel(channelMeta.data[i])
      }

      for (const group of cached_groups.public_groups) {
        var groupHtml = generatePredefinedGroupHTML(group, false)
        var groupHtmlSide = generatePredefinedGroupHTML(group, true)
        groupList += groupHtml
        groupListSide += groupHtmlSide
        channels.push(group.channel)
        subscribedChannels.push(group.channel)
      }
      developerMessage(
        'This demo has 3 public groups (by default) and 1 hardcoded private group.  The demo automatically enrols you in all these groups.  See code comments for details of channel naming conventions for groups.'
      )
      //  Add ourself as a member of every (public) group
      pubnub.objects
        .setMemberships({
          channels: channels,
          uuid: pubnub.getUserId()
        })
        .then(() => {
          document.getElementById('groupList').innerHTML = groupList
          document.getElementById('groupList-side').innerHTML = groupListSide
          res()
        })
    })
  })
}

function cacheChannel(channelInfo)
{
  var newChannel = {}
  newChannel.channel = channelInfo.id;
  newChannel.name = channelInfo.name;
  if (newChannel.name === null) { newChannel.name = "" }
  newChannel.description = channelInfo.description;
  if (newChannel.description === null) { newChannel.description = ""}
  if (channelInfo.custom && channelInfo.custom.profileIcon) {newChannel.profileIcon = channelInfo.custom.profileIcon;}
  if (channelInfo.custom && channelInfo.custom.info) {newChannel.info = channelInfo.custom.info}
  cached_groups.public_groups.push(newChannel)
}

//  There are two copies of each group, one shown on mobile and one shown on the desktop
function generatePredefinedGroupHTML (group, isSide) {
  var idDelta = ''
  if (isSide) idDelta = 's'
  if (!group.profileIcon) { group.profileIcon = DEFAULT_AVATAR }
  if (group.profileIcon && !group.profileIcon.startsWith('http') && !group.profileIcon.startsWith('..')) {group.profileIcon = '../img/group/' + group.profileIcon}
  var groupHtml =
    "<div id='group-" + idDelta + group.channel + "' class='user-with-presence group-row group-row-flex' onclick='launchGroupChat(\"" +
    group.channel +
    "\")'><img id='channelProfileIcon-" + idDelta + group.channel + "' src='" +
    group.profileIcon +
    "' class='chat-list-avatar'><div id='unread-" +
    idDelta +
    group.channel +
    "' class='text-caption presence-dot-online-num' style='visibility: hidden'>0</div>"

    var groupInfo = ""
    var groupInfoDisplay = "none"
    if (typeof group.info !== 'undefined')
    {
      groupInfo = group.info
      groupInfoDisplay = "flex"
    }
    groupHtml +=
      "<div class='group-name group-name-flex'><div id='channelName-" + idDelta + group.channel + "'>" +
      group.name +
      "</div><div class='text-caption' style='display:" + groupInfoDisplay + "' id='channelInfo-" + idDelta + group.channel + "'>" +
      groupInfo +
      '</div></div></div>'

  return groupHtml
}

/**
 *  PRODUCTION CONSIDERATIONS for private groups:
 *  This demo hard codes the list of private groups but in a production chat solution
 *  users should be added and removed from private groups by an authorized endpoint.
 *  Typically this would be done on the server side, in conjunction with the access manager
 *  ensuring that only authorized users are added to specific groups and controlling requests to be
 *  added to new groups.
 *  A group will map to a channel.  Although you can choose any naming convention for your channel,
 *  recommendations exist in the documentation.  For private groups, the recommendation is to use Private.<channel name>
 *  for the channel name
 *  You can still use PubNub App Context to organize which channels your users are members of.
 */
async function getPrivateGroupList () {
  return new Promise((res, rej) => {
    var privateGroupList = ''
    var privateGroupListSide = ''

    var channels = []
    for (const group of predefined_groups.private_groups) {
      var actualChannel = group.channel.replace('uuid', pubnub.getUserId())
      var privateGroupHtml = generatePrivateGroupHTML(group, actualChannel, false)
      var privateGroupHtmlSide = generatePrivateGroupHTML(group, actualChannel, true)

      privateGroupList += privateGroupHtml
      privateGroupListSide += privateGroupHtmlSide

      channels.push(actualChannel)
      subscribedChannels.push(actualChannel)
    }

    pubnub.objects
      .setMemberships({
        channels: channels,
        uuid: pubnub.getUserId()
      })
      .then(() => {
        document.getElementById('groupListPrivate').innerHTML = privateGroupList
        document.getElementById('groupListPrivate-side').innerHTML =
          privateGroupListSide
        res()
      })
  })
}

//  There are two copies of each group, one shown on mobile and one shown on the desktop
function generatePrivateGroupHTML (group, actualChannel, isSide) {
  var idDelta = ''
  if (isSide) idDelta = 's'
  var privateGroupHtml =
  "<div class='user-with-presence group-row group-row-flex' onclick='launchGroupChat(\"" +
  actualChannel +
  "\")'><img src='../img/group/" +
  group.profileIcon +
  "' class='chat-list-avatar'><div id='unread-" + idDelta +
  actualChannel +
  "' class='text-caption presence-dot-online-num' style='visibility: hidden'>0</div> <div class='group-name group-name-flex'><div id='" + actualChannel + "-channelName'>" +
  group.name +
  "</div><div class='text-caption' id='" + actualChannel + "-channelInfo'>" +
  group.info +
  '</div></div></div>'

  return privateGroupHtml
}

//  Handler for when a user is selected in the 1:1 chat window.  Display the chat with that user
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
  if (openedCanvas !== null) {
    openedCanvas.hide()
  }
}

//  Handler for when a public or private group is selected from the left hand pane
async function launchGroupChat (channelName) {
  channel = channelName
  await populateChatWindow(channel)

  let myOffCanvas = document.getElementById('chatLeftSide')
  let openedCanvas = bootstrap.Offcanvas.getInstance(myOffCanvas)
  if (openedCanvas !== null) {
    openedCanvas.hide()
  }
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

//  Update the right hand pane with the members of the group, i.e. members of the active channel
function updateInfoPane () {
  //  We are always present in any chat we are viewing information for
  var memberListHtml = generateHtmlChatMember(
    pubnub.getUserId(),
    (me.name === null ? "" : me.name) + ' (You)',
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

  //  The information associated with the chat
  var chatInfo = 'Direct chat between two members'
  if (!channel.startsWith('DM')) {
    chatInfo = lookupGroupDescription(channel)
  }
  document.getElementById('chat-info-description').innerHTML = chatInfo
}

//  HTML for a member in the info (right hand) pane
function generateHtmlChatMember (userId, name, profileUrl, online) {
  var presenceClass = 'presence-dot-gray'
  if (online) presenceClass = 'presence-dot-online'
  return (
    "<div id='member-" +
    userId +
    "' class='user-with-presence group-row'> \
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

//  Given a channel, return the corresponding group name
function lookupGroupName (channelName) {
  //  Look in the predefined groups & cached groups
  for (const group of cached_groups.public_groups) {
    if (group.channel == channelName) return group.name
  }
  for (const group of predefined_groups.private_groups) {
    var groupName = channelName.replace(pubnub.getUserId(), 'uuid')
    if (group.channel == groupName) return group.name
  }
}

//  Given a channel, return the corresponding group description
function lookupGroupDescription (channelName) {
  //  Only consider the predefined & cached groups
  for (const group of cached_groups.public_groups) {
    if (group.channel == channelName) return group.description
  }
  for (const group of predefined_groups.private_groups) {
    var groupName = channelName.replace(pubnub.getUserId(), 'uuid')
    if (group.channel == groupName) return group.description
  }
}

//////////////////////////////////////
//  Right click handler and context menu
function addContextHandler (element, callback) {
  //  On desktop environments, handle right click
  if (!('ontouchstart' in window)) {
    element.addEventListener('mouseenter', data => {
      document.getElementById(
        'emoji-reactions-' + element.id
      ).style.visibility = 'visible'
    })
    element.addEventListener('mouseleave', data => {
      document.getElementById(
        'emoji-reactions-' + element.id
      ).style.visibility = 'hidden'
    })
    //  Old logic for handling right click
    //element.oncontextmenu = function (e) {
    //  callback(element.id)
    //  return false
    //}
  } else {
    onLongPress(element, callback)
  }
}

//  Handler for when user right clicks or long presses the element
async function onContextHandler (messageId) {
  var emojiReactionDiv = document.getElementById('emoji-reactions-' + messageId)
  if (
    document.getElementById('emoji-reactions-' + messageId).style.visibility ==
    'visible'
  ) {
    document.getElementById('emoji-reactions-' + messageId).style.visibility =
      'hidden'
  } else {
    document.getElementById('emoji-reactions-' + messageId).style.visibility =
      'visible'
  }
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
//  Message Attachments

//  Click handler for the attachment (paperclip) icon
function messageInputAttachment () {
  const messageInput = document.getElementById('input-message')

  //  Prompt the user to select a file
  var input = document.createElement('input')
  input.type = 'file'

  input.onchange = e => {
    //  User has selected a file
    fileAttachment = e.target.files[0]
    if (fileAttachment == null) {
      //  User cancelled the attachment selection
      return
    } else if (fileAttachment.size > MAX_ATTACHMENT_FILE_SIZE) {
      //  User file was too large.  1MB is an artificial limit imposed by this demo.
      //  Actual PubNub limit is 5MB (soft limit), which can be increased by contacting support.
      //  https://www.pubnub.com/docs/general/setup/limits#files
      errorMessage('Your file should be under 1MB')
      return
    } else if (
      !(
        fileAttachment.type == 'image/png' ||
        fileAttachment.type == 'image/jpeg' ||
        fileAttachment.type == 'image/gif'
      )
    ) {
      //  This demo is limited to image files, to keep things simple.  This is not a limitation of PubNub
      errorMessage('Please choose a JPG, PNG or GIF file')
      return
    } else {
      //  Attachment seems valid, read it in and show a resized version
      var reader = new FileReader()
      reader.readAsDataURL(fileAttachment)
      reader.onload = async readerEvent => {
        var content = readerEvent.target.result
        const img = new Image()
        img.src = content
        img.onload = async () => {
          if (img.height > 100) {
            var newWidth = img.width * (100 / img.height)
            content = await compressImage(content, newWidth, 100)
          }

          //  Bit of a cheat but the easiest way to display the message is to just set it as the message
          //  input box's background.  In a production app, your UX would be far superior!
          document.getElementById('input-message').style.backgroundImage =
            'url(' + content + ')'
          document.getElementById('input-message')
        }
      }
    }

    messageBoxHasImage(true)
  }

  input.click()
}

//  If the user has attached an image, make the input box larger so we can see it at a sensible size
function messageBoxHasImage (hasImage) {
  const msgInput = document.getElementById('input-message')
  if (hasImage) {
    //  disable the message input field
    msgInput.style.height = '100px'
  } else {
    msgInput.style.height = ''
    msgInput.style.backgroundImage = ''
  }
}

//  Resize the image to display it in the preview.  This does not resize the image sent to PubNub
async function compressImage (src, newX, newY) {
  return new Promise((res, rej) => {
    const img = new Image()
    img.src = src
    img.onload = () => {
      const elem = document.createElement('canvas')
      elem.width = newX
      elem.height = newY
      const ctx = elem.getContext('2d')
      ctx.drawImage(img, 0, 0, newX, newY)
      const data = ctx.canvas.toDataURL()
      res(data)
    }
    img.onerror = error => rej(error)
  })
}

//  Uploading a file can take some time, depending on your connection.  Provide
//  feedback to the user.
function messageSendingInProgress (inProgress) {
  if (inProgress) {
    isMessageSendingInProgress = true
    showMessageSendingInProgressSpinner(inProgress)
  } else {
    isMessageSendingInProgress = false
    showMessageSendingInProgressSpinner(inProgress)
  }
}

function showMessageSendingInProgressSpinner(inProgress)
{
  if (inProgress)
    document.getElementById('spinner').style.display = 'block'
  else
    document.getElementById('spinner').style.display = 'none'
}

//  User has pressed the send button or pressed return in the input field.
async function messageInputSend () {
  var messageInput = document.getElementById('input-message')
  var messageText = messageInput.value
  if (isMessageSendingInProgress) {
    //  Prevent duplicate sends
    return
  }
  messageSendingInProgress(true)
  var fileUrl = null
  if (messageInput.style.backgroundImage != '') {
    //  Message contains an image, upload it to PubNub
    //  With large images, it would be far better to perform the upload asynchronously
    //  but this demo keeps things simple
    try {
      //  Upload the file using the PubNub file API
      developerMessage(
        'PubNub allows you to store files, for example, to store Chat file attachments.  File storage is NOT restricted, though this demo does self-impose limits'
      )
      const uploadedFile = await pubnub.sendFile({
        channel: channel,
        file: fileAttachment
      })
      //  Once the file is uploaded, get the URL of the file, stored in PubNub storage.
      //  In production, you would use Access Manager to ensure that only authorized users have access to
      //  desired files.
      fileUrl = await pubnub.getFileUrl({
        channel: channel,
        id: uploadedFile.id,
        name: uploadedFile.name
      })
      //  Upload was successful, test whether we should moderate the image
      //  IN PRODUCTION: You will want to have a PubNub function with event type 'Before Publish File'
      //  Then you can analyse and re-route files which have been moderated to follow up later, or
      //  for archive / record-keeping purposes
      var response = await fetch(
        'https://ps.pndsn.com/v1/blocks/sub-key/' +
          subscribe_key +
          '/moderate?' +
          new URLSearchParams({
            url: fileUrl
          }),
        {
          method: 'GET'
        }
      )
      if (response.ok) {
        //  If response was not ok, the app was probably run against a custom keyset, in which case ignore moderation
        response = await response.text()
        if (response != 'okay') {
          throw new Error('Moderation failed')
        }
      }
    } catch (err) {
      errorMessage('Image moderation failed.')
      fileUrl = null
      console.log(
        'Error uploading attachment, most likely because the image moderation failed ' +
          err
      )
    }
  }
  if (messageText !== '' || fileUrl !== null) {
    try {
      //  Publish the message to PubNub.  Message text plus the URL of any file attachment, which will be null if there is no attachment
      await pubnub.publish({
        channel: channel,
        storeInHistory: true,
        message: {
          content: {
            type: 'text',
            text: messageText,
            attachments: [
              {
                type: 'image',
                image: {
                  source: fileUrl
                }
              }
            ]
          }
        }
      })
    } catch (err) {
      console.log('Error sending message: ' + err)
    }
    messageInput.value = ''
    hideEmojiWindow()
  }
  messageBoxHasImage(false)
  messageSendingInProgress(false)
}

function errorMessage (message) {
  const toastLiveExample = document.getElementById('liveToast')
  const toastBody = document.getElementById('toast-body')
  toastBody.innerText = message
  const toast = new bootstrap.Toast(toastLiveExample)
  toast.show()
}
