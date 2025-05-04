module.exports = () => {

  const action = {};

  action.run = (parent, data) => {
    const event = new CustomEvent('onFaceApiAction-DetectAndDraw', {
      detail: data.attributes
    });

    window.dispatchEvent(event);
  }

  return action;
}
