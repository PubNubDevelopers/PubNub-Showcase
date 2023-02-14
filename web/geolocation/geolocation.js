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
var displayedMembers = null
// Map Configuration
var map = null;
var mark = [];
var lineCoords = {};
var lineCoordinatesPath = [];
var bounds = [];
var lastLat = "";
var lastLng = "";

var useCurrentLocation = true;

/*
.########.##.....##.##....##..######..########.####..#######..##....##..######.
.##.......##.....##.###...##.##....##....##.....##..##.....##.###...##.##....##
.##.......##.....##.####..##.##..........##.....##..##.....##.####..##.##......
.######...##.....##.##.##.##.##..........##.....##..##.....##.##.##.##..######.
.##.......##.....##.##..####.##..........##.....##..##.....##.##..####.......##
.##.......##.....##.##...###.##....##....##.....##..##.....##.##...###.##....##
.##........#######..##....##..######.....##....####..#######..##....##..######.
*/


async function initialize () {
    channelMembers = {};
    displayedMembers = {};
    // Intialize PubNub Object
    pubnub = createPubNubObject();
    await getUserMetadataSelf();
    var myLatlng = new google.maps.LatLng(37.7749,122.4194);
    map  = new google.maps.Map(document.getElementById('map-canvas'), {
        zoom: 2,
        center: myLatlng
    });
    pubnub.subscribe({channels: [geoChannel], withPresence: true});
    await activatePubNubListener();
    loadLastLocations();
    initalizeMapSearch();
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

// Get current location
// function getLocation() {
//     if (navigator.geolocation) {
//         navigator.geolocation.watchPosition(showPosition);
//     } else {
//         alert("Not sharing location. Please refresh and try again to share.");
//     }
// }

// Add position as a channel member
async function showPosition(position) {
    if ( true) {
        await pubnub.objects.setChannelMembers({
            channel: geoChannel,
            uuids: [
                pubnub.getUUID(),
                {
                    id: pubnub.getUUID(),
                    custom: {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        name: me.name,
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
        pubnub.publish({channel:geoChannel, message:{uuid:pubnub.getUUID(), name: me.name, lat:position.coords.latitude, lng:position.coords.longitude}});
    }
}

async function activatePubNubListener(){
    pnListener = pubnub.addListener({
        message: redraw,
        presence: (presenceEvent) => {
            document.getElementById("active-label").innerHTML = presenceEvent.occupancy;
        },
        objects: async objectEvent => {

        }
    })

    try {
        await populateChannelMembers();
    }
    catch (err) {
        console.log(err)
    }
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
}

//  Update our cache of which users are in the current channel
function addUserToCurrentChannel (userId, name, profileUrl) {
    try {
        if (name == null || profileUrl == null) {
            name = userInfo.data.name
            profileUrl = userInfo.data.profileUrl
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

function addToDisplayedUsers(userId){
    displayedMembers[userId] = true;
}

/// Populates the map with the last locations seen in the channel
async function loadLastLocations() {
    const history = await pubnub.fetchMessages({
        channels: [geoChannel],
        count: 100,
        includeUUID: true,
        includeMessageActions: true
    });
    if (history.channels[geoChannel] != null) {
        for (const historicalMsg of history.channels[geoChannel]) {
            historicalMsg.publisher = historicalMsg.uuid;
            if (channelMembers[historicalMsg.uuid] != null && !(displayedMembers.hasOwnProperty(historicalMsg.uuid))) {
                addToDisplayedUsers(historicalMsg.uuid);
                if (historicalMsg.message && historicalMsg.message.uuid != pubnub.getUUID()) {
                    // Display position on the map
                    loc = new google.maps.LatLng(historicalMsg.message.lat, historicalMsg.message.lng);
                    mark[historicalMsg.uuid] = new google.maps.Marker({
                        position:loc,
                        map:map,
                        label: {
                            text: historicalMsg.message.name,
                            color: "#000000",
                            fontWeight: "bold",
                        }
                    });

                    var lastseen = new Date(historicalMsg.timetoken / 10000000);

                    var content = "Name: " + historicalMsg.message.name + '<br>' + "Last Seen: " + lastseen + '<br>' + "Lat: " + historicalMsg.message.lat +  '<br>' + "Long: " + historicalMsg.message.lng;

                    var infowindow = new google.maps.InfoWindow();

                    google.maps.event.addListener(mark[historicalMsg.uuid], 'click', (function(content,infowindow){
                        return function() {
                            infowindow.setContent(content);
                            infowindow.open(map,mark[historicalMsg.uuid]);
                            google.maps.event.addListener(map,'click', function(){
                                infowindow.close();
                            });
                        };
                    })(content,infowindow));


                    mark[historicalMsg.uuid].setMap(map);
                }}
            }
        }
    }

var redraw = function(payload) {
    if (payload.channel == geoChannel) {
        var lineSymbol = {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW
        };
        var lat = payload.message.lat;
        var lng = payload.message.lng;
        lastLat = lat;
        lastLng = lng;
        var uuid = payload.message.uuid;
        var displayName = payload.message.name;
        var lastseen = new Date(payload.timetoken.substring(0, 10)*1000);
        loc = new google.maps.LatLng(lat, lng);

            lineCoords = [];
            if (mark[uuid] && mark[uuid].setMap) {
                mark[uuid].setMap(null);
            }
            if (lineCoordinatesPath[uuid] && lineCoordinatesPath[uuid].setMap) {
                lineCoordinatesPath[uuid].setMap(null);
            }
            mark[uuid] = new google.maps.Marker({
                position:loc,
                map:map,
                label: {
                    text: displayName,
                    color: "#000000",
                    fontWeight: "bold"
                }
            });

            var content = "Name: " + displayName + '<br>' + "Last Seen: " + lastseen + '<br>' + "Lat: " + lat +  '<br>' + "Long: " + lng +  '<br>';

            var infowindow = new google.maps.InfoWindow();

            var markdata = mark[uuid];

            google.maps.event.addListener(mark[uuid], 'click', (function(markdata,content,infowindow){
                return function() {
                    infowindow.setContent(content);
                    infowindow.open(map,markdata);
                    actionCompleted({action: 'View User Details', windowLocation: orglocation}); // This is for the interactive demo on PubNub.com. It is not part of the demo of this application.
                    google.maps.event.addListener(map,'click', function(){
                        infowindow.close();
                    });
                };
            })(markdata,content,infowindow));

        mark[uuid].setMap(map);
        bounds.extend(loc);
    }
};

function initalizeMapSearch(){
    // Initialize Map Search
    const card = document.getElementById("pac-card");
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(card);
    const input = document.getElementById("pac-input");
    const autocomplete = new google.maps.places.Autocomplete(input);
    const southwest = { lat: 5.6108, lng: 136.589326 };
    const northeast = { lat: 61.179287, lng: 2.64325 };
    const newBounds = new google.maps.LatLngBounds(southwest, northeast);
    autocomplete.setBounds(newBounds);
    const infowindow = new google.maps.InfoWindow();
    const infowindowContent = document.getElementById("infowindow-content");
    infowindow.setContent(infowindowContent);

    // Listen for input field changes
    input.addEventListener('input', (value) => {
        if(value.data == null){
            useCurrentLocation = true;
            document.getElementById("text-box-enter").innerHTML = "Use Current Location";
        }
        else{
            useCurrentLocation = false;
            document.getElementById("text-box-enter").innerHTML = "Enter New Location";
        }
    })
}


