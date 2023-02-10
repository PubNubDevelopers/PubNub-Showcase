var predefined_groups = {
  groups: [
    {
      channel: 'Public.global',
      name: 'Global (All Users)',
      profileIcon: 'group-global.png',
      description: 'Group containing all users in the chat system'
    },
    {
      channel: 'Public.location-chat',
      name: 'Location Updates',
      profileIcon: 'group-location.png',
      description: 'Used by the Geolocation demo.  Share your location with the world.  Remember, you can log out to stop your data being publicly visible'
    },
    {
      channel: 'Public.puzzles',
      name: 'Puzzle Fans',
      profileIcon: 'group-test.png',
      description: 'A group for people who love puzzles'
    }
  ],
  private_groups: [
    //  Note, channel names containing 'uuid' will have that uuid replaced with the user's actual UUID
    {
      channel: 'Private.uuid-iot',
      name: 'My Home (IoT)',
      profileIcon: 'group-iot.png',
      description:
        'Used by the IoT demo.  Notifications from your smart home, only shared with members of your household'
    }
  ]
}
