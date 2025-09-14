module.exports = () => {

  const action = {};

  action.run = (parent, data) => {
    const peerJsId = data.attributes.ban.peerJsId;

    if (peerJsId === parent.peerJsId) {
      parent.notify('User ban', 'You have been banned from this meeting by a moderator.');
      parent.Room.left(parent.Room.information.id);
      parent.callbackAction('exitConference', {}, 'Exit Conference!');
    } else {
      const connections = parent.People.getConnections();
      const user = connections.find(x => x.peerJsId === peerJsId);

      parent.People.remove(peerJsId);
      parent.notify('User ban', user.name + ' have been banned from this meeting by a moderator.');
    }
  }

  return action;
}
