module.exports = () => {

  const action = {};

  action.run = (api, data) => {
    const peerJsId = api.getPeerJsId();

    if (data.attributes.ban.peerJsId === peerJsId) {
      api.notify('User ban', 'You have been banned from this meeting by a moderator.');
      api.leftRoom();
      api.emit('onExitConference');
    } else {
      const connections = api.getConnections();
      const user = connections.find(x => x.peerJsId === data.attributes.ban.peerJsId);

      parent.notify('User ban', user.name + ' have been banned from this meeting by a moderator.');
    }
  };

  return action;
};
