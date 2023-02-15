/**
 * Polls are a great way to add interactivity to a live or virtual event and PubNub can provide
 * the underlying communication infrastructure to power your real-time poll, both questions and
 * responses.  
 * IN PRODUCTION: 
 * To keep things private and fair, you will want to use a combination of access manager and 
 * server-side logic to ensure clients only have access to the questions and not any other clients' 
 * response (until and when the response is revealed to the entire audience).  This demo
 * keeps everything local, to keep things transparent and simple.
 * The first step is to broadcast the details of the poll (i.e. the questions and any meta data).
 * Typically this would be on a 'polls.px' channel, where x represents the poll number since your 
 * app could have multiple polls.  (This step is omitted in this demo, questions are stored in 
 * poll-questions.js) and the poll can be submitted at any time.
 * Votes from each client then need to be submitted, this can be done in a number of ways but you need
 * to convey the following information back to the server: Which poll the answer is for, which question 
 * is being answered and which answer is being given.  This demo uses the 'votes.p1' channel since there
 * is only a single poll, then the question and answer are given provided as message data (see the publish() call)
 * Additional server logic: You will need some logic (flag) on your server to ensure each client can only 
 * vote once, as well as allow the user to change their choice, if you want to allow that.  This demo
 * largely skips over these checks to make things more interactive.
 * Results: Once the poll closes, you will want to submit the results to all listening clients on a separate
 * channel, results.px, where x represents the poll number.
 * To learn about questions and provide responses, clients need read access to polls.* and results.*.
 */
const POLLS_CHANNEL_NAME = 'votes.p1'
var currentQuestion = 0
var pollShown = false
var results = {}
const NUM_OPTIONS = 3

function togglePoll () {
  if (pollShown) {
    document.getElementById('poll-container').style.display = 'none'
    currentQuestion++
    if (currentQuestion == pollQuestions.length) currentQuestion = 0
  } else {
    populateNewQuestion(currentQuestion)
  }
  pollShown = !pollShown
}

function populateNewQuestion (index) {
  document.getElementById('poll-option1-radio').disabled = false
  document.getElementById('poll-option2-radio').disabled = false
  document.getElementById('poll-option3-radio').disabled = false
  document.getElementById('poll-question').innerHTML =
    'Poll: ' + pollQuestions[index].question
  document.getElementById('poll-option1').innerHTML =
    pollQuestions[index].option1
  document.getElementById('poll-option2').innerHTML =
    pollQuestions[index].option2
  document.getElementById('poll-option3').innerHTML =
    pollQuestions[index].option3
  document.getElementById('poll-option1-radio').checked = false
  document.getElementById('poll-option2-radio').checked = false
  document.getElementById('poll-option3-radio').checked = false
  populatePercentages()
  document.getElementById('poll-container').style.display = 'block'
}

function pollOptionSelected (ev) {
  //  Option has been selected.  Publish a message saying we have voted for this option
  document.getElementById('poll-option1-radio').disabled = true
  document.getElementById('poll-option2-radio').disabled = true
  document.getElementById('poll-option3-radio').disabled = true

  var channelName = POLLS_CHANNEL_NAME
  pubnub.publish({
    channel: channelName,
    storeInHistory: true,
    message: {
      choice: ev.dataset.opt,
      question: currentQuestion
    }
  })
}

function initPolls() {
  for (var i = 0; i < pollQuestions.length; i++) {
    results[i] = {}
    for (var j = 0; j < NUM_OPTIONS; j++) {
      results[i][j] = 0
    }
  }
}

async function loadHistoricPollVotes () {
  try {
    const history = await pubnub.fetchMessages({
      channels: [POLLS_CHANNEL_NAME],
      count: 100
    })
    if (history.channels[POLLS_CHANNEL_NAME] != null) {
      for (const historicalMsg of history.channels[POLLS_CHANNEL_NAME]) {
        pollVoteReceived(historicalMsg)
      }
    }
  } catch (e) {
    console.log(e)
  }
}

function pollVoteReceived (payload) {
  const choice = parseInt(payload.message.choice)
  results[payload.message.question][choice]++
  populatePercentages()
}

function populatePercentages () {
  var total = 0
  for (var i = 0; i < NUM_OPTIONS; i++) {
    total += results[currentQuestion][i]
  }
  if (total != 0) {
    document.getElementById('poll-option1-pct').innerText = Math.floor(
      (results[currentQuestion][0] / total) * 100
    )
    document.getElementById('poll-option2-pct').innerText = Math.floor(
      (results[currentQuestion][1] / total) * 100
    )
    document.getElementById('poll-option3-pct').innerText = Math.floor(
      (results[currentQuestion][2] / total) * 100
    )
  } else {
    document.getElementById('poll-option1-pct').innerText = 0
    document.getElementById('poll-option2-pct').innerText = 0
    document.getElementById('poll-option3-pct').innerText = 0
  }
}
