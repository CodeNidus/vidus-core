const faceDetection = require('./MediapipeFaceDetect.js')();
const bodySegmentation = require('./MediapipeBodySegment.js')();
const screenShare = require('./ShareScreen')();

const errors = [
  { name: ['NotFoundError', 'DevicesNotFoundError'], message: 'required track is missing' },
  { name: ['NotReadableError', 'TrackStartError'], message: 'webcam or mic are already in use ' },
  { name: ['OverconstrainedError', 'ConstraintNotSatisfiedError'], message: 'constraints can not be satisfied by avb. devices' },
  { name: ['NotAllowedError', 'PermissionDeniedError'], message: 'permission denied in browser' },
  { name: ['TypeError'], message: 'empty constraints object' },
];

const createEmptyVideoTrack = ({ width, height }) => {
  const canvas = Object.assign(document.createElement('canvas'), { width, height });
  canvas.getContext('2d').fillRect(0, 0, width, height);

  const stream = canvas.captureStream();
  const track = stream.getVideoTracks()[0];

  return Object.assign(track, { enabled: false });
};

/**
 * Draw video frame image on canvas
 */
const drawVideoOnCanvas = async (video, canvas) => {
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
}

/**
 * Flip horizontal canvas frame image
 */
const flipVideoImage = async (canvas) => {
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(canvas, canvas.width * -1, 0, canvas.width, canvas.height);
  ctx.restore();
}

const scale = 1.33;
const resolutions = {
  qvga: 320,
  vga: 640,
  hd: 1280,
  fhd: 1920
}

