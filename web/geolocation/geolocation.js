/**
* - With PubNub you can implement any real-time solution possible.
* - In this code base, we will explore how you would update real-time Geolocation events and redraw users’ locations on Google Maps.
*/

// This channel receives updates (lat, lng) on user posiitions
var GEO_CHANNEL = "GeoChannel";

// If the updated position is older then 24 hours old ignore the update
const IGNORE_USER_AFTER_THIS_DURATION = 24

//  Connection to the PubNub API
var pubnub = null;
//  Our own data, populated asynchronously on startup
var me = null;
//  Local cache of members also in our channel (excluding ourselves)
var channelMembers = null
// Local cache of members whos position has already been displayed
var displayedMembers = null;
// Where the user has last travelled
var travelHistory = null;
// Last location the user has travelled
var lastLocation = null;
// Map Configuration
var map = null;
// Markers
var mark = [];
// Decoder for lat lng positioning
var geocoder = null;
// Track current location
var currentLocation = null;
// Location that was previously shared
var sharedLocation = null;

window.addEventListener('beforeunload', function () {
    pubnub.unsubscribeAll()
})

// Called on page load
async function initialize () {
    // Declarations
    channelMembers = {};
    displayedMembers = {};
    travelHistory = {};

    // Display Google Maps
    initMap();

    //  PubNub object - connection with the PubNub infrastructure
    pubnub = createPubNubObject();

    //  Subscribing to all possible channels we will want to know about.
    //  Need to know about GEO_CHANNEL and DM.* channels so we can update positions on the map, well displaying direct messages on the map when received
    //  Using the recommended naming convention:
    //  Public.<name> for public groups
    //  Private.<name> for private groups
    //  DM.A&B for direct messages between two users
    pubnub.subscribe({channels: ['DM.*', GEO_CHANNEL], withPresence: true}); // Subscribe

    await getUserMetadataSelf(); // Populate own metadata for locaition pop-up
    await populateChannelMembers(); // Populate channel members so we can access any metadata for users in the GEO_CHANNEL
    initPubNubUserToChannelMembers(); // Add own metadata in channelMembers variable
    await activatePubNubListener(); // Listen to channels GEO_CHANNEL and DM.* for any updates
    await loadLastLocations(); // Populate history of updates in the GEO_CHANNEL



    // Initialize Map Listeners
    initalizeMapSearch(); // Initalize Place search
    findLocation(); // Find Current Location Button
    initiateShare(); // Share Location Button
}

// Add login user MetaData to the channelMembers map
function initPubNubUserToChannelMembers(){
    channelMembers[pubnub.getUUID()] = {
        name: me.name,
        profileUrl: me.profileUrl
    }
}

//  Wrapper around pubnub objects getUUIDMetadata and set up our internal cache
async function getUserMetadataSelf () {
    try {
        const result = await pubnub.objects.getUUIDMetadata({
        uuid: pubnub.getUUID()
    })
        me = result.data;
    } catch (e) {
        //  Some error retrieving our own meta data - probably the objects were deleted, therefore log off (possible duplicate tab)
        location.href = '../index.html'
    }
}

// Display Google Maps canvas
function initMap(){
    var myLatlng = new google.maps.LatLng(37.7749,122.4194);
    map = new google.maps.Map(document.getElementById('map-canvas'), {
        zoom: 2,
        center: myLatlng
    });
}

// Get MetaData for a new user that has joined the channel
async function getUUIDMetaData (userId) {
    const result = await pubnub.objects.getUUIDMetadata({
        uuid: userId
    })
    return result
}

// Get the current location for a user
function findLocation(){
    const position = document.getElementById("enter-button");
    position.addEventListener('click', () => {
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(showPosition);
        }
        else{
            alert("Not sharing location. Please refresh and try again to share.");
        }
    })
}

// Decode the current location position and publish it to PubNub
// Positions when published are in the form lat, and lng
async function showPosition(position) {
    // Get coordinates from position object
    currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
    };

    // Zoom map in and center location
    map.setCenter(currentLocation);
    map.setZoom(3);

    // Decode position address using Google Maps Geocode
    const decode = await geocoder.geocode({ location: currentLocation });
    var formatted_address;
    try{
        formatted_address = decode.results[0].formatted_address;
    }
    catch(e){
        formatted_address = "Home";
    }
    if(lastLocation == formatted_address){
        return;
    }

    // Set lastLocation if user decides to share the locaiton next
    lastLocation = formatted_address;

    // Publish the new location to PubNub, including lat, lng, address, and metadata
    pubnub.publish({
        channel: GEO_CHANNEL,
        message: {
            uuid:pubnub.getUUID(),
            name: me.name,
            address: formatted_address,
            lat: position.coords.latitude,
            lng: position.coords.longitude
        }
    });
}

