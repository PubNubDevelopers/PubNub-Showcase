/**
 * This file contains the logic for handing the typing indicator, which uses PubNub signals to detect whether
 * other members of the active chat are typing or not.  For notes about transitioning
 * between this demo and a production app, see chat.js.
 */

var activeTypers = null
var activeTypersTimer = 0
const TYPING_INDICATOR_TIMEOUT_IN_MSECS = 5000 //  ms

function sendTypingIndicator () {
  developerMessage("You can send signals on every keystroke without worrying about data usage or network issues")
    pubnub.signal({
      message: { id: pubnub.getUserId(), t: 't' },
      channel: channel
    })
  }
  
  function signalReceived (signalObj) {
    if (signalObj.message.t == 't') {
      //  Typing indicator
      if (signalObj.channel == channel) {
        //  User is typing in our active channel.  Note that userData does NOT contain our own ID
        if (userData[signalObj.message.id] != null)
        {
          activeTypers[signalObj.message.id] = signalObj.timetoken;
          evaluateCurrentTypers()
        }
      }
    }
  }
  
  function evaluateCurrentTypers() {
    clearTimeout(activeTypersTimer);
    //  Clear any names who have not typed in X seconds
    var timeAgoTimestamp = (Date.now() - TYPING_INDICATOR_TIMEOUT_IN_MSECS + 100) * 10000
    for (var key in activeTypers) {
      if (activeTypers[key] < timeAgoTimestamp)
      {
        delete activeTypers[key];
      }
      //  Populate the '... is typing' field
      var typersCount = Object.keys(activeTypers).length
      if (typersCount == 0)
      {
        document.getElementById('typingIndicator').style.display = 'none';
      }
      else if (typersCount == 1)
      {
        document.getElementById('typingIndicatorName').innerHTML = userData[key].name;
        document.getElementById('typingIndicatorAvatar').src = userData[key].profileUrl;
        document.getElementById('typingIndicator').style.display = 'block';
      }
      else if (typersCount > 1)
      {
        document.getElementById('typingIndicatorName').innerHTML = "Multiple People are typing";
        document.getElementById('typingIndicator').style.display = 'block';
      }
    }
    if (Object.keys(activeTypers).length > 0)
    {
      activeTypersTimer = setTimeout(evaluateCurrentTypers, (TYPING_INDICATOR_TIMEOUT_IN_MSECS))
    }
  
  }

