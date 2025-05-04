module.exports = () => {

  const action = {};

  action.run = (parent, data) => {
    parent.Room.left();
    parent.callbackAction('exitConference', {}, 'Exit Conference!');
    console.log('Terminate');
  }

  return action;
}