// Publish a searched position to PubNub
// Positions when published are in the form lat, and lng
function showNewPosition(position) {
    currentLocation = {
        lat: position.geometry.location.lat(),
        lng: position.geometry.location.lng(),
    };
    pubnub.publish({
        channel: GEO_CHANNEL,
        message: {
        uuid: pubnub.getUUID(),
        name: me.name,
        address: position.formatted_address,
        lat: position.geometry.location.lat(),
        lng: position.geometry.location.lng()
    }});
}

// Listen to PubNub events (message events, object events)
async function activatePubNubListener(){
    pnListener = pubnub.addListener({
        message: (payload) => {
            messageReceived(payload);
        },
        objects: async objectEvent => {
            if (
                objectEvent.message.type == 'uuid' &&
                objectEvent.message.event == 'delete' &&
                objectEvent.message.data.id == pubnub.getUUID()
            ) {
                //  The Object associated with OUR UUID was deleted.
                //  log out.  This could have been caused e.g. by a duplicate tab logging out
                location.href = '../index.html'
            }
            else if (
                objectEvent.message.type == 'uuid' &&
                objectEvent.message.event == 'delete' &&
                objectEvent.message.data.id != pubnub.getUUID()
            ) {
                var userId = objectEvent.message.data.id
                //  Remove member from geolocation channel
                if (channelMembers.hasOwnProperty(userId)) {
                    removeUserFromGeoChannel(userId)
                }
            }
            else if (
                objectEvent.message.type == 'membership' &&
                objectEvent.message.event == 'set' &&
                objectEvent.message.data.uuid.id == pubnub.getUUID()
            ) {
                //  We have joined a channel, logic for this is handled elsewhere.
                //  No action required
            }
            else if (
                objectEvent.message.type == 'membership' &&
                objectEvent.message.event == 'set' &&
                objectEvent.message.data.uuid.id != pubnub.getUUID()
            ) {
                //  Somebody else has joined a channel
                //  Regardless of our active channel, add this person to our list of direct chats if they aren't there already (this is our indication a new user is added)
                var userId = objectEvent.message.data.uuid.id;
                if (!channelMembers.hasOwnProperty(userId)) {
                    //  Find out the information about this user
                    const userInfo = await getUUIDMetaData(userId);

                    if(!channelMembers.hasOwnProperty(userId)){
                        if (userInfo != null) {
                            addUserToCurrentChannel(
                                userId,
                                userInfo.data.name,
                                userInfo.data.profileUrl
                            )
                        }
                    }
                }
            }
            else if (
                objectEvent.message.type == 'membership' &&
                objectEvent.message.event == 'delete' &&
                objectEvent.message.data.uuid == pubnub.getUUID()
            ) {
                //  This will only ever be called by this app if we log out, the logic of which is handled elsewhere.  Specifically, if we log out in a duplicate tab, we handle this in [uuid][delete]
                //  No action required
            } else if (
                objectEvent.message.type == 'membership' &&
                objectEvent.message.event == 'delete' &&
                objectEvent.message.data.uuid != pubnub.getUUID()
            ) {
                //  Somebody else has removed themselves from a channel
                //  In this application, this can only happen if the user has logged out (which clears their data), a scenario caught by the [uuid][delete] handler
                //  No action required
            }
        }
    })
}

//  Get the meta data for other users in the GEO_CHANNEL.  This will be stored locally for efficiency.
// If we see a new user after the GeoLocaiton Demo is loaded, that user's data will be loaded dynamically as needed
async function populateChannelMembers(){
    const result = await pubnub.objects.getChannelMembers({
        channel: GEO_CHANNEL,
        sort: { updated: 'desc' },
        include: {
            UUIDFields: true
        },
        limit: 100,
        totalCount: true
    });
    channelMembers = {}
    for (var i = 0; i < result.data.length; i++) {
        //  Since this is a shared system with essentially ephemeral users, only display users who were created in the last 24 hours
        //  The 'updated' field, for our purposes, will be when the user was created (or changed their name), but either way, this
        //  allows the list of 'users' to be kept manageable.
        //  There is logic to load the names / avatars on historical messages separately, so they are not blank.
        var lastUpdated = new Date(result.data[i].updated)
        var cutoff = new Date()
        cutoff.setHours(cutoff.getHours() - IGNORE_USER_AFTER_THIS_DURATION)
        if (lastUpdated > cutoff) {
            addUserToCurrentChannel(
                result.data[i].uuid.id,
                result.data[i].uuid.name,
                result.data[i].uuid.profileUrl
            )
        }
    }

    // If channelMembers doesn't contain login users metadata
    if(!channelMembers.hasOwnProperty(pubnub.getUUID())){
        setChannelMember();
    }
}

