# PubNub Showcase application

## Demo

A hosted version of this demo can be found at **[https://showcase.pubnub.com/](https://showcase.pubnub.com/)**

![Screenshot](https://raw.githubusercontent.com/PubNubDevelopers/PubNub-Showcase/main/media/landing.png)

## Features of the Showcase and PubNub APIs used

| Demo | Description | PubNub APIs used |
| ---- | --- | ---------------- |
| Chat | Uses the PubNub SDK to show how a chat application could be implemented, with features such as group In-App Messaging, typing indicators, message reactions, unread message counts and presence indicators. |  [Publish & Subscribe](https://www.pubnub.com/docs/sdks/javascript/api-reference/publish-and-subscribe), [Presence](https://www.pubnub.com/docs/sdks/javascript/api-reference/presence), [Message Persistence](https://www.pubnub.com/docs/sdks/javascript/api-reference/storage-and-playback) (for Message Persistence & unread message counts), [App Context](https://www.pubnub.com/docs/sdks/javascript/api-reference/objects) (Modify User and Channel data using the [App Context Toolkit](https://pubnub.com/docs/bizops-workspace/basics)), [Files](https://www.pubnub.com/docs/sdks/javascript/api-reference/files), [Message Reactions](https://www.pubnub.com/docs/sdks/javascript/api-reference/message-actions)  (message reactions & read indicators), [Functions](https://www.pubnub.com/docs/general/serverless/functions/overview) (for Text and Image moderation)  |
| Live Events | Shows how PubNub can make a high-occupancy live event interactive, with polls and live chat | [Publish & Subscribe](https://www.pubnub.com/docs/sdks/javascript/api-reference/publish-and-subscribe)  (for polls and chat) |
| Geolocation | Share your location or the location of any asset securely over PubNub | [Publish & Subscribe](https://www.pubnub.com/docs/sdks/javascript/api-reference/publish-and-subscribe), [App Context](https://www.pubnub.com/docs/sdks/javascript/api-reference/objects) |
| Collaboration | Real-time collaboration is demonstrated with a whiteboard app based the existing [standalone collaboration demo](https://www.pubnub.com/demos/codoodler-collaboration-demo/) | [Publish & Subscribe](https://www.pubnub.com/docs/sdks/javascript/api-reference/publish-and-subscribe)  (for drawing), [User State](https://www.pubnub.com/docs/sdks/javascript/api-reference/presence#user-state) (for cursor position) |
| IoT Device Control | Control IoT devices and infrastructure as well as see your device state using PubNub | [Publish & Subscribe](https://www.pubnub.com/docs/sdks/javascript/api-reference/publish-and-subscribe) |
| Data Streaming | Generate, process and deliver streaming data to any number of subscribers.  Based on the [standalone real-time data streaming demo](https://www.pubnub.com/demos/real-time-data-streaming/) | [Subscribe](https://www.pubnub.com/docs/sdks/javascript/api-reference/publish-and-subscribe) |


## Usage Notes

### Firefox Users

Firefox will not allow you to share storage between pages.  This is a [feature and not a bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1730419).  Please load the demo from a local server to use with Firefox, e.g. `python3 -m http.server 8001`.  Be sure to use `localhost` rather than the IP address when doing this, for full compatibility with the IoT demo.  *These are only issues running locally, you will not experience issues running a hosted version of this app*


## Installing / Getting started

To run this project yourself you will need a PubNub account. Generate a Google API key by following [these instructions](https://developers.google.com/maps/documentation/javascript/get-api-key). When you restrict your [key](https://console.cloud.google.com/apis/credentials/key/), make sure the following APIs are enabled under the API restrictions section:
- [Geocoding API](https://developers.google.com/maps/documentation/geocoding/overview)
- [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview)
- [Places API](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Maps Static API](https://developers.google.com/maps/documentation/maps-static/overview)


### Requirements
- [PubNub Account](#pubnub-account) (*Free*)

<a href="https://admin.pubnub.com/signup">
	<img alt="PubNub Signup" src="https://i.imgur.com/og5DDjf.png" width=260 height=97/>
</a>

### Get Your PubNub Keys

1. You’ll first need to sign up for a [PubNub account](https://admin.pubnub.com/signup/). Once you sign up, you can get your unique PubNub keys from the [PubNub Developer Portal](https://admin.pubnub.com/).

1. Sign in to your [PubNub Dashboard](https://admin.pubnub.com/).

1. Click Apps, then **Create New App**.

1. Give your app a name, and click **Create**.

1. Click your new app to open its settings, then click its keyset.

1. Enable the Presence feature on your keyset (check 'Presence Deltas' and 'Generate Leave on TCP FIN or RST')

1. Enable the Message Persistence feature on your keyset and choose a duration

1. Enable the Stream Controller feature on your keyset

1. Enable the Files feature on your keyset and choose a retention duration

1. Enable the App Context feature on your keyset.  Make sure you check all the checkboxes related to events, i.e. User and Channel Metadata Events as well as Membership Events.

1. The hosted variant of this app uses Functions for moderation, specifically [https://www.pubnub.com/integrations/chat-message-profanity-filter/](https://www.pubnub.com/integrations/chat-message-profanity-filter/).

1. Copy the Publish and Subscribe keys and paste them into your app as specified in the next step.

### Building and Running

1. Clone the repository

1. Under the `shared` folder, open `keys.js` and add your keys here, replacing the existing placeholder data.

## Contributing
Please fork the repository if you'd like to contribute. Pull requests are always welcome.

## Customization to change colors and demo content

- To modify the application theme, modify the colors located at the top of `/shared/style.css`.  Named colors are used throughout this application so changing them here will update the entire app.

- To modify the video displayed in the Live Events app, update the file `/live-events/live-events.html`, search for the `iframe` tag and modify the YouTube video ID.  This application has not been tested with any video service other than YouTube.

- The poll questions given in the Live Events app can be modified by changing the file `/live-events/poll-questions.js`.

## Customization with the [App Context Toolkit](https://pubnub.com/docs/bizops-workspace/basics)

> Please use the **Chat application** to demonstrate and see the changes made through App Context Toolkit without a browser refresh.  Other apps within the showcase will not necessarily listen for App Context changes, for example the `Profile` screen requires a browser refresh to update the displayed data.  This is a limitation of the app, not a limitation of PubNub. 

This application uses App Context to store metadata about the **Public Groups** within the Chat app.

Three default channels are created if no channels exist in App Context, therefore, **if you want to reset the App Context (Channel) in the keyset back to a default state, log out and log back into the application.**

Using PubNub App Context, you can update the following properties of the public channels:

| Channel Property | Effect |
| ---- | ---------------- |
| Name | Will update the name of the channel |
| Description | The channel description is shown if you click the (i) to the top-right, after the channel is selected |
| profileIcon | Custom Property of type 'String'.  Specifies the URL to be used for the channel avatar.  Either specify a fully qualified URL, or choose from one of `group-chatbot.png`, `group-global.png`, `group-healthcare.png`, `group-iot.png`, `group-location.png`,  |
| info | (optional) Will be displayed below the channel name in the left-hand view |
| *Others* | Other properties will have no effect on the Channel display |

Using PubNub App Context, you can update the following properties for the user:

**Adding a Channel**: When creating a new channel, choose an ID in the form `Public.id`, e.g. `Public.funnies` or `Public.tech`.  If you do not follow this convention, you will not be able to receive any messages on the channel.  Specify a `Name` and `Description` for the channel.  Create 2 custom fields: `profileIcon` which takes either a fully qualified URL, or one of the group-* strings mentioned above; and `info`, of type 'String'.  You will need to perform a browser refresh for the showcase app to recognize the new channel (this is a limitation of the app, not a limitation of PubNub).  

**Deleting a Channel**: Deleting a channel will remove it from the list of public channels.  If the user was currently viewing the channel, another public channel will be loaded in its place.  As a reminder,  **if you want to reset the Channel App Context in the keyset back to a default state, log out and log back into the showcase application.**

| User Property | Effect |
|----- | -----|
| Name | If editing your own name, you will see the update reflected in the top-left.  If editing the name of another user with whom you are in a direct 1:1 chat, the name will be updated in the 'Direct 1:1 chats' pane.  If you are actively chatting with the user whose name was just changed, the active chat pane will be refreshed.  You will need to reload the page to update the 'Chat Information' page for group channels |
| Profile URL | If editing your own profile image, you will see the update reflected in the top-left.  If editing the avatar of another user with whom you are in a direct 1:1 chat, the avatar will be updated int he 'Direct 1:1 chats' pane.  If you are actively chatting with the user whose avatar was just changed, the active chat pane will be refreshed.  You will need to reload the page to update the 'Chat Information' page for group channels |
| *Others* | Other properties will have no effect on the User display |

**Adding a User**: When adding a new user, assign a `Name` and `Profile URL` for the user and create memberships for that user in all Public channels.  You will need to perform a browser refresh for the showcase app to recognize the new user (this is a limitation of the app, not a limitation of PubNub).  The user ID does not matter, though obviously do not create a duplicate ID.

**Deleting a User**: If you delete yourself, the PubNub showcase will log you out automatically and you will need to log in again.  If you delete another user, that user will disappear from the list of available 1:1 chats.

## Customization with customer logos on home screen

You can customize the home screen with customer logos which will appear when the user hovers over any configured use-case tile.

To add customer logos to the home screen (`index.html`), add a `div` of class `customer-logos` to each tile you wish to customize and apply the class `customer-logo` to each image, as follows:

```html
</a>
<!-- You can add customer logos here.  See ReadMe for more info -->
<div class="customer-logos-bottom text-label">
  <img src="https://www.pubnub.com/pubnub_logo.svg" class="customer-logo">
  <img src="https://www.pubnub.com/pubnub_logo.svg" class="customer-logo"> <!--  optional -->
  <img src="https://www.pubnub.com/pubnub_logo.svg" class="customer-logo"> <!--  optional -->
</div>
<!--  End of added code for logos -->
```

![Custom Logos](https://raw.githubusercontent.com/PubNubDevelopers/PubNub-Showcase/main/media/custom-logos.png)

## Logging in with the same user in two or more tabs

The showcase application is designed primarily to be used by two different users in separate tabs (so one user can talk with the other).  If you want to have the same user running in multiple tabs, for example to demonstrate IoT messages in one tab being received in the private chat channel in another tab, then do the following:

- Log in as a user as normal
- `Duplicate` the tab

You can now experience the showcase as the same user in both the original and duplicated tabs.  Be aware that if you log out of one tab, the application will not automatically log you out of the duplicated tab.

## Further Information / Licenses

All avatar images licenced under MIT from [DiceBear](https://dicebear.com/) and [Bootstrap Icons](https://icons.getbootstrap.com/)
