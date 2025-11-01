module.exports = () => {

  const action = {};

  action.run = (api, data) => {
    const socket = api.getSocket();
    const peerJsId = api.getPeerJsId();

    if (data.attributes.peerJsId === peerJsId) {
      if (data.attributes.status && data.attributes.access) {
        socket.emit('join-room-from-waiting-list', data.attributes.roomId, {
          access: data.attributes.access
        });
      } else {
        api.notify('Request Declined', 'Your request to join this room was not approved.');
        api.emit('onExitConference');
      }
    }
  };

  return action;
};
