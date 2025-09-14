module.exports = () => {

  const action = {};

  action.run = (parent, data) => {
    const peerJsId = data.attributes.ban.peerJsId;

    if (peerJsId === parent.peerJsId) {
      parent.notify('You have been banned from this meeting by a moderator.');
      parent.Room.left(parent.Room.information.id);
      parent.callbackAction('exitConference', {}, 'Exit Conference!');
    } else {
      parent.People.remove(peerJsId).then(() => {
        //
      });
    }
  }

  return action;
}
