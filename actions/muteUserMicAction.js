module.exports = () => {

  const action = {};

  action.run = (parent, data) => {
    parent.userSettings.micDisable = true;
    parent.Media.muteMicrophone();
    parent.callbackAction('muteMicrophone', {}, 'Your microphone mute by room manager.');
  }

  return action;
}
