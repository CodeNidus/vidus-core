module.exports = () => {

  const action = {};

  action.run = (api, data) => {
    const peerJsId = api.getPeerJsId();

    if (data.attributes.ban.peerJsId === peerJsId) {
      api.notify('User ban', 'You have been banned from this meeting by a moderator.');
      api.leftRoom();
      api.emit('onExitConference');
    } else {
      api.notify('User ban', data.attributes.ban.name + ' have been banned from this meeting by a moderator.');
    }
  };

  return action;
};