//  Update our cache of which users are in the current channel
function addUserToCurrentChannel (userId, name, profileUrl) {
    try {
        if (name == null || profileUrl == null) {
            name = me.name
            profileUrl = me.profileUrl
        }
        channelMembers[userId] = {
            name: name,
            profileUrl: profileUrl
        }
    } catch (e) {
        //  Could not look up object
        console.log(e);
    }
}

// If the login user is new to the channel set the users meta data using PubNub Objects so it can be later received
async function setChannelMember(){
    await pubnub.objects.setChannelMembers({
        channel: GEO_CHANNEL,
        uuids: [
            pubnub.getUUID(),
            {
                id: pubnub.getUUID(),
                custom: {
                    name: me.name,
                    profileUrl: me.profileUrl
                }
            }
        ]
    })
    .then((resp) => {
        //console.log(resp);
    })
    .catch((err) => {
        console.log(err);
    });
}

// Track which users have currently been displayed on the map
function addToDisplayedUsers(userId){
    displayedMembers[userId] = true;
}

//  Remove a user from the geo channel (just updates our internal cache)
function removeUserFromGeoChannel (userId) {
    delete channelMembers[userId];
    mark[userId].setMap(null);
    delete mark[userId];
}

/// Populates the map with the last locations seen in the channel
async function loadLastLocations() {
    // Refresh travelHistory
    travelHistory = {};

    // Remove HTML Elements
    var ul = document.getElementById("history-list");
    while(ul.firstChild) ul.removeChild(ul.firstChild);

    // Get the last 100 GEO_CHANNEL updates/messages
    const history = await pubnub.fetchMessages({
        channels: [GEO_CHANNEL],
        count: 100,
        includeUUID: true,
    });

    // Only populate history for the GEO_CHANNEL
    if (history.channels[GEO_CHANNEL] != null) {
        for(var i = history.channels[GEO_CHANNEL].length - 1; i >= 0; i--) {
            historicalMsg = history.channels[GEO_CHANNEL][i];
            historicalMsg.publisher = historicalMsg.uuid;
            if(historicalMsg.message && historicalMsg.message.address && historicalMsg.message.uuid == pubnub.getUUID() && !travelHistory.hasOwnProperty(historicalMsg.timetoken)){
                if(lastLocation == null){
                    lastLocation = "Last Location";
                    // Display the users position on the map
                    displayPosition(historicalMsg);
                }

                // Add location to history list
                travelHistory[historicalMsg.timetoken] = historicalMsg.message.address;
                displayMessage(historicalMsg.message.address);
            }
            if (channelMembers[historicalMsg.uuid] != null && !(displayedMembers.hasOwnProperty(historicalMsg.uuid))) {
                addToDisplayedUsers(historicalMsg.uuid);
                if (historicalMsg.message && historicalMsg.message.uuid != pubnub.getUUID()) {
                    // Display other users last position on the map
                    displayPosition(historicalMsg);
                }
            }
        }
    }
}

// Listen to the share button to publish a recent location in the Public.location-chat channel
// This location will be able to be seen in chat demo under location updates in the menu
function initiateShare(){
    var shareButton = document.getElementById("share-button");
    shareButton.addEventListener('click', async () => {
        if(currentLocation != null && currentLocation.lng != null && currentLocation.lat != null){
            if(sharedLocation != currentLocation){
                sharedLocation = currentLocation;

                // Configure static google maps link
                var url = `https://maps.googleapis.com/maps/api/staticmap?center=${currentLocation.lat},${currentLocation.lng}&zoom=6&size=200x200&scale=1.5&key=${geo_key}`;

                // Publish static google maps link to the location updates chat
                await pubnub.publish({
                    channel: 'Public.location-chat',
                    storeInHistory: true,
                    message: {
                        message: `Hello, my location is ${lastLocation}`,
                        attachment: url
                    }
                });

                sessionStorage.setItem('activeChatChannel', 'Public.location-chat');
                // Navigate to chat
                window.location.href = '../chat/chat.html';
            }
        }
    })
}


