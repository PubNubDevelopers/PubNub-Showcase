/*
..######...#######..##....##..######..########
.##....##.##.....##.###...##.##....##....##...
.##.......##.....##.####..##.##..........##...
.##.......##.....##.##.##.##..######.....##...
.##.......##.....##.##..####.......##....##...
.##....##.##.....##.##...###.##....##....##...
..######...#######..##....##..######.....##...
*/

var geoChannel = "GeoChannel";

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
// Map Configuration
var map = null;
var mark = [];
var lineCoords = {};
var lineCoordinatesPath = [];
var bounds = [];
var lastLat = "";
var lastLng = "";

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
    // Intialize PubNub Object
    pubnub = createPubNubObject();
    await getUserMetadataSelf();
    // Configure Starting position for map
    var myLatlng = new google.maps.LatLng(37.7749,122.4194);
    map  = new google.maps.Map(document.getElementById('map-canvas'), {
        zoom: 2,
        center: myLatlng
    })
    bounds  = new google.maps.LatLngBounds();
    getLocation();
    loadLastLocations();
    pubnub.subscribe({channels: [geoChannel, geoChannel+'.greet'], withPresence: true});
    pubnub.addListener({
        message:redraw,
        presence: (presenceEvent) => {
            document.getElementById("active-label").innerHTML = presenceEvent.occupancy;
        },
    });
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
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(showPosition);
    } else {
        alert("Not sharing location. Please refresh and try again to share.");
    }
}

function nothing(){}

// Add position as a channel member
async function showPosition(position) {
    console.log("showPosition");
    console.log(pubnub.getUUID());
    console.log(me.name);
    if ( true) {
        console.log("Set Channel Members");
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
        pubnub.publish({channel:geoChannel+"."+pubnub.getUUID(), message:{uuid:pubnub.getUUID(), name: me.name, lat:position.coords.latitude, lng:position.coords.longitude}}); // For future feature: playback of user history
    }
}

/// Populates the map with the last locations seen in the channel
function loadLastLocations() {
    console.log("Loading Last Locations");
    pubnub.objects.getChannelMembers({
        channel: geoChannel,
        sort: { updated: 'desc' },
        include: {
            customFields: true,
            UUIDFields: true,
            customUUIDFields: true,
        },
        limit: 100,
        totalCount: true
    }).then(response => {
        console.log("Response for locations");
        console.log(response);
        // console.log(response);
        var arrayLength = response.data.length;
        for (var i = 0; i < arrayLength; i++) {
            console.log("Enter");
            console.log(response.data[i].custom);
            if (response.data[i].uuid.id != pubnub.getUUID() && response.data[i].custom) {
                console.log(response.data[i].custom.lat);
                loc = new google.maps.LatLng(response.data[i].custom.lat, response.data[i].custom.lng);
                mark[response.data[i].uuid.id] = new google.maps.Marker({
                    position:loc,
                    map:map,
                    label: {
                        text: response.data[i].custom.username,
                        color: "#000000",
                        fontWeight: "bold",
                    }
                });

                console.log(response.data[i]);

                var lastseen = new Date(response.data[i].updated);

                var content = "Name: " + response.data[i].custom.username + '<br>' + "Last Seen: " + lastseen + '<br>' + "Lat: " + response.data[i].custom.lat +  '<br>' + "Long: " + response.data[i].custom.lng +  '<br>' + "Greeting: " + response.data[i].custom.greeting;

                var infowindow = new google.maps.InfoWindow();

                var markdata = response.data[i];

                google.maps.event.addListener(mark[markdata.uuid.id], 'click', (function(markdata,content,infowindow){
                    return function() {
                        infowindow.setContent(content);
                        infowindow.open(map,mark[markdata.uuid.id]);
                        google.maps.event.addListener(map,'click', function(){
                            infowindow.close();
                        });
                    };
                })(markdata,content,infowindow));


                mark[response.data[i].uuid.id].setMap(map);
                bounds.extend(loc);
            }
        }
        if (document.getElementById('fitviewswitch').checked) {
            map.fitBounds(bounds);
            map.panToBounds(bounds);
        }
    });
};

var redraw = function(payload) {
    console.log("REDRAW FUNCTION");
    if (payload.channel == geoChannel) {
        var lineSymbol = {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW
        };
        var lat = payload.message.lat;
        var lng = payload.message.lng;
        lastLat = lat;
        lastLng = lng;
        var uuid = payload.message.uuid;
        var displayName = payload.message.username;
        var greeting = payload.message.greeting;
        var lastseen = new Date(payload.timetoken.substring(0, 10)*1000);
        loc = new google.maps.LatLng(lat, lng);
        if ( document.getElementById('plotnewswitch').checked === false ) {
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

            var content = "Name: " + displayName + '<br>' + "Last Seen: " + lastseen + '<br>' + "Lat: " + lat +  '<br>' + "Long: " + lng +  '<br>' + "Greeting: " + greeting;

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
        } else {
            if (typeof lineCoords[uuid] == 'undefined' || lineCoords[uuid].length == 0) {
                lineCoords[uuid] = [];
            }
            if (mark[uuid] && mark[uuid].setMap) {
                mark[uuid].setMap(null);
            }
            if (lineCoordinatesPath[uuid] && lineCoordinatesPath[uuid].setMap) {
                lineCoordinatesPath[uuid].setMap(null);
            }
            lineCoords[uuid].push(loc);
            lineCoordinatesPath[uuid] = new google.maps.Polyline({
                path: lineCoords[uuid],
                icons: [{
                    icon: lineSymbol,
                    repeat: '35px',
                    offset: '100%'
                }],
                geodesic: true,
                strokeColor: '#C70E20'
            });
            lineCoordinatesPath[uuid].setMap(map);

            mark[uuid] = new google.maps.Marker({
                position:loc,
                map:map,
                label: {
                    text: displayName,
                    color: "#000000",
                    fontWeight: "bold"
                }
            });

            var content = "Name: " + displayName + '<br>' + "Last Seen: " + lastseen + '<br>' + "Lat: " + lat +  '<br>' + "Long: " + lng +  '<br>' + "Greeting: " + greeting;

            var infowindow = new google.maps.InfoWindow();

            google.maps.event.addListener(mark[uuid], 'click', function() {
                infowindow.setContent(content);
                infowindow.open(map,mark[uuid]);
                google.maps.event.addListener(map,'click', function(){
                    infowindow.close();
                });
            });

            mark[uuid].setMap(map);
        }
        bounds.extend(loc);
        if (document.getElementById('fitviewswitch').checked) {
            map.fitBounds(bounds);
            map.panToBounds(bounds);
        }
    } else if (payload.channel ==  GEOchannel+".greet") {
        alert(payload.message);
    }
};


