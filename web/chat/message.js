/**
 * This file contains logic for receiving messages and converting them into a user-readable form.
 * For notes about transitioning between this demo and a production app, see chat.js.
 */

//  Handler for the PubNub message event
async function messageReceived (messageObj, isFromHistory) {
  try {
    if (messageObj.channel != channel) {
      //  The message has been recevied on a channel we are not currently viewing, update the unread message indicators
      incrementChannelUnreadCounter(messageObj.channel)
      return
    }
    if (messageObj.message.message == null) {
      //  The message does not have any text associated with it (for example, it is a file
      //  which has trigged this function as a result of pubnub.sendFile())
      return
    }

    //  If we don't have the information about the message sender cached, retrieve that from App Context and update our cache
    if (channelMembers[messageObj.publisher] == null) {
      try {
        var result = await getUUIDMetaData(messageObj.publisher)
        if (result != null) {
          addUserToCurrentChannel(
            messageObj.publisher,
            result.data.name,
            result.data.profileUrl
          )
        }
        
      } catch (e) {
        //  Lookup of unknown uuid failed - they probably logged out and cleared App Context
        addUserToCurrentChannel(
          messageObj.publisher,
          "Unknown",
          DEFAULT_AVATAR
        )
      }
    }

    if (channelMembers[messageObj.publisher].profileUrl == DEFAULT_AVATAR)
    {
      //  The 'users' array is still the master list of users we have in the system but for expediency
      //  & to ensure things don't get out of sync, redact the message contents based on the channelMembers
      //  array.
      messageObj.message.attachment = null
      messageObj.message.message = 'User has logged out'
    }

    var messageDiv = ''
    if (messageObj.publisher == pubnub.getUserId()) {
      //  If the read receipt was added as a message reaction before we could draw the message, do that now
      var messageIsRead = false
      if (
        inflightReadReceipt[messageObj.timetoken] != null &&
        inflightReadReceipt[messageObj.timetoken] == true
      ) {
        messageIsRead = true
      }
      //  The sent and received messages have slightly different styling, ergo different HTML
      messageDiv = createMessageSent(messageObj, messageIsRead)
      //  Add click and long press handler to the message.
      addContextHandler(messageDiv, onContextHandler)
    } else {
      //  The sent and received messages have slightly different styling, ergo different HTML
      messageDiv = createMessageReceived(messageObj)
      //  Add click and long press handler to the message.
      addContextHandler(messageDiv, onContextHandler)

      //  Add a message reaction that we have read the message, if one does not already exist.
      //  This is very simplistic, once ANY user in the recipient group has read the message, the message is marked as read
      //  In production, you will want to have separate read receipts for each individual in the group
      if (messageObj.actions == null || messageObj.actions.read == null) {
        //  We did not find a read message reaction for our message, add one
        developerMessage(
          'PubNub Message Reactions are ideal for send / delivered / read receipts'
        )
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

    //  Update the last read time for the channel on which the message was received
    if (!isFromHistory) {
      setChannelLastReadTimetoken(channel, messageObj.timetoken)
    }

    //  Limit the number of messages shown in the chat window
    var messageListDiv = document.getElementById('messageListContents')
    if (messageListDiv.children.length >= MAX_MESSAGES_SHOWN_PER_CHAT) {
      messageListDiv.removeChild(messageListDiv.children[0])
    }

    document.getElementById('messageListContents').appendChild(messageDiv)

    //  Event listener for the message reaction button
    document
      .getElementById('emoji-reactions-' + messageObj.timetoken)
      .addEventListener('click', () => {
        maAddEmojiReaction(messageObj.timetoken)
      })
  } catch (e) {
    console.log('Exception during message reception: ' + e)
  }
}

//////////////////////
//  Generate the HTML for messages

//  HTML for messages we have sent ourselves
function createMessageSent (messageObj, messageIsRead) {
  var readSrc = '../img/icons/sent.png'
  if (messageIsRead) {
    readSrc = '../img/icons/read.png'
  }
  var profileUrl = '../img/avatar/placeholder.png'
  var name = 'pending...'
  if (channelMembers[messageObj.publisher] != null) {
    profileUrl = channelMembers[messageObj.publisher].profileUrl
    name = channelMembers[messageObj.publisher].name
  }
  var newMsg = document.createElement('div')
  newMsg.id = messageObj.timetoken
  newMsg.className =
    'text-body-2 temp-message-container temp-message-container-me'
  newMsg.innerHTML = `
  <div class="text-body-2 temp-message-container temp-message-container-me ninetyPercent">
    <div class="temp-message temp-mesage-me">
        <div class="temp-message-meta-container temp-message-meta-container-me">
            <div class="text-caption temp-message-meta-time">
                ${convertTimetokenToDate(messageObj.timetoken)}
            </div>
        </div>
        <div class="temp-message-bubble temp-message-bubble-me">
            ${messageContents(messageObj.message)}
            <div class="temp-read-indicator">

                <div class="temp-message-reaction-rel-container">
                    <div class="temp-message-reaction-abs-container">
                        <div id='emoji-reactions-${
                          messageObj.timetoken
                        }' class="temp-message-reaction-display-container">
                            <div class="temp-message-reaction-display">
                                <img src='../img/icons/smile.png' height='18'><span id='emoji-reactions-${
                                  messageObj.timetoken
                                }-count' class="text-caption temp-message-reaction-number">0</span>
                            </div>
                        </div>
                    </div>

                </div>
                <img class="temp-read-indicator-me" id='message-check-${
                  messageObj.timetoken
                }'
                    src="${readSrc}" height="10px">
            </div>
        </div>
    </div>
</div>`

  return newMsg
}

//  HTML for messages we have received
function createMessageReceived (messageObj) {
  var profileUrl = '../img/avatar/placeholder.png'
  var name = 'Unknown'
  var extraReceiptStyle = ''
  if (messageObj.channel.startsWith('DM.') || messageObj.channel.includes('-iot')) {
    //  Hide read receipts in direct chats and the private IoT chat
    extraReceiptStyle = 'hidden'
  }
  if (channelMembers[messageObj.publisher] != null) {
    profileUrl = channelMembers[messageObj.publisher].profileUrl
    name = channelMembers[messageObj.publisher].name
  }
  var newMsg = document.createElement('div')
  newMsg.id = messageObj.timetoken
  newMsg.className =
    'text-body-2 temp-message-container temp-message-container-you'
  newMsg.innerHTML = `
  <div class='temp-message-avatar'>
  <img src='${profileUrl}' class='chat-list-avatar temp-message-avatar-img'>
  </div>
  <div class='temp-message temp-mesage-you'>
  <div class='temp-message-meta-container temp-message-meta-container-you'>
      <div class='text-caption temp-message-meta-name'>
          ${name}
      </div>
      <div class='text-caption temp-message-meta-time'>
      ${convertTimetokenToDate(messageObj.timetoken)}
      </div>
  </div>
  <div class='temp-message-bubble temp-message-bubble-you'>
      ${messageContents(messageObj.message)}
      <div class='temp-read-indicator'>
          <div class='temp-message-reaction-rel-container'>
              <div class='temp-message-reaction-abs-container'>
                  <div id='emoji-reactions-${
                    messageObj.timetoken
                  }' class='temp-message-reaction-display-container' data-actionid=''>
                      <div class='temp-message-reaction-display'>
                          <img src='../img/icons/smile.png' height='18'><span id='emoji-reactions-${
                            messageObj.timetoken
                          }-count' class='text-caption temp-message-reaction-number'>0</span>
                      </div>
                  </div>
              </div>
          </div>
          <img id='message-check-${
            messageObj.timetoken
          }' class='${extraReceiptStyle}' src='../img/icons/read.png' height='10px'>
      </div>
  </div>
</div>
  `

  return newMsg
}

//  Wrapper function to cater for whether the message had an associated image
function messageContents (messageData) {
  if (messageData.attachment != null) {
    //  There was an image attachment with the message
    var imageRender =
      `<img class='temp-message-img temp-message-img-you' src='${messageData.attachment}'>` +
      `${messageData.message}`
    return imageRender
  } else {
    return messageData.message
  }
}

function messageReactionClicked (messageId) {
  maAddEmojiReaction(messageId)
}

//////////////////////
//  Mesasge count logic

//  Use the pubnub.messageCounts() API to determine how many unread messages there are in each channel
//  that were received prior to us subscribing to the channel.
async function updateMessageCountFirstLoad () {
  var oneDayAgoTimestamp = (Date.now() - 24 * 60 * 60 * 1000) * 10000
  //  Obtain the 'last read time' for each channel we are a member of
  pubnub.objects
    .getMemberships({
      include: {
        customFields: true
      }
    })
    .then(membershipData => {
      //  Create a hash of the channels which have a last read time
      var channelTimestamps = {}
      for (var channelMembership in membershipData.data) {
        var memberData = membershipData.data[channelMembership]
        if (
          memberData.custom != null &&
          memberData.custom.lastReadTimetoken != null
        ) {
          channelTimestamps[memberData.channel.id] =
            memberData.custom.lastReadTimetoken
        }
      }
      //  Create an array of channel timetokens
      var lastLoadTimestamps = []
      for (var subscribedChannel in subscribedChannels) {
        if (
          typeof channelTimestamps[subscribedChannels[subscribedChannel]] ===
          'undefined'
        ) {
          lastLoadTimestamps.push('' + oneDayAgoTimestamp)
        } else {
          lastLoadTimestamps.push(
            '' + channelTimestamps[subscribedChannels[subscribedChannel]]
          )
        }
      }
      //  lastLoadTimestamps now contains the last read time for each channel, or 0 if it has not been read
      developerMessage(
        'PubNub has a dedicated API to return the number of messages received since a given time, ideal to keep track of unread message counts'
      )
      pubnub
        .messageCounts({
          channels: subscribedChannels,
          channelTimetokens: lastLoadTimestamps
        })
        .then(result => {
          for (var key in result.channels) {
            //  Do not display the unread counter if we are currently viewing the channel
            if (channel != key) {
              setChannelUnreadCounter(key, result.channels[key])
            }
          }
        })
    })
}

function incrementChannelUnreadCounter (channel) {
  //  Just use the span text to track the current value and increment it (indicated by -1)
  setChannelUnreadCounter(channel, -1)
}

//  Update unread message indicator for the specified channel
function setChannelUnreadCounter (channel, count) {
  try {
    if (!channel.includes('Private.'))
    {
      channel = channel.replace(pubnub.getUserId(), '')
      channel = channel.replace('DM.', '')
      channel = channel.replace('&', '')
    }
    var unreadMessage = document.getElementById('unread-' + channel)
    if (unreadMessage == null) {
      return
    }
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
    console.log(e)
  }
}

var months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]
//  Convert PubNub timetoken to a human readable date
function convertTimetokenToDate (timetoken) {
  var timestamp = new Date(timetoken / 10000)
  var hours = timestamp.getHours()
  var ampm = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12
  hours = hours ? hours : 12
  return (
    months[timestamp.getMonth()] +
    ' ' +
    (timestamp.getDay() + '').padStart(2, '0') +
    ' - ' +
    (hours + '').padStart(2, '0') +
    ':' +
    (timestamp.getMinutes() + '').padStart(2, '0') +
    ampm
  )
}
