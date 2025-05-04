module.exports = () => {

  const action = {};

  action.run = (parent, data) => {
    const event = new CustomEvent('onChatAction-ReceivedMessage', {
      detail: data.attributes
    });

    window.dispatchEvent(event);
  }

  return action;
}
