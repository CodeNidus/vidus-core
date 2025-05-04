module.exports = () => {

  const action = {};

  action.run = (parent, data) => {
    if (data.attributes.peerJsId === parent.peerJsId) {
      if (data.attributes.status && data.attributes.access) {
        parent.socket.emit('join-room-from-waiting-list', data.attributes.roomId, {
          access: data.attributes.access
        });
      } else {
        parent.callbackAction('exitConference', {}, 'Exit Conference!');
      }
    }
  }

  return action;
}
