module.exports = () => {

  const action = {};

  action.run = (api, data) => {
    api.emit('onFaceDetectDraw', {
      detail: data.attributes
    });
  };

  return action;
};
