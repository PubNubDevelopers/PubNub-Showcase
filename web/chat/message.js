async function messageReceived (messageObj) {
  try {
    //console.log(messageObj)
    if (messageObj.channel != channel) {
      //  The message has been recevied on a channel we are not currently viewing, update the unread message indicators
      incrementChannelUnreadCounter(messageObj.channel)
      return
    }

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
    if (messageObj.publisher == pubnub.getUserId()) {
      //  If the read receipt was added as a message action before we could draw the message, do that now
      var messageIsRead = false
      if (
        inflightReadReceipt[messageObj.timetoken] != null &&
        inflightReadReceipt[messageObj.timetoken] == true
      ) {
        messageIsRead = true
      }
      messageDiv = createMessageSent(messageObj, messageIsRead)
      addContextHandler(messageDiv, onContextHandler)
    } else {
      messageDiv = createMessageReceived(messageObj)
      addContextHandler(messageDiv, onContextHandler)

      //  Add a message action that we have read the message, if one does not already exist.
      //  This is very simplistic, once any user has read the message in the group, the message is marked as read
      //  In production, you will want to have separate read receipts for each individual
      if (messageObj.actions == null || messageObj.actions.read == null) {
        //  We did not find a read message action for our message, add one
        pubnub.addMessageAction({
          channel: channel,
          messageTimetoken: messageObj.timetoken,
          action: {
            type: 'read',
            value: pubnub.getUserId()
          }
        })
      }
    }

    //  Limit the number of messages shown in the chat window
    var messageListDiv = document.getElementById('messageListContents')
    if (messageListDiv.children.length >= MAX_MESSAGES_SHOWN_PER_CHAT) {
      messageListDiv.removeChild(messageListDiv.children[0])
    }
    document.getElementById('messageListContents').appendChild(messageDiv)

    scrollChatToEnd()

    //  todo create long press handler for this message
  } catch (e) {
    console.log('Exception during message reception: ' + e)
  }
}

//////////////////////
//  Generate the HTML for message objects

function createMessageSent (messageObj, messageIsRead) {
  var readIcon = 'bi-check'
  if (messageIsRead) {
    readIcon = 'bi-check-all'
  }
  var profileUrl = '../img/avatar/placeholder.png'
  var name = 'pending...'
  if (channelMembers[messageObj.publisher] != null) {
    profileUrl = channelMembers[messageObj.publisher].profileUrl
    name = channelMembers[messageObj.publisher].name
  }
  var newMsg = document.createElement('div')
  newMsg.id = messageObj.timetoken
  newMsg.className = 'message message-you align-self-end'
  newMsg.innerHTML =
    ' \
    ' +
    messageObj.message.message +
    " <div id='emoji-reactions-" +
    messageObj.timetoken +
    "' class='message-reaction' style='display:inline' data-actionid=''></div> \
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
            <div class='' style='text-align:right'> \
                <span class='messageCheck'><i id='message-check-" +
    messageObj.timetoken +
    "' class='bi " +
    readIcon +
    "'></i></span> \
                <div class='message-sender'>" +
    name +
    " (You)</div> \
      <div class='message-time'>" +
    convertTimetokenToDate(messageObj.timetoken) +
    '</div> \
            </div> \
        </div> \
    </div>'
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
  newMsg.className = 'message message-them align-self-start'
  newMsg.innerHTML =
    "<div class='user-with-presence float-start mx-2'> <img src='" +
    profileUrl +
    "' class='chat-list-avatar'> <span class='presence-dot-none'></span> </div><span class='messageCheck'><i id='message-check-" +
    messageObj.timetoken +
    "' class='bi bi-check-all'></i></span>" +
    messageObj.message.message +
    " <div id='emoji-reactions-" +
    messageObj.timetoken +
    "' class='message-reaction' style='display:inline' data-actionid=''></div>" +
    "<div class='message-sender' style='display:block'>" +
    name +
    "</div> \
      <div class='message-time' style='display:inline'>" +
    convertTimetokenToDate(messageObj.timetoken) +
    '</div></div>'
  return newMsg
}

//////////////////////
//  Mesasge count logic

async function updateMessageCountFirstLoad () {
  var lastLoadTimestamp = sessionStorage.getItem('chatLastLoadTimestamp')
  if (lastLoadTimestamp == null) {
    //  This is the first load after log-in, load all messages in the last 24 hours
    var oneDayAgoTimestamp = (Date.now() - 24 * 60 * 60 * 1000) * 10000
    lastLoadTimestamp = oneDayAgoTimestamp
  }
  sessionStorage.setItem('chatLastLoadTimestamp', Date.now() * 10000)
  try {
    const result = await pubnub.messageCounts({
      channels: [subscribedChannels],
      channelTimetokens: [lastLoadTimestamp]
    })
    for (var key in result.channels) {
      setChannelUnreadCounter(key, result.channels[key])
    }
  } catch (status) {
    console.log(status)
  }
}

function incrementChannelUnreadCounter (channel) {
  //  Just use the span text to track the current value and incremenet it (indicated by -1)
  setChannelUnreadCounter(channel, -1)
}

function setChannelUnreadCounter (channel, count) {
  try {
    channel = channel.replace(pubnub.getUserId(), '')
    channel = channel.replace('DM.', '')
    channel = channel.replace('&', '')
    var unreadMessage = document.getElementById('unread-' + channel)
    if (count == -1) {
      //  Increment current count by 1
      var currentCount = unreadMessage.innerText
      if (currentCount == '') currentCount = 0
      else currentCount = parseInt(currentCount)
      count = currentCount + 1
    }
    unreadMessage.innerText = count
    if (count == 0) {
      //  No unread messages - hide the unread message counter
      unreadMessage.style.visibility = 'hidden'
    } else {
      unreadMessage.style.visibility = 'visible'
    }
  } catch (e) {
    //  Probably called whilst the page is still loading
  }
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
