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
			if(payload.message && payload.message.address && payload.message.uuid == pubnub.getUUID() && !travelHistory.hasOwnProperty(payload.timetoken)){
				travelHistory[payload.timetoken] = payload.message.address;
				var div = document.createElement("div");
				div.classList.add("card");
				div.prepend(document.createTextNode(payload.message.address));
				var ul = document.getElementById("history-list");
				ul.prepend(div);
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
	if (messageData.attachment != null)
	{
		//  There was an image attachment with the message
		var imageRender = "<img src='" + messageData.attachment + "' height='200'><br>";
		return imageRender + messageData.message;
	}
	else{
		return messageData.message;
	}
}

function timeout(s) {
	return new Promise(resolve => setTimeout(resolve, s*1000));
}