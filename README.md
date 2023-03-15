# PubNub Showcase application

## Demo

A hosted version of this demo can be found at **[https://showcase.pub-nub.com/](https://showcase.pub-nub.com/)**

![Screenshot](https://raw.githubusercontent.com/PubNubDevelopers/PubNub-Showcase/main/media/landing.png)

## Features of the Showcase and PubNub APIs used

| Demo | Description | PubNub APIs used |
| ---- | --- | ---------------- |
| Chat | Uses the PubNub SDK to show how a chat application could be implemented, with features such as group messaging, typing indicators, message reactions, unread message counts and presence indicators. |  [Publish & Subscribe](https://www.pubnub.com/docs/sdks/javascript/api-reference/publish-and-subscribe), [Presence](https://www.pubnub.com/docs/sdks/javascript/api-reference/presence), [Persistence](https://www.pubnub.com/docs/sdks/javascript/api-reference/storage-and-playback) (for message history & unread message counts), [Objects](https://www.pubnub.com/docs/sdks/javascript/api-reference/objects), [Files](https://www.pubnub.com/docs/sdks/javascript/api-reference/files), [Message Actions](https://www.pubnub.com/docs/sdks/javascript/api-reference/message-actions)  (reactions & read indicators), [Functions](https://www.pubnub.com/docs/general/serverless/functions/overview) (for Text and Image moderation)  |
| Virtual Events | Shows how PubNub can make a high-occupancy virtual event interactive, with polls and live chat | [Publish & Subscribe](https://www.pubnub.com/docs/sdks/javascript/api-reference/publish-and-subscribe)  (for polls and chat) |
| Geolocation | Share your location or the location of any asset securely over PubNub | [Publish & Subscribe](https://www.pubnub.com/docs/sdks/javascript/api-reference/publish-and-subscribe), [Objects](https://www.pubnub.com/docs/sdks/javascript/api-reference/objects) |
| Collaboration | Real-time collaboration is demonstrated with a whiteboard app based the existing [standalone collaboration demo](https://www.pubnub.com/demos/codoodler-collaboration-demo/) | [Publish & Subscribe](https://www.pubnub.com/docs/sdks/javascript/api-reference/publish-and-subscribe)  (for drawing), [User State](https://www.pubnub.com/docs/sdks/javascript/api-reference/presence#user-state) (for cursor position) |
| IoT | Control IoT devices and infrastructure as well as see your device state using PubNub | [Publish & Subscribe](https://www.pubnub.com/docs/sdks/javascript/api-reference/publish-and-subscribe) |
| Real-Time Streaming | Generate, process and deliver streaming data to any number of subscribers.  Based on the [standalone real-time data streaming demo](https://www.pubnub.com/demos/real-time-data-streaming/) | [Subscribe](https://www.pubnub.com/docs/sdks/javascript/api-reference/publish-and-subscribe) |



## Installing / Getting started

To run this project yourself you will need a PubNub account and (optionally) your own Google key to render the Google map used for Geolocation.

### Requirements
- [PubNub Account](#pubnub-account) (*Free*)

<a href="https://dashboard.pubnub.com/signup">
	<img alt="PubNub Signup" src="https://i.imgur.com/og5DDjf.png" width=260 height=97/>
</a>

### Get Your PubNub Keys

1. You’ll first need to sign up for a [PubNub account](https://dashboard.pubnub.com/signup/). Once you sign up, you can get your unique PubNub keys from the [PubNub Developer Portal](https://admin.pubnub.com/).

1. Sign in to your [PubNub Dashboard](https://admin.pubnub.com/).

1. Click Apps, then **Create New App**.

1. Give your app a name, and click **Create**.

1. Click your new app to open its settings, then click its keyset.

1. Enable the Presence feature on your keyset (check 'Presence Deltas' and 'Generate Leave on TCP FIN or RST')

1. Enable the Persistence feature on your keyset and choose a duration

1. Enable the Stream Controller feature on your keyset

1. Enable the Files feature on your keyset and choose a retention duration

1. Enable the Objects feature on your keyset.  Make sure you check all the checkboxes related to events, i.e. User and Channel Metadata Events as well as Membership Events.

1. The hosted variant of this app uses PubNub functions for moderation, specifically [https://www.pubnub.com/integrations/chat-message-profanity-filter/](https://www.pubnub.com/integrations/chat-message-profanity-filter/).

1. Copy the Publish and Subscribe keys and paste them into your app as specified in the next step.

### Building and Running

1. Clone the repository

1. Under the `shared` folder, open `keys.js` and add your keys here, replacing the existing placeholder data.

## Contributing
Please fork the repository if you'd like to contribute. Pull requests are always welcome. 

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


## Further Information / Licenses

All avatar images licenced under MIT from [DiceBear](https://dicebear.com/) and [Bootstrap Icons](https://icons.getbootstrap.com/) 
