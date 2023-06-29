/**
 * This file contains various constants associated with the chat portion of the demo.
 * Groups (both public and private) are hardcoded in the client, which is clearly not
 * good practice in a production app where they would be stored on the server.
 * For more notes about transitioning between this demo and a production app, see chat.js.
 */
var predefined_groups = {
  groups: [
    {
      channel: 'Public.global',
      name: 'Global (All Users)',
      profileIcon: 'group-global.png',
      description: 'Group containing all users in the chat system'
    },
    {
      channel: 'Public.location-chat',
      name: 'Location Updates',
      profileIcon: 'group-location.png',
      description:
        'Used by the Geolocation demo.  Share your location with the world.  Remember, you can log out to stop your data being publicly visible',
      info: "Populated by the <a href='../geolocation/geolocation.html'>Geo</a> demo"
    },
    {
      channel: 'Public.healthcare',
      name: 'Healthcare',
      profileIcon: 'group-healthcare.png',
      description: 'Build HIPAA-compliant telemedicine apps with PubNub as well as GDPR and SOC2 compliant apps',
      info: "HIPAA & GDPR compiance"
    }
  ],
  private_groups: [
    //  Private groups are named 'Private.<name>' in this demo.  PubNub does not impose restrictions on names (beyond length & allowed characters) but
    //  it is a good idea to choose a sensible naming convention.
    //  To keep channels specific to an individual user, this demo will include the user's ID as part of the channel name, for example
    //  'Private.a54as68df1as-iot'.  Since the groups are hardcoded, the channel name will replace any instance of 'uuid' with the user's actual ID
    {
      channel: 'Private.uuid-iot',
      name: 'My Home (IoT)',
      profileIcon: 'group-iot.png',
      description:
        'Used by the IoT demo.  Notifications from your smart home, only shared with members of your household',
      info: "Populated by the <a href='../iot/iot.html'>IoT</a> demo"
    },
    {
      channel: 'Private.chatgpt.uuid',
      name: 'Chatbot (Chat GPT)',
      profileIcon: 'group-chatbot.png',
      description:
        'Interact with a Chatbot powered by Chat GPT.  To build your own chatbot based on ChatGPT with PubNub see our <a href=\'https://www.pubnub.com/blog/building-a-chatbot-with-openai-gpt3-and-pubnub/\'>blog</a>',
      info: "Powered by ChatGPT"
    }
  ]
}
