const BodySegmentation = require('@tensorflow-models/body-segmentation');

module.exports = () => {

  const body = {};

  body.initial = (configs) => {
    return new Promise(async (resolve, reject) => {
      try {
        const model = BodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;
        const segmenterConfig = {
          runtime: 'mediapipe',
          solutionPath: configs.mediapipe.models.bodySegmentation,
          modelType: 'general'
        }
        const segmenter = await BodySegmentation.createSegmenter(model, segmenterConfig);
        resolve(segmenter);
      } catch(error) {
        reject(error);
      }
    });
  }

  body.blur = async (bodySegmenter, canvas) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);

    const people = await bodySegmenter.segmenter.segmentPeople(tempCanvas, {
      multiSegmentation: false,
      segmentBodyParts: true
    });

    const foregroundThreshold = 1;
    const edgeBlurAmount = 3;

    await BodySegmentation.drawBokehEffect(
      canvas,
      tempCanvas,
      people,
      foregroundThreshold,
      bodySegmenter.blur,
      edgeBlurAmount,
      false,
    );
  }

  return body;
}
