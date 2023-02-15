/*
..######...#######..##....##..######..########
.##....##.##.....##.###...##.##....##....##...
.##.......##.....##.####..##.##..........##...
.##.......##.....##.##.##.##..######.....##...
.##.......##.....##.##..####.......##....##...
.##....##.##.....##.##...###.##....##....##...
..######...#######..##....##..######.....##...
*/

var geoChannel = "Geolocation Channel";

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
var pubnub = null
// Map Configuration
var map = null;
var bounds = [];

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
    // Configure Starting position for map
    var myLatlng = new google.maps.LatLng(37.7749,122.4194);
    map  = new google.maps.Map(document.getElementById('map-canvas'), {
        zoom: 2,
        center: myLatlng
    })
    bounds  = new google.maps.LatLngBounds();
    getLocation();
}

// Get current location
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(nothing);
    } else {
        alert("Not sharing location. Please refresh and try again to share.");
    }
}

function nothing(){}

// Add position as a channel membe
function showPosition(position) {
    if ( document.getElementById('locationshareswitch').checked === false ) {
     pubnub.objects.setChannelMembers({
         channel: GEOchannel,
         uuids: [
             UUID,
             { id: UUID, custom: {
                 lat: position.coords.latitude,
                 lng: position.coords.longitude,
                 username: username,
                 greeting: greeting
             }},
         ],
     })
     .then((resp) => {
        //console.log(resp);
     })
     .catch((error) => {
         console.log(err);
     });
     pubnub.publish({channel:GEOchannel, message:{uuid:UUID, username:username, greeting: greeting, lat:position.coords.latitude, lng:position.coords.longitude}});
     pubnub.publish({channel:GEOchannel+"."+UUID, message:{uuid:UUID, username:username, greeting: greeting, lat:position.coords.latitude, lng:position.coords.longitude}}); // For future feature: playback of user history
    }
 }

/// Populates the map with the last locations seen in the channel
function loadLastLocations(loadChannel) {
    pubnub.objects.getChannelMembers({
        channel: loadChannel,
        include: {
            customFields: true,
            UUIDFields: true,
            customUUIDFields: true,
        },
    }).then(response => {
        // console.log(response);
        var arrayLength = response.data.length;
        for (var i = 0; i < arrayLength; i++) {
            if (response.data[i].uuid.id != UUID && response.data[i].custom) {
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


