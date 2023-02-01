var inflightReadReceipt = {}

function maReadReceipt (messageActionEvent) {
  var messageCheckElement = document.getElementById(
    'message-check-' + messageActionEvent.data.messageTimetoken
  )
  if (messageCheckElement != null) {
    if (
      messageActionEvent.event == 'added' &&
      messageActionEvent.data.type == 'read'
    ) {
      messageCheckElement.classList.remove('bi-check')
      messageCheckElement.classList.add('bi-check-all')
    }
  }
  else
  {
    inflightReadReceipt[messageActionEvent.data.messageTimetoken] = true;
  }
}

function maEmojiReaction (messageActionEvent) {
  var messageEmojiElement = document.getElementById(
    'emoji-reactions-' + messageActionEvent.data.messageTimetoken
  )
  if (messageEmojiElement != null) {
    if (
      messageActionEvent.event == 'added' &&
      messageActionEvent.data.type == 'react'
    ) {
      messageEmojiElement.innerHTML += String.fromCodePoint(0x1f642)
    } else if (
      messageActionEvent.event == 'removed' &&
      messageActionEvent.data.type == 'react'
    ) {
      if (messageEmojiElement.innerHTML.length > 0) {
        var newString = messageEmojiElement.innerHTML.substring(
          0,
          messageEmojiElement.innerHTML.length - 2
        )
        console.log(newString)
        messageEmojiElement.innerHTML = newString
      }
    }
  }
}

async function maAddEmojiReaction (messageId) {
  //  User has right clicked on a message, hard code reacting to this with a 🙂 emoji
  var messageElement = document.getElementById('emoji-reactions-' + messageId)
  if (messageElement.classList.contains('message-reacted')) {
    console.log('remove reaction')
    //  We have already reacted to this message, remove the reaction
    try {
      const result = await pubnub.removeMessageAction({
        channel: channel,
        messageTimetoken: messageId,
        actionTimetoken: messageElement.dataset.actionid
      })
      messageElement.classList.remove('message-reacted')
    } catch (status) {
      //  todo some error
      console.log(status)
    }
  } else {
    try {
      console.log('add reaction')
      const result = await pubnub.addMessageAction({
        channel: channel,
        messageTimetoken: messageId, //  We use the timetoken as our chat's message Id already
        action: {
          type: 'react',
          value: 'smile'
        }
      })
      messageElement.dataset.actionid = result.data.actionTimetoken
      messageElement.classList.add('message-reacted')
    } catch (e) {
      //  todo Also needs the persistence add-on
      console.log(
        'Failed to add message action - do you have persistence applied on your keyset?'
      )
    }
  }
}
