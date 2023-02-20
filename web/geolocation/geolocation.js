

/*
..######...#######..##....##..######..########
.##....##.##.....##.###...##.##....##....##...
.##.......##.....##.####..##.##..........##...
.##.......##.....##.##.##.##..######.....##...
.##.......##.....##.##..####.......##....##...
.##....##.##.....##.##...###.##....##....##...
..######...#######..##....##..######.....##...
*/

var geoChannel = "GeoChannel"; // Channel
const IGNORE_USER_AFTER_THIS_DURATION = 24 //  Hours

/*
..######..########....###....########.########
.##....##....##......##.##......##....##......
.##..........##.....##...##.....##....##......
..######.....##....##.....##....##....######..
.......##....##....#########....##....##......
.##....##....##....##.....##....##....##......
..######.....##....##.....##....##....########
*/

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

/*
.########.##.....##.##....##..######..########.####..#######..##....##..######.
.##.......##.....##.###...##.##....##....##.....##..##.....##.###...##.##....##
.##.......##.....##.####..##.##..........##.....##..##.....##.####..##.##......
.######...##.....##.##.##.##.##..........##.....##..##.....##.##.##.##..######.
.##.......##.....##.##..####.##..........##.....##..##.....##.##..####.......##
.##.......##.....##.##...###.##....##....##.....##..##.....##.##...###.##....##
.##........#######..##....##..######.....##....####..#######..##....##..######.
*/

window.addEventListener('beforeunload', function () {
    pubnub.unsubscribeAll()
})

async function initialize () {
    // Declarations
    channelMembers = {};
    displayedMembers = {};
    travelHistory = {};
    // Intialize PubNub Object
    pubnub = createPubNubObject();
    await getUserMetadataSelf();
    initMap();
    pubnub.subscribe({channels: ['DM.*', geoChannel], withPresence: true});
    await populateChannelMembers();
    initPubNubUserToChannelMembers();
    await activatePubNubListener();
    loadLastLocations();
    initalizeMapSearch();
    findLocation();
    initiateShare();
}

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
        // document.getElementById('currentUser').innerText = me.name + ' (You)'
        // document.getElementById('avatar').src = me.profileUrl
    } catch (e) {
      //  Some error retrieving our own meta data - probably the objects were deleted, therefore log off (possible duplicate tab)
        location.href = '../index.html'
    }
}

function initMap(){
    var myLatlng = new google.maps.LatLng(37.7749,122.4194);
    map = new google.maps.Map(document.getElementById('map-canvas'), {
        zoom: 2,
        center: myLatlng
    });
}

async function getUUIDMetaData (userId) {
    const result = await pubnub.objects.getUUIDMetadata({
        uuid: userId
    })
    return result
}

// Get either the current location or the location input
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

// Add position as a channel member
async function showPosition(position) {
    const pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
    };
    currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
    };
    map.setCenter(pos);
    map.setZoom(3);
    const decode = await geocoder.geocode({ location: pos });
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
    lastLocation = formatted_address;
    pubnub.publish({
        channel: geoChannel,
        message: {
            uuid:pubnub.getUUID(),
            name: me.name,
            address: formatted_address,
            lat: position.coords.latitude,
            lng: position.coords.longitude
        }
    });
}

function showNewPosition(position) {
    currentLocation = {
        lat: position.geometry.location.lat(),
        lng: position.geometry.location.lng(),
    };
    pubnub.publish({
        channel: geoChannel,
        message: {
        uuid: pubnub.getUUID(),
        name: me.name,
        address: position.formatted_address,
        lat: position.geometry.location.lat(),
        lng: position.geometry.location.lng()
    }});
}

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

async function populateChannelMembers(){
    const result = await pubnub.objects.getChannelMembers({
        channel: geoChannel,
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

async function setChannelMember(){
    await pubnub.objects.setChannelMembers({
        channel: geoChannel,
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
        console.log(resp);
    })
    .catch((err) => {
        console.log(err);
    });
}

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
    travelHistory = {};
    const history = await pubnub.fetchMessages({
        channels: [geoChannel],
        count: 100,
        includeUUID: true,
        includeMessageActions: true,
    });
    if (history.channels[geoChannel] != null) {
        for(var i = history.channels[geoChannel].length - 1; i >= 0; i--) {
            historicalMsg = history.channels[geoChannel][i];
            historicalMsg.publisher = historicalMsg.uuid;
            if(historicalMsg.message && historicalMsg.message.address && historicalMsg.message.uuid == pubnub.getUUID() && !travelHistory.hasOwnProperty(historicalMsg.timetoken)){
                if(lastLocation == null){
                    lastLocation = "Last Location";
                    // Display position on the map
                    displayPosition(historicalMsg);
                }
                travelHistory[historicalMsg.timetoken] = historicalMsg.message.address;
                var div = document.createElement("div");
                div.classList.add("card");
                div.appendChild(document.createTextNode(historicalMsg.message.address));
                var ul = document.getElementById("history-list");
                ul.appendChild(div);
            }
            if (channelMembers[historicalMsg.uuid] != null && !(displayedMembers.hasOwnProperty(historicalMsg.uuid))) {
                addToDisplayedUsers(historicalMsg.uuid);
                if (historicalMsg.message && historicalMsg.message.uuid != pubnub.getUUID()) {
                    // Display position on the map
                    displayPosition(historicalMsg);
                }
            }
        }
    }
}

function initiateShare(){
    var shareButton = document.getElementById("share-button");
    shareButton.addEventListener('click', () => {
        if(currentLocation != null && currentLocation.lng != null && currentLocation.lat != null){
            if(sharedLocation != currentLocation){
                sharedLocation = currentLocation;
                var url = `https://maps.googleapis.com/maps/api/staticmap?center=${currentLocation.lat},${currentLocation.lng}&zoom=6&size=200x200&scale=1.5&key=AIzaSyDyl7ItKt5viBBju5Rwsqwrii5soyWUzp0`;
                pubnub.publish({
                    channel: 'Public.location-chat',
                    storeInHistory: true,
                    message: {
                        message: `Hello, my location is ${lastLocation}`,
                        attachment: url
                    }
                });
                // Navigate to chat
                window.location.href = '../chat/chat.html';
            }
        }
        else{
            alert('Please select a location')
        }
    })
}


