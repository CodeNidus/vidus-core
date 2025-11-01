module.exports = () => {

  const action = {};

  action.run = (api, data) => {
    api.leftRoom();
    api.emit('onExitConference');
  };

  return action;
};
