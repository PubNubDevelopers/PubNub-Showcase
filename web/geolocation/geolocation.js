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
var mark = [];
var lineCoords = {};
var lineCoordinatesPath = [];
var bounds = [];
var lastLat = "";
var lastLng = "";
var infoWindow = null;
var geocoder = null;
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

window.addEventListener('beforeunload', function () {
    console.log('unsubscribe all')
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
    var myLatlng = new google.maps.LatLng(37.7749,122.4194);
    map = new google.maps.Map(document.getElementById('map-canvas'), {
        zoom: 2,
        center: myLatlng
    });
    pubnub.subscribe({channels: [geoChannel], withPresence: true});
    await activatePubNubListener();
    loadLastLocations();
    initalizeMapSearch();
    findLocation();

    pnListener = pubnub.addListener({
        message: (payload) => {
            try{
                if(payload.message && payload.message.address && payload.message.uuid == pubnub.getUUID() && !travelHistory.hasOwnProperty(payload.timetoken)){
                    travelHistory[payload.timetoken] = payload.message.address;
                    var li = document.createElement("li");
                    li.appendChild(document.createTextNode(payload.message.address));
                    var ul = document.getElementById("history-list");
                    ul.appendChild(li);
                }
                redraw(payload);
            }
            catch(e){
                console.log(e);
            }
        },
    })
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

// Get either the current location or the location input
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
    // await pubnub.objects.setChannelMembers({
    //     channel: geoChannel,
    //     uuids: [
    //         pubnub.getUUID(),
    //         {
    //             id: pubnub.getUUID(),
    //             custom: {
    //                 lat: position.coords.latitude,
    //                 lng: position.coords.longitude,
    //                 name: me.name,
    //             }
    //         }
    //     ]
    // })
    // .then((resp) => {
    //     console.log(resp);
    // })
    // .catch((err) => {
    //     console.log(err);
    // });
    const pos = {
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
    // await pubnub.objects.setChannelMembers({
    //     channel: geoChannel,
    //     uuids: [
    //         pubnub.getUUID(),
    //         {
    //             id: pubnub.getUUID(),
    //             custom: {
    //                 lat: position.geometry.location.lat(),
    //                 lng: position.geometry.location.lng(),
    //                 name: me.name,
    //             }
    //         }
    //     ]
    // })
    // .then((resp) => {
    //     console.log(resp);
    // })
    // .catch((err) => {
    //     console.log(err);
    // });
    console.log("PUBLISHING MESSAGE");
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
    travelHistory = {};
    const history = await pubnub.fetchMessages({
        channels: [geoChannel],
        count: 100,
        includeUUID: true,
        includeMessageActions: true
    });
    if (history.channels[geoChannel] != null) {
        for (const historicalMsg of history.channels[geoChannel]) {
            historicalMsg.publisher = historicalMsg.uuid;
            if(historicalMsg.message && historicalMsg.message.address && historicalMsg.message.uuid == pubnub.getUUID() && !travelHistory.hasOwnProperty(historicalMsg.timetoken)){
                travelHistory[historicalMsg.timetoken] = historicalMsg.message.address;
                var li = document.createElement("li");
                li.appendChild(document.createTextNode(historicalMsg.message.address));
                var ul = document.getElementById("history-list");
                ul.appendChild(li);
            }
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
                }
            }
        }
    }
}

var redraw = function(payload) {
    if (payload.channel == geoChannel) {
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
                    google.maps.event.addListener(map,'click', function(){
                        infowindow.close();
                    });
                };
            })(markdata,content,infowindow));

        mark[uuid].setMap(map);
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
    infowindow = new google.maps.InfoWindow();
    const infowindowContent = document.getElementById("infowindow-content");
    infowindow.setContent(infowindowContent);
    geocoder = new google.maps.Geocoder();


    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if(lastLocation == place.formatted_address){
            return;
        }
        lastLocation = place.formatted_address;
        if (!place.geometry || !place.geometry.location) {
            // User entered the name of a Place that was not suggested and
            // pressed the Enter key, or the Place Details request failed.
            window.alert("No details available for input: '" + place.name + "'");
            return;
        }

        map.setCenter(place.geometry.location);
        map.setZoom(3);

        showNewPosition(place);
    });
}