module.exports = () => {

  const Media = {
    parent: null,
    devices: null,
    userMedia: null,
    options: null,
    canvas: null,
    video: null,
    interval: null,
    process: false,
    bodySegmenter: null,
    faceDetector: null,
  };

  Media.setup = (parent, options) => {
    this.parent = parent;
    this.events = {
      play: [],
    };
    this.devices = null;
    this.userMedia = null;
    this.options = options;
    this.canvas = document.createElement('canvas');
    this.video = document.createElement('video');

    // set camera resolution size
    const isPortrait = window.innerWidth < window.innerHeight;

    this.options.minVideoWidth = isPortrait? resolutions[this.options.resolution] / scale : resolutions[this.options.resolution];
    this.options.minVideoHeight = isPortrait? resolutions[this.options.resolution] : resolutions[this.options.resolution] / scale;
    this.options.maxVideoWidth = isPortrait? resolutions[this.options.resolution] / scale : resolutions[this.options.resolution];
    this.options.maxVideoHeight = isPortrait? resolutions[this.options.resolution] : resolutions[this.options.resolution] / scale;

    this.canvas.width = this.options.minVideoWidth;
    this.canvas.height = this.options.minVideoHeight;
    this.video.width = this.options.minVideoWidth;
    this.video.height = this.options.minVideoHeight;

    this.bodySegmenter = {
      segmenter: null,
      blur: 0,
    };

    this.faceDetector = {
      detector: null,
      detect: false,
      positions: null,
      callbacks: []
    };

    bodySegmentation.initial(this.parent.configs).then(segmenter => {
      this.bodySegmenter.segmenter = segmenter;

      faceDetection.initial(this.parent.configs).then(detector => {
        this.faceDetector.detector = detector;
      });
    });

    Media.screenShare = screenShare.initial(this.parent);
  }

  /**
   * Grab User Media
   */
  Media.grab = (devices, muteVideo = false, muteAudio = false) => {
    return new Promise(async (resolve, reject) => {
      Media.devices = devices;

      let videoParams = (muteVideo)? false : {
        deviceId: {
          exact: devices.camera,
        },
        width: {
          min: this.options.minVideoWidth,
          max: this.options.maxVideoWidth
        },
        height: {
          min: this.options.minVideoHeight,
          max: this.options.maxVideoHeight
        }
      };

      let audioParams = {
        deviceId: {
          exact: devices.microphone
        }
      };

      navigator.mediaDevices.getUserMedia({
        video: videoParams,
        audio: audioParams
      }).then(media => {

        clearInterval(this.interval);

        if (this.parent.userSettings.camDisable) {
          media.addTrack(createEmptyVideoTrack({ width:640, height:480 }));
        }

        this.video.srcObject = media;
        this.video.muted = true;
        this.video.play();

        const audioTrack = media.getAudioTracks()[0];

        this.video.addEventListener('loadeddata', Media.setInterval);

        const processedMedia = this.canvas.captureStream();
        processedMedia.addTrack(audioTrack);

        Media.userMedia = processedMedia;

        if (muteAudio) {
          Media.muteMicrophone();
        }

        resolve(processedMedia);
        }).catch(error => {
          let message = null;

          for (const item of errors) {
            if (item.name.includes(error.name)) {
              message = item.message;
              break;
            }
          }

          reject(message || error.name);
        });
    });
  }

  Media.setInterval = () => {
    if (!this.parent.userSettings.camDisable) {
      this.process = false;
      this.interval = setInterval(Media.processOnMedia, 1000 / this.parent.configs.mediapipe.fps);
    }
  }

  Media.processOnMedia = async () => {
    if (this.process) return;

    this.process = true;

    await drawVideoOnCanvas(this.video, this.canvas);

    if(!this.parent.userSettings.camDisable) {
      await flipVideoImage(this.canvas);

      if (this.bodySegmenter.blur > 0) {
        await bodySegmentation.blur(this.bodySegmenter, this.canvas);
      }

      if (this.faceDetector && this.faceDetector.callbacks.length > 0) {
        const index =  this.faceDetector.callbacks.findIndex(x => x.enable);

        if (index > -1) {
          await faceDetection.detect(this.faceDetector, this.canvas);

          this.faceDetector.callbacks.forEach(item => {
            if(!item.enable || this.faceDetector.positions.length === 0) return;
            item.callback(this.faceDetector.positions[0].box, this.canvas, item.name);
          });
        }
      }
    }

    this.process = false;
  }

  Media.blurBackground = (status = true) => {
    this.bodySegmenter.blur = (!status)? 0 : 20;
  }

  /**
   * Mediapipe face detection callback actions register
   */
  Media.registerFaceDetectorCallback = (name, callback) => {

    if (!this.faceDetector?.callbacks) {

    }

    let index = this.faceDetector?.callbacks.findIndex(x => x.name === name) || -1;

    if (index > 0) {
      this.faceDetector.callbacks[index]['callback'] = callback;
    } else {
      index = this.faceDetector.callbacks.push({
        name: name,
        enable: false,
        callback: callback
      }) - 1;
    }

    return this.faceDetector.callbacks[index];
  }

  /**
   * Release User Media
   */
  Media.release = () => {
    const stopTracks = (item) => {
      const stream = item.srcObject;

      if (stream) {
        const tracks = stream?.getTracks();

          tracks.forEach((track) => {
              track.stop();
          });
      }

    }

    stopTracks(this.video);
    clearInterval(this.interval);

    this.video.removeEventListener('loadeddata', Media.setInterval);

    Media.userMedia = null;
  }

  /**
   * Reset all connections media
   */
  Media.resetConnectionsStream = () => {
    const connections = this.parent.People.getConnections();

    connections.forEach(connection => {
      Media.streamVideo(connection.peerJsId, connection.stream);
      Media.streamAudio(connection.peerJsId, connection.stream);
    });
  }

  /**
   * Set mediaStream video
   */
  Media.streamVideo = (peerJsId, media, options = {}) => {
    let reference = (!peerJsId)? this.options.localVideoRef : this.options.remoteVideoRef + '-' + peerJsId;
    let video = document.getElementById(
        (!!options?.customReference)?
            options.customReference :
            reference
    );

    video.muted = (!options?.videoMute || options.videoMute === true);
    video.srcObject = media;
    video.addEventListener('loadedmetadata', () => {
      video.play();
    }, { once: true });

    if (!options?.eventListener || options.eventListener === true) {
      video.addEventListener('play', () => {
        if(!this.events.play && this.events.play.length > 0) {
          this.events.play.forEach((item) => {
            if(!item.handler) return false;
            item.handler(video);
          });
        }
      }, { once: true });
    }
  }

  /**
   * Set mediaStream audio
   */
  Media.streamAudio = (peerJsId, media) => {
    let reference = this.options.remoteAudioRef + '-' + peerJsId;
    let audio = document.getElementById(reference);

    audio.srcObject = media;
  }

  Media.setEvent = (name = 'none', handler = () => {}, section = 'play') => {
    if (!Media.hasOwnProperty('events')) Media.events = {};
    if (!Media.events.hasOwnProperty(section)) Media.events[section] = [];

    let index = Media.events[section].findIndex(x => x.name === name);
    let item  = {
      name: name,
      handler: handler
    };

    if (index > -1) {
      Media.events[section][index] = item;
    } else {
      Media.events[section].push(item);
    }
  }

  /**
   * Mute user camera to other users
   */
  Media.muteCamera = () => {
    Media.terminateConnectionsVideoAudioMedia('video');
  }

  /**
   * Mute user microphone to other users
   */
  Media.muteMicrophone = () => {
    Media.terminateConnectionsVideoAudioMedia('audio');
  }

  /**
   * Reset joined users peer video audio stream media
   */
  Media.resetConnectionsVideoAudioMedia = (media) => {
    let connections = this.parent.People.getConnections();

    connections.forEach(connection => {
      let senders = connection.mediaConnection.peerConnection.getSenders();
      let camIndex = senders.findIndex(x => x.track && x.track.kind === 'video');
      let micIndex = senders.findIndex(x => x.track && x.track.kind === 'audio');

      if (camIndex > -1) {
        senders[camIndex].replaceTrack(media.getVideoTracks()[0]);
      } else {
        connection.mediaConnection.peerConnection.addTrack(media.getVideoTracks()[0]);
      }

      if (micIndex > -1) {
        senders[micIndex].replaceTrack(media.getAudioTracks()[0]);
      } else {
        connection.mediaConnection.peerConnection.addTrack(media.getAudioTracks()[0]);
      }

      connection.dataConnection.send({
        event: 'muteMedia',
        camMute: this.parent.userSettings.camDisable,
        micMute: this.parent.userSettings.micDisable
      });
    });
  }

  /**
   * Trigger events for connections by peerjs data connection
   */

  Media.sendUserMediaMuteStatusByDataConnection = (videoStatus, audioStatus) => {
    let connections = this.parent.People.getConnections();

    connections.forEach(connection => {
      connection.dataConnection.send({
        event: 'muteMedia',
        camMute: videoStatus,
        micMute: audioStatus
      });
    });
  }

  /**
   * Terminate joined user peer video audio stream media by type
   */
  Media.terminateConnectionsVideoAudioMedia = (type = 'video') => {
    let connections = this.parent.People.getConnections();

    if (type === 'video' && !this.parent.userSettings.camDisable) {
      Media.release()
      Media.grab(
        Media.devices,
        this.parent.userSettings.camDisable,
        this.parent.userSettings.micDisable
      ).then(media => {
        Media.streamVideo(null, media);
        Media.resetConnectionsVideoAudioMedia(media);
      })
    } else if (type === 'video') {
      this.video.srcObject.getVideoTracks().forEach(track => {
        track.stop();
      });
      clearInterval(this.interval);
    } else {
      this.video.srcObject.getAudioTracks().forEach(track => {
        track.enabled = !this.parent.userSettings.micDisable;
      })
    }

    connections.forEach(connection => {
      connection.dataConnection.send({
        event: 'muteMedia',
        camMute: this.parent.userSettings.camDisable,
        micMute: this.parent.userSettings.micDisable
      });
    });
  }

  Media.setConnectionMediaStatus = (data) => {
    const connections = this.parent.People.getConnections();
    let connection = connections.find(x => x.peerJsId === data.peerJsId);

    if (connection) {
      connection.camMute = data.camMute;
      connection.micMute = data.micMute;
      Media.streamVideo(data.peerJsId, connection.mediaConnection.remoteStream);
      Media.streamAudio(data.peerJsId, connection.mediaConnection.remoteStream);

      if(connection.camMute) {
        connection.camCover = true;
      } else {
        setTimeout(() => {
          connection.camCover = false;
        }, 500)
      }
    }
  }

  Media.screenShare = {};

  return Media;
}
