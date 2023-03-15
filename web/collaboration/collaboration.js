/**
 * WHERE IS THE REST OF THE CODE?
 * The Collaboration demo within the showcase app is largely based
 * on the standalone collaboration demo (https://www.pubnub.com/demos/codoodler-collaboration-demo/)
 * To avoid duplicating code, most of the functionality such as drawing
 * to the canvas and exchanging messages over PubNub is handled in a shared
 * JS file, app.js.  App.js can be found here: https://github.com/PubNubDevelopers/collaboration-demo/tree/main/js
 * To learn more about how the standalone collaboration demo was built
 * please see tht Tutorial at https://www.pubnub.com/tutorials/collaboration/
 * IN PRODUCTION:
 * - Messages vs. Signals
 * This demo uses PubNub messages to exchange the position of as opposed to Signals.  For more information on the difference
 * between Messages and Signals please see the documentation (https://www.pubnub.com/docs/general/messages/publish#messages-vs-signals)
 * but in summary, Signals are frequently used for very small pieces of data (64bytes) without guaranteed delivery.  As
 * such, Signals are ideal for this kind of collaboration use case but be aware of the rate
 * at which your client can consume data - this demo uses Messages so updates can be chunked together and sent 10 at a
 * time, this reduces the client load since it has to handle fewer messages per second when people are drawing but
 * will come with an increased cost.
 * (Note that If you are very rapidly dragging your mouse across the screen, you can
 * still overwhelm the browser, so you might choose a larger batch size if you expect to send rapid updates over
 * a browser.)
 * Messages vs. Signals is an architectural choice, based on your desired performance,
 * it would obviously be possible to throttle the rate of updates or make
 * the drawings less granular if needed.  PubNub is NOT a bottleneck for the collaboration use case, for full
 * details on PubNub publish and subscribe rate limits, please see https://www.pubnub.com/docs/general/setup/limits
 * - Message Ordering
 * PubNub does not guarantee the order of messages (see this article for more detail:
 * https://support.pubnub.com/hc/en-us/articles/360051494392-Does-PubNub-guarantee-the-order-of-messages-)
 * If order guarantee is required then a sequence number can be added to each message which can then be
 * reconstituted by the receiver, however you can assume with high confidence that messages
 * will be kept in order provided the publish rate is slower than the consumption rate by the receiver.
 * This demo does not make any attempt to ensure the order of messages is correct, though this
 * should not be an issue in normal use.
 * - Presence
 * Although the showcase variant of this demo does not show the number of online users present, the
 * demo itself still makes heavy use of pubnub.setState() to maintain the position of the user's cursor.
 * https://www.pubnub.com/docs/sdks/javascript/api-reference/presence#user-state
 * (this is also used for convenience in this showcase demo to duplicate the user's nickname and avatar URL)
 * For this reason, you will need to have presence enabled on your keyset to use this app.
 * In summary:
 * Cursor position and user name are tracked using setState(), part of PubNub presence
 * The canvas drawing is exchanged between all users using PubNub Messages (see earlier notes about Signals)
 * NOTES ON MOBILE:
 * This collaboration application will work on mobile but there are some quirks:
 * - When drawing with another user who has a larger canvas, for example the other user has a desktop, you may
 *   see the position of the colours change as the canvas expands to account for the other user's drawing
 * - Your name and cursor position are not shown on mobile but the other user, if they are on desktop, will
 *   see your name only in the initial mouse position - it will not move.  This is specific to a desktop user
 *   viewing a mouse user.
 */

//  The following variables configure the collaboration application to work within the showcase app
const IDLE_TIMEOUT = false //  Do not timeout
const USE_OBJECTS_METADATA = true //  Pull the user's name and avatar from Object storage
const ALWAYS_DRAW_RECEIVED_POINTS = true //  If the user duplicates the tab, still have the drawing show up and don't duplicate anything
const DRAW_WIDTH = 6 //  Pen width
const PENCIL_IMAGE = 'images/pencil2.png' //  Pencil icon
const PENCIL_WIDTH = '22px' //  Pencil icon
const PENCIL_HEIGHT = '22px' //  Pencil icon
const PENCIL_TRANSFORM = 'rotate(0deg)' //  Pencil icon
const PENCIL_X_OFFSET = 125 //  Pencil icon
const PENCIL_Y_OFFSET = 125 //  Pencil icon
const PENCIL_SPRITE_X_ADJUST = 2 //  Pencil icon
const PENCIL_SPRITE_Y_ADJUST = 80 //  Pencil icon

// PubNub Connection Object, this is provided by the common showcase functionality
pubnub = createPubNubObject()

async function loadCollaboration () {
  if (window.innerWidth > 576)
  {
    //  Running on desktop, make the canvas smaller so easier to manage when interacting with mobile
    var canvas = document.getElementById('drawCanvas')
    var head = document.getElementById('heading')
    canvas.style.top = (head.offsetHeight + 10);
    var canvasWidth = window.innerWidth / 1.5
    canvas.width = canvasWidth;
    var canvasHeight = window.innerHeight / 1.5
    canvas.height = canvasHeight
    canvas.style.background = "#E5E5E5"
    var ctx = canvas.getContext('2d')
    ctx.lineCap = ctx.lineJoin = 'round'
  }
  if (!(await testForLoggedInUser()))
  {
    //  User is not logged in, return them to the index
    window.location.href = '../index.html';
  }
  developerMessage("PubNub is designed to exchange messages at large scale in real-time, so you can even implement a collaborative drawing application.")
  developerMessage("This demo uses a combination of publish / subscribe messages as well as the setState presence API to exchange drawing data and mouse positions respectively")
  developerMessage("You might see some visual quirks if collaborating between a desktop and mobile user but this is NOT a limitation of PubNub, only a limitation of this demo")
}

//  This function has no purpose within the showcase app, colours are all handled by CSS
function setRandomSpriteColor () {
  return
}

//  This function has no purpose within the showcase app, this is only used for the standalone demo
function actionCompleted () {
  return
}
