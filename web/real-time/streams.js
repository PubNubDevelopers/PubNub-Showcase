/**
 * These streams have been setup specifically to demo PubNub's real-time streaming capabilities.
 * They are not designed for production use.
 * Please refer to real-time.js for more information
 * The PubNub streams used in this app are the same streams which power https://www.pubnub.com/demos/real-time-data-streaming/ 
 */
var streams = {
      twitter: {
        id: 'twitter',
        pubnub: null,
        subKey: 'sub-c-d00e0d32-66ac-4628-aa65-a42a1f0c493b',
        channels: ['pubnub-twitter']
      },
      wikipedia: {
        id: 'wikipedia',
        pubnub: null,
        subKey: 'sub-c-83a959c1-2a4f-481b-8eb0-eab514c06ebf',
        channels: ['pubnub-wikipedia']
      },
      sensors: {
        id: 'sensors',
        pubnub: null,
        subKey: 'sub-c-99084bc5-1844-4e1c-82ca-a01b18166ca8',
        channels: ['pubnub-game-state', 'pubnub-sensor-network', 'pubnub-market-orders']
      }
  }
  