module.exports = () => {

  const action = {};

  action.run = (parent, data) => {
    parent.Media.muteMicrophone(true);
    parent.notify('Mute Microphone', 'Your microphone mute by moderator.');
  };

  return action;
};
