module.exports = () => {

  const action = {};

  action.run = (api, data) => {
    api.emit('onFaceApiAction-DetectAndDraw', {
      detail: data.attributes
    });
  };

  return action;
};
