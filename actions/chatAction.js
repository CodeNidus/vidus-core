module.exports = () => {

  const action = {};

  action.run = (api, data) => {
    api.emit('onChatMessageReceived', {
      detail: data.attributes
    });
  };

  return action;
};
