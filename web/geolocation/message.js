/**
 * This file contains logic for receiving messages and converting them into a user-readable form.
 * In this case messages are used for two use-cases: Displaying direct messages above the marker, Updating a location on the map (Moving a marker from one place to another)
 * For notes about transitioning between this demo and a production app, see chat.js.
 */

//  Handler for the PubNub message event
async function messageReceived(payload){
	// If the channel indicates it is a direct message
	if(payload.channel.includes(pubnub.getUUID())){
		if(mark.hasOwnProperty(pubnub.getUUID())){
			// Show Message in a popup bubble above users marker
			try{
				var infoMessage = "<img src='../pn_small.png'> <b>Message delivered via PubNub</b> <br></br>";
				infoMessage += messageContents(payload.message);
				var infowindow = new google.maps.InfoWindow();
				infowindow.setContent(infoMessage);
				infowindow.open(map, mark[pubnub.getUUID()]);
				await timeout(5);
				infowindow.close();
			}
			catch(e){
				console.log(e);
			}
		}
	}
	// If the channel is the GEO_CHANNEL, a locaiton update
	else if(payload.channel == GEO_CHANNEL) {
		try{
			if(payload.message && payload.message.content && payload.message.content.address && payload.message.content.uuid == pubnub.getUUID() && !travelHistory.hasOwnProperty(payload.timetoken)){
				travelHistory[payload.timetoken] = payload.message.content.address;
				displayMessage(payload.message.content.address);
			}
			// Update new position on the map
			displayPosition(payload);
		}
		catch(e){
			console.log(e);
		}
	}
}

//  Wrapper function to cater for whether the message had an associated image
function messageContents(messageData)
{
	if (messageData.content.attachments[0].image.source != null)
	{
		//  There was an image attachment with the message
		var imageRender = "<img src='" + messageData.content.attachments[0].image.source + "' height='200'><br>";
		return imageRender + messageData.content.text;
	}
	else{
		return messageData.content.text;
	}
}

function timeout(s) {
	return new Promise(resolve => setTimeout(resolve, s*1000));
}

// Function to render message onto screen
// Displays in the TravelHistory section
function displayMessage(address){
	var p = document.createElement("p");
	p.classList.add("text-label");
	p.style.color = "#525252";
	p.appendChild(document.createTextNode(address));
	var ul = document.getElementById("history-list");
	ul.appendChild(p);
}