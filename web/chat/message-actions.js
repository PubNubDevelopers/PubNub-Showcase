/**
 * This file contains logic related to Message actions, which provide the functionality
 * for read receipts and 'emoji' reactions in this demo.  For notes about transitioning
 * between this demo and a production app, see chat.js.
 */

//  Cache the receipt for any in-flight message, to avoid timing issues where receipts are received before messages
var inflightReadReceipt = {}
var messageReactions = {}

//  Called by the message action handler - an action has been added to the message
//  indicating the message has been read
function maReadReceipt (messageActionEvent) {
  var messageCheckElement = document.getElementById(
    'message-check-' + messageActionEvent.data.messageTimetoken
  )
  if (messageCheckElement != null) {
    if (
      messageActionEvent.event == 'added' &&
      messageActionEvent.data.type == 'read'
    ) {
      //  This demo has a simplistic implementation of read receipts, see full details at the top of chat.js
      messageCheckElement.src = '../img/icons/read.png';
    }
  } else {
    inflightReadReceipt[messageActionEvent.data.messageTimetoken] = true
  }
}

//  Called by the message action handler - an action has been added to the message
//  indicating the message needs an emoji
//  This demo is very simple, you can just add a smiley to a message but in a production
//  chat app this would be a lot more functional!  This is a design decision of the demo
//  to keep things simple, not a limitation of PubNub.
function maEmojiReaction (messageActionEvent) {
  var messageReactionContainer = document.getElementById(
    'emoji-reactions-' + messageActionEvent.data.messageTimetoken
  )
  if (messageReactionContainer == null)
  {
    //  Reaction is against a message not present in this chat
    return;
  }
  var countElement = document.getElementById(
    'emoji-reactions-' + messageActionEvent.data.messageTimetoken + '-count'
  )

  if (
    messageActionEvent.event == 'added' &&
    messageActionEvent.data.type == 'react'
  ) {
    if (
      typeof messageReactions[messageActionEvent.data.messageTimetoken] ===
      'undefined'
    ) {
      messageReactions[messageActionEvent.data.messageTimetoken] = 1
    } else {
      messageReactions[messageActionEvent.data.messageTimetoken]++
    }
  } else if (
    messageActionEvent.event == 'removed' &&
    messageActionEvent.data.type == 'react'
  ) {
    if (
      typeof messageReactions[messageActionEvent.data.messageTimetoken] ===
      'undefined'
    ) {
      messageReactions[messageActionEvent.data.messageTimetoken] = 0
    } else {
      messageReactions[messageActionEvent.data.messageTimetoken]--
    }
  }
  else {
    //  Don't handle anything that is not a reaction
    return;
  }

  countElement.innerText =
    messageReactions[messageActionEvent.data.messageTimetoken]
    if (messageReactions[messageActionEvent.data.messageTimetoken] <= 0)
    {
      messageReactionContainer.classList.remove('temp-always-visible')
    }
    else
    {
      messageReactionContainer.classList.add('temp-always-visible')
    }
}

//  User has right clicked on a message (or long pressed on mobile), hard code reacting to this with a smiley emoji
async function maAddEmojiReaction (messageId) {
  var messageElement = document.getElementById('emoji-reactions-' + messageId)
  var countElement = document.getElementById(
    'emoji-reactions-' + messageId + '-count'
  )
  if (messageElement.classList.contains('temp-message-reacted')) {
    //  We have already reacted to this message, remove the reaction
    try {
      developerMessage("Message Actions can be added or removed, based on a unique timetoken.  One message can have multiple actions, visible to anyone with access to the channel")
      const result = await pubnub.removeMessageAction({
        channel: channel,
        messageTimetoken: messageId,
        actionTimetoken: messageElement.dataset.actionid
      })
      messageElement.classList.remove('temp-message-reacted')
    } catch (status) {
      console.log(status)
    }
  } else {
    try {
      const result = await pubnub.addMessageAction({
        channel: channel,
        messageTimetoken: messageId, //  We use the timetoken as our chat's message Id already
        action: {
          type: 'react',
          value: 'smile'
        }
      })
      messageElement.dataset.actionid = result.data.actionTimetoken
      messageElement.classList.add('temp-message-reacted')
    } catch (e) {
      console.log(
        'Failed to add message action - do you have persistence applied on your keyset?'
      )
    }
  }
}
