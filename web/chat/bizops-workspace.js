/**
 * This file contains handlers for functions related to BizOps Workspace
 * Specifically, the ability to change Channel and user information
 * from within the PubNub Admin Dashboard.
 * More specifically, these functions support the App Context Toolkit
 */

var lastUpdate = null

function channelMetaDataHasUpdated(channelData)
{
  //  Update the cached data
  var cacheToUpdate = -1;
  for (var i = 0; i < cached_groups.public_groups.length; i++)
  {
    if (cached_groups.public_groups[i].channel == channelData.channel)
    {
      //  Update this element
      cacheToUpdate = i
    }
  }

  var channelName = document.getElementById('channelName-' + channelData.channel)
  var channelNameSide = document.getElementById('channelName-s' + channelData.channel)
  var channelDescription = document.getElementById('chat-info-description')
  var channelProfileIcon = document.getElementById('channelProfileIcon-' + channelData.channel)
  var channelProfileIconSide = document.getElementById('channelProfileIcon-s' + channelData.channel)
  var channelInfo = document.getElementById('channelInfo-' + channelData.channel)
  var channelInfoSide = document.getElementById('channelInfo-s' + channelData.channel)
  if (channelName == null) {
    //  Trying to update a channel we don't have on our UI (should not happen)
    return
  }
  else
  {
    //  Channel Name
    var newChannelName = channelData.message.data.name
    if (newChannelName === null) { newChannelName = "" }
    if (typeof newChannelName !== 'undefined')
    {
      if (cacheToUpdate > -1) {cached_groups.public_groups[cacheToUpdate].name = newChannelName}
      channelName.innerHTML = newChannelName
      channelNameSide.innerHtml = newChannelName
      //  Special consideration for channel name, update the active channel if appropriate
      activeChannel = sessionStorage.getItem('activeChatChannel')
      if (activeChannel !== null) {
        if (channelData.channel == activeChannel)
        {
          document.getElementById('heading').innerHTML = newChannelName
        }
      }
    }

    //  Channel Description
    var newChannelDescription = channelData.message.data.description
    if (newChannelDescription === null) { newChannelDescription = "" }
    if (typeof newChannelDescription !== 'undefined')
    {
      if (cacheToUpdate > -1) {cached_groups.public_groups[cacheToUpdate].description = newChannelDescription}
      //  The description is only shown for the active channel
      activeChannel = sessionStorage.getItem('activeChatChannel')
      if (activeChannel !== null) {
        if (channelData.channel == activeChannel)
        {
          channelDescription.innerHTML = newChannelDescription
        }
      }
    }

    //  Channel Profile Icon
    if (channelData.message.data.custom)
    {
      var newChannelProfileIcon = channelData.message.data.custom.profileIcon
      if (newChannelProfileIcon === null) { newChannelProfileIcon = "" }
      if (typeof newChannelProfileIcon !== 'undefined')
      {
        if (!newChannelProfileIcon.startsWith('http')) { newChannelProfileIcon = "../img/group/" + newChannelProfileIcon }
        if (cacheToUpdate > -1) {cached_groups.public_groups[cacheToUpdate].profileIcon = newChannelProfileIcon}
        channelProfileIcon.src = newChannelProfileIcon
        channelProfileIconSide.src = newChannelProfileIcon
      }  
    }    

    //  Channel Info
    if (channelData.message.data.custom)
    {
      var newChannelInfo = channelData.message.data.custom.info
      if (newChannelInfo === null) { newChannelInfo = ""; channelInfo.style.display = "none"; channelInfoSide.style.display = "none" }
      if (typeof newChannelInfo !== 'undefined')
      {
        if (cacheToUpdate > -1) {cached_groups.public_groups[cacheToUpdate].info = newChannelInfo}
        channelInfo.innerHTML = newChannelInfo
        channelInfoSide.innerHTML = newChannelInfo
        channelInfo.style.display = 'flex'
        channelInfoSide.style.display = 'flex'
      }  
    }        
  }
}

async function channelDeleted(channelData)
{
    //  Currently, this only applies to public channels, since these are the only channels that use app context

    //  Remove the channel from the UI
    var groupElement = document.getElementById('group-' + channelData.channel)
    var groupElementSide = document.getElementById('group-s' + channelData.channel)
    if (groupElement) {groupElement.remove()}
    if (groupElementSide) {groupElementSide.remove()}

    //  Update the channel cache
    for (var i = 0; i < cached_groups.public_groups.length; i++)
    {
      if (cached_groups.public_groups[i].channel == channelData.channel)
      {
        cached_groups.public_groups.splice(i, 1);
      }
    }

    //  Remove ourself as a member of the channel
    pubnub.objects.removeMemberships({
        uuid: pubnub.getUserId(),
        channels: [channelData.channel]
    })

    //  If we were currently in the deleted channel, select another public channel (if there is one)
    activeChannel = sessionStorage.getItem('activeChatChannel')
    if (activeChannel !== null) {
      if (channelData.channel == activeChannel)
      {
        if (cached_groups.public_groups.length > 0)
        {
            channel = cached_groups.public_groups[0].channel
            await populateChatWindow(channel)    
        }
      }
    }
}

async function userMetaDataHasUpdated(userInfo)
{
    //  The only two attributes we store in app context are the user's name and profile URL (icon URL)
    if (userInfo.id.includes('sim_')) return

    if (!lastUpdate || lastUpdate < userInfo.updated)
    {
      lastUpdate = userInfo.updated
    }
    else
    {
      //  Ignoring update - out of order
      return
    }
    
    //  User Name
    var newUsername = userInfo.name
    var newProfileUrl = userInfo.profileUrl
    if (newUsername === null) { newUsername = "" }
    if (newProfileUrl === null) { newProfileUrl = BLANK_AVATAR }
    //  Is this our User ID?
    if (pubnub.getUserId() === userInfo.id)
    {
        getUserMetadataSelf()
    }
    else 
    {
        //  Not us
        if (typeof newUsername !== 'undefined')
        {
            //  Username update
            //  Update our cache
            if (userData[userInfo.id]) { userData[userInfo.id].name = newUsername}

            //  Look for this user ID in our chats
            var remoteUserName = document.getElementById(userInfo.id + '-channelName')
            var remoteUserNameSide = document.getElementById(userInfo.id + 's-channelName')
            if (remoteUserName) {remoteUserName.innerText = newUsername}
            if (remoteUserNameSide) {remoteUserNameSide.innerText = newUsername}
        }

        if (typeof newProfileUrl !== 'undefined')
        {
            //  Profile URL updated
            if (userData[userInfo.id]) { userData[userInfo.id].profileUrl = newProfileUrl}

            //  Look for this user ID in our chats
            var remoteProfileUrl = document.getElementById(userInfo.id + '-remoteProfileUrl')
            var remoteProfileUrlSide = document.getElementById(userInfo.id + 's-remoteProfileUrl')
            if (remoteProfileUrl) {remoteProfileUrl.src = newProfileUrl}
            if (remoteProfileUrlSide) {remoteProfileUrlSide.src = newProfileUrl}
        }

        var activeChatChannel = sessionStorage.getItem('activeChatChannel')
        if (activeChatChannel.toLowerCase().includes('public.'))
        {
          //  Update any public channel, just in case the user whose info changed was an active participant
          await populateChatWindow(channel)
        }
        else
        {
          //  Test if we are currently talking with this user
          var tempChannel = createDirectChannelName(pubnub.getUserId(), userInfo.id)
          if (tempChannel == activeChatChannel)
          {
            await populateChatWindow(channel)
          }            
      }
    }
    
}