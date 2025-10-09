module.exports = () => {

  const action = {};

  action.run = (api, data) => {
    api.emit('onChatAction-ReceivedMessage', {
      detail: data.attributes
    });
  };

  return action;
};
