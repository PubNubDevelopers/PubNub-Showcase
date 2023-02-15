/**
 * IN PRODUCTION: 
 * This demo only uses a single channel for the live event (1 channel for 1 video stream).  
 * In prodution, you would have multiple streams, and the channel topology will be more complex, 
 * depending on how many users are in your chat and the kind of chat experience you want for those users.
 * Some considerations when designing your chat user experience for live events:
 * - How many people will you have in each stream (or room, depending on your app)?
 * - Do you want messages to be readable by the audience?  Or is the chat just 'reactions' to an event
 * - If you want messages to be readable, how will the message flow be controlled?  (lossy / lossless?)
 * If you want messages to be readable, you should limit the message rate to about 1 message per second.  
 * There are a number of ways of limiting message rate, including organizing participants into cohorts, 
 * or sharding your rooms.
 * You will also need to ensure you have a degree of spam prevention for your chat, you can easily implement
 * that using the flexible PubNub Functions.  Whilst this demo has moderation for bad language, there is no spam
 * moderation since all messages have a limited lifetime.
 * PubNub is very flexible and we have a wide variety of virtual events customers, with a proven track 
 * record of supporting live events of any scale, please contact our support team to discuss your individual needs
 */  

//  Connection to the PubNub API
var pubnub = null
const VIRTUAL_EVENT_CHANNEL = 'live-event-1'
//  Our own data, populated synchronously on startup
var me = null
const MAX_MESSAGES_SHOWN_PER_CHAT = 100

async function loadVirtualEvents () {
  //  Called when the page is loaded
  //  Handle Message input
  document
    .getElementById('input-message')
    .addEventListener('keypress', function (event) {
      if (event.key === 'Enter') {
        messageInputSend()
      }
    })

  pubnub = createPubNubObject()
  await getUserMetadataSelf()
  initPolls()

  //  Add an event listener for the channel
  pnListener = pubnub.addListener({
    //  Status events
    status: statusEvent => {
      //console.log(statusEvent)
    },
    message: payload => {
      if (payload.channel === VIRTUAL_EVENT_CHANNEL) messageReceived(payload)
      else if (payload.channel === POLLS_CHANNEL_NAME) pollVoteReceived(payload)
    }
  })

  pubnub.subscribe({
    channels: [VIRTUAL_EVENT_CHANNEL, 'votes.*'],
    withPresence: true
  })

  loadHistoricPollVotes();
}

//  Wrapper around pubnub objects getUUIDMetadata and set up our internal cache
async function getUserMetadataSelf () {
  try {
    const result = await pubnub.objects.getUUIDMetadata({
      uuid: pubnub.getUserId()
    })
    me = result.data
  } catch (e) {
    //  Some error retrieving our own meta data - probably the objects were deleted, therefore log off (possible duplicate tab)
    location.href = '../index.html'
  }
}

async function messageInputSend () {
  var messageInput = document.getElementById('input-message')
  var messageText = messageInput.value
  if (messageText !== '') {
    try {
      /*
        Compare the code below with the Chat demo, the avatar and name are sent along with the message.
        Whilst this makes it harder to design a UI to update old messages when a user changes their name or avatar URL
        this is an uncommon use case for virtual events with a very high quantity of messages.  The avatar and name is sent
        along with the message, to make it easier to retrieve this data at the other end. 
        */
      await pubnub.publish({
        channel: VIRTUAL_EVENT_CHANNEL,
        storeInHistory: false,
        message: {
          message: messageText,
          avatar: me.profileUrl,
          name: me.name
        }
      })
    } catch (err) {
      console.log('Error sending message: ' + err)
    }
    messageInput.value = ''
    hideEmojiWindow()
  }
}

function messageReceived (messageObj) {
  var messageDiv = createMessage(messageObj, messageObj.publisher == me.id)

  var messageListDiv = document.getElementById('messageListContents')
  if (messageListDiv.children.length >= MAX_MESSAGES_SHOWN_PER_CHAT) {
    messageListDiv.removeChild(messageListDiv.children[0])
  }
  document.getElementById('messageListContents').appendChild(messageDiv)
}

//////////////////////
//  Generate the HTML for message objects

function createMessage (messageObj, fromSelf) {
  var youClass = ''
  var youText = ''
  if (fromSelf) {
    youClass = ' ve-nickname-you'
    youText = ' (You)'
  }
  var newMsg = document.createElement('div')
  newMsg.id = messageObj.timetoken
  newMsg.className = 've-message-container'
  newMsg.innerHTML =
    "<img class='ve-avatar' src='" +
    messageObj.message.avatar +
    "'><div class='ve-nickname" +
    youClass +
    "'>" +
    messageObj.message.name +
    youText +
    "</div><div class='ve-message'>" +
    messageObj.message.message +
    '</div>'
  return newMsg
}
