module.exports = () => {

  const action = {};

  action.run = (api, data) => {
    api.muteMicrophone();
    api.notify('Muted Microphone', 'Your microphone muted by moderator.');
  };

  return action;
};
