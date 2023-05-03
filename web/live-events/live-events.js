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
 * that using the flexible Functions.  Whilst this demo has moderation for bad language, there is no spam
 * moderation since all messages have a limited lifetime.
 * PubNub is very flexible and we have a wide variety of live events customers, with a proven track
 * record of supporting live events of any scale, please contact our support team to discuss your individual needs
 */

//  Connection to the PubNub API
var pubnub = null
const LIVE_EVENT_CHANNEL = 'live-event-1'
//  Our own data, populated synchronously on startup
var me = null
const MAX_MESSAGES_SHOWN_PER_CHAT = 100

//  Called when the page is loaded
async function loadLiveEvents () {
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
    },
    message: payload => {
      //  Received a message.  This will either be a message from the live events chat
      //  (either our message or a message from a bot) or it might be a poll response.
      //  See the poll.js file for more information on how polls should be handled.
      if (payload.channel === LIVE_EVENT_CHANNEL) messageReceived(payload)
      else if (payload.channel === POLLS_CHANNEL_NAME) pollVoteReceived(payload)
    },
    signal: signalEvent => {
      //  Received a signal.  The live events app only uses signals for live reactions.
      //  Signals are ideally suited for live reactions (i.e. displaying an emoji on top
      //  of the live event) since they have a very small data payload
      developerMessage("Live (emoji) Message Reactions are sent over PubNub efficiently using the Signal API")
      receiveReaction(signalEvent.message.r)
    }
  })

  //  Subscribe to messages both for the live events chat (single channel since this is a single live feed)
  //  Also subscribe to any message related to the polls (votes.*) - see polls.js for more information.
  pubnub.subscribe({
    channels: [LIVE_EVENT_CHANNEL, 'votes.*'],
    withPresence: true
  })

  //  Polls data is stored in history to make the demo more interactive.  Live event chat messages are not stored
  //  in history, a design decision for this app, not a limitation of the PubNub SDK
  loadHistoricPollVotes()
}

//  Wrapper around PubNub App Context getUUIDMetadata and set up our internal cache for this data
async function getUserMetadataSelf () {
  try {
    const result = await pubnub.objects.getUUIDMetadata({
      uuid: pubnub.getUserId()
    })
    me = result.data
  } catch (e) {
    //  Some error retrieving our own meta data - probably the App Context was deleted, therefore log off (possible duplicate tab)
    location.href = '../index.html'
  }
}

//  Message called when the user presses the send button or hits return
async function messageInputSend () {
  var messageInput = document.getElementById('input-message')
  var messageText = messageInput.value
  if (messageText !== '') {
    try {
      /*
        Compare the code below with the Chat demo.  The avatar and name are sent along with the message.
        Whilst this makes it harder to design a UI to update old messages when a user changes their name or avatar URL
        this is an uncommon use case for live events with a *very high* quantity of messages.  The avatar and name is sent
        along with the message, to make it easier to retrieve this data at the other end.
        */
        developerMessage("PubNub will be able to cope with whatever speed you can publish messages to the network, but you should consider how fast your users will be able to read or interact with your messages")
      await pubnub.publish({
        channel: LIVE_EVENT_CHANNEL,
        storeInHistory: false,  //  In this app, we don't persist live events chat messages
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

//  A chat message is received (this also handles messages we send ourselves to keep the logic consistent)
function messageReceived (messageObj) {
  var messageDiv = createMessage(messageObj, messageObj.publisher == me.id)
  var messageListContents = document.getElementById('messageListContents')
  if (messageListContents.children.length >= MAX_MESSAGES_SHOWN_PER_CHAT) {
    messageListContents.removeChild(messageListContents.children[0])
  }
  var messageList = document.getElementById('messageList')
  messageListContents.appendChild(messageDiv)
  messageList.scrollTop = messageList.scrollHeight;
}

//////////////////////
//  Generate the HTML for messages

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

function imgPollHover(isHover)
{
  var pollIcon = document.getElementById('imgPoll')
  if (isHover)
  {
    pollIcon.src = '../img/icons/poll-hover.png'
  }
  else
  {
    pollIcon.src = '../img/icons/poll.png'
  }
}

function addReaction()
{
  pubnub.signal({
    message: { r: String.fromCodePoint(0x1F60D) },
    channel: LIVE_EVENT_CHANNEL
  })
}

function receiveReaction(emoji)
{
  const rhs = document.getElementById('rhs')
  const rhsRect = rhs.getBoundingClientRect()
  const reactionNode = document.createElement('div')
  reactionNode.className = 'reaction'
  reactionNode.innerHTML = emoji
  var leftPos = Math.floor(Math.random() * (rhsRect.right - rhsRect.left -10) + rhsRect.left)
  reactionNode.style.setProperty('left', leftPos);
  rhs.appendChild(reactionNode);
  setTimeout(() => {rhs.removeChild(reactionNode)}, 3000)
}
