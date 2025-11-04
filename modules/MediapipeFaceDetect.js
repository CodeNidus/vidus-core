const FaceDetection = require('@tensorflow-models/face-detection');

module.exports = () => {
  const face = {};

  face.initial = async (configs) => {
    const model = FaceDetection.SupportedModels.MediaPipeFaceDetector;

    const detectorConfig = {
      runtime: 'mediapipe',
      solutionPath: configs.mediapipe.models.faceDetector,
    };

    return await FaceDetection.createDetector(model, detectorConfig);
  };

  face.detect = async (faceDetector, canvas) => {
    faceDetector.positions = await faceDetector.detector.estimateFaces(canvas, {
      flipHorizontal: false
    });
  };

  return face;
};
