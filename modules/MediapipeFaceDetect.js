const FaceDetection = require('@tensorflow-models/face-detection');

module.exports = () => {

  const face = {};

  face.initial = (configs) => {
    return new Promise(async (resolve, reject) => {
      try {
        const model = FaceDetection.SupportedModels.MediaPipeFaceDetector;

        const detectorConfig = {
          runtime: 'mediapipe',
          solutionPath: configs.mediapipe.models.faceDetector,
        };

        const detector = await FaceDetection.createDetector(model, detectorConfig);
        resolve(detector);
      } catch(error) {
        reject(error);
      }
    });
  }

  face.detect = async (faceDetector, canvas) => {
    faceDetector.positions = await faceDetector.detector.estimateFaces(canvas, {
      flipHorizontal: false
    });
  }

  return face;
}
