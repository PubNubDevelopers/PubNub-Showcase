
async function messageReceived(payload){
	if(payload.channel.includes(pubnub.getUUID())){
		if(mark.hasOwnProperty(payload.publisher)){
			console.log("Mark has Property");
			// Show Message
			try{
				var infoMessage = "<b>Message delivered via PubNub</b> <br></br>";
				infoMessage += messageContents(payload.message);
				var infowindow = new google.maps.InfoWindow();
				infowindow.setContent(infoMessage);
				infowindow.open(map, mark[payload.publisher]);
				await timeout(5);
				infowindow.close();
			}
			catch(e){
				console.log(e);
			}
		}
	}
	else if(payload.channel == geoChannel) {
		try{
			if(payload.message && payload.message.address && payload.message.uuid == pubnub.getUUID() && !travelHistory.hasOwnProperty(payload.timetoken)){
				travelHistory[payload.timetoken] = payload.message.address;
				var div = document.createElement("div");
				div.classList.add("card");
				div.appendChild(document.createTextNode(payload.message.address));
				var ul = document.getElementById("history-list");
				ul.appendChild(div);
			}
			redraw(payload);
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