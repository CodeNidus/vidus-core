module.exports = () => {

  const action = {};

  action.run = (parent, data) => {
    console.log(data);

    if (data.attributes.ban.peerJsId === parent.peerJsId) {
      alert('You ban by moderator!?');
      parent.Room.left(parent.Room.information.id);
      parent.callbackAction('exitConference', {}, 'Exit Conference!');
    } else {
      parent.People.remove({
        peerJsId: data.attributes.ban.peerJsId
      }).then(() => {
        // alert('User is Ban by moderator!?');
      });
    }
  }

  return action;
}
