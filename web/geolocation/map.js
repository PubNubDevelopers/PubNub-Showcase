// This file Initializes searching locations using the Google Maps Place API
// Displays positions using Markers in Google Maps

// Initalize Map search using the Place API, Configure Geocoder.
function initalizeMapSearch(){
  const card = document.getElementById("pac-card");
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(card);
  const input = document.getElementById("pac-input");
  const autocomplete = new google.maps.places.Autocomplete(input);
  const southwest = { lat: 5.6108, lng: 136.589326 };
  const northeast = { lat: 61.179287, lng: 2.64325 };
  const newBounds = new google.maps.LatLngBounds(southwest, northeast);
  autocomplete.setBounds(newBounds);
  var infowindow = new google.maps.InfoWindow();
  const infowindowContent = document.getElementById("infowindow-content");
  infowindow.setContent(infowindowContent);
  geocoder = new google.maps.Geocoder();


  autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if(lastLocation == place.formatted_address){
          return;
      }
      // Set last location
      lastLocation = place.formatted_address;

      if (!place.geometry || !place.geometry.location) {
          // User entered the name of a Place that was not suggested and
          // pressed the Enter key, or the Place Details request failed.
          window.alert("No details available for input: '" + place.name + "'");
          return;
      }

      // Configure map settings
      map.setCenter(place.geometry.location);
      map.setZoom(3);

      // Publish new position to PubNub
      showNewPosition(place);
  });
}

// Display
function displayPosition(payload){
  try{
    loc = new google.maps.LatLng(payload.message.lat, payload.message.lng);
    var img = channelMembers[payload.message.uuid].profileUrl;
    const image = {
        url: img,
        scaledSize: new google.maps.Size(30, 30),
    };

    if (mark[payload.message.uuid] && mark[payload.message.uuid].setMap) {
        mark[payload.message.uuid].setMap(null);
    }
    mark[payload.message.uuid] = new google.maps.Marker({
        position: loc,
        map: map,
        icon: image,
        animation: google.maps.Animation.DROP,
        optimized: true,
        label: {
            text: payload.message.name,
            color: "#000000",
        }
    });

    var lastseen = new Date(payload.timetoken / 10000000);

    var content = "Name: " + payload.message.name + '<br>' + "Last Seen: " + lastseen + '<br>' + "Lat: " + payload.message.lat +  '<br>' + "Long: " + payload.message.lng;

    var infowindow = new google.maps.InfoWindow();

    google.maps.event.addListener(mark[payload.message.uuid], 'click', (function(content,infowindow){
        return function() {
            // toggleBounce(mark[payload.uuid]);
            infowindow.setContent(content);
            infowindow.open(map, mark[payload.uuid]);
            google.maps.event.addListener(map,'click', function(){
                infowindow.close();
            });
        };
    })(content, infowindow));


    mark[payload.message.uuid].setMap(map);
  }
  catch(e){
    console.log(e);
  }
}