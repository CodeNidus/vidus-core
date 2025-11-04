const faceDetection = require('./MediapipeFaceDetect.js')();
const bodySegmentation = require('./MediapipeBodySegment.js')();
const screenShare = require('./ShareScreen')();
const screenRecord = require('./RecordScreen')();

module.exports = () => {

  const DEFAULT_FPS = 30;
  const BLUR_INTENSITY = 20;
  const VIDEO_SCALE = 1.33;
  const RESOLUTIONS = {
    qvga: 320,
    vga: 640,
    hd: 1280,
    fhd: 1920
  };

  const mediaGrabErrors = [
    { name: ['NotFoundError', 'DevicesNotFoundError'], message: 'required track is missing' },
    { name: ['NotReadableError', 'TrackStartError'], message: 'webcam or mic are already in use ' },
    { name: ['OverconstrainedError', 'ConstraintNotSatisfiedError'], message: 'constraints can not be satisfied by avb. devices' },
    { name: ['NotAllowedError', 'PermissionDeniedError'], message: 'permission denied in browser' },
    { name: ['TypeError'], message: 'empty constraints object' },
  ];

  /**
   * Create an empty, disabled video track by drawing a black canvas frame.
   * Useful when camera is disabled but a video track is still needed in the stream.
   */
  const createEmptyVideoTrack = ({ width, height }) => {
    const canvas = Object.assign(document.createElement('canvas'), { width, height });
    canvas.getContext('2d').fillRect(0, 0, width, height);

    const stream = canvas.captureStream();
    const track = stream.getVideoTracks()[0];

    return Object.assign(track, { enabled: false });
  };

  /**
   * Draw the current frame from a video element onto a canvas.
   * @param {HTMLVideoElement} video
   * @param {HTMLCanvasElement} canvas
   */
  const drawVideoOnCanvas = async (video, canvas) => {
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  };

  /**
   * Flip the canvas horizontally to create a mirror image effect.
   * @param {HTMLCanvasElement} canvas
   */
  const flipVideoImage = async (canvas) => {
    const ctx = canvas.getContext('2d');

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(canvas, canvas.width * -1, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  const Media = {
    parent: null,
    devices: null,
    userMedia: null,
    options: null,
    canvas: null,
    video: null,
    interval: null,
    process: false,
    events: null,
    bodySegmenter: {
      segmenter: null,
      blur: 0,
    },
    faceDetector: {
      detector: null,
      detect: false,
      positions: null,
      callbacks: []
    },
  };

  /**
   * Setup the Media module with parent config and options.
   * Initialize user video and canvas elements, user video resolutions, and subsystems.
   */
  Media.setup = async (parent, options) => {
    Media.parent = parent;
    Media.options = options;
    Media.devices = null;
    Media.userMedia = null;
    Media.events = {
      play: [],
    };

    // set camera resolution size
    const isPortrait = window.innerWidth < window.innerHeight;
    const resolution = RESOLUTIONS[Media.options.resolution];

    Media.options.minVideoWidth = isPortrait? resolution / VIDEO_SCALE : resolution;
    Media.options.minVideoHeight = isPortrait? resolution : resolution / VIDEO_SCALE;
    Media.options.maxVideoWidth = isPortrait? resolution / VIDEO_SCALE : resolution;
    Media.options.maxVideoHeight = isPortrait? resolution : resolution / VIDEO_SCALE;

    Media.canvas = document.createElement('canvas');
    Media.video = document.createElement('video');

    Media.canvas.width = Media.options.minVideoWidth;
    Media.canvas.height = Media.options.minVideoHeight;
    Media.video.width = Media.options.minVideoWidth;
    Media.video.height = Media.options.minVideoHeight;

    try {
      Media.screenShare = screenShare.initial(Media.parent);
      Media.screenRecord = screenRecord.initial(Media.parent);
      Media.bodySegmenter.segmenter = await bodySegmentation.initial(Media.parent.configs);
      Media.faceDetector.detector = await faceDetection.initial(Media.parent.configs);
    } catch (error) {
      console.error('Media setup failed:', error);
      throw error;
    }
  };

  /**
   * Requests camera and microphone permissions from the user
   * @returns {object} Media permission state & available devices list
   */
  Media.grantPermissions = async () => {
      let mediaStream;
      let state = {
        handleDenied: false,
        camera: false,
        microphone: false,
        devices: [],
        getCameras: () => state.devices.filter(device => device.kind === 'videoinput'),
        getMicrophones: () => state.devices.filter(device => device.kind === 'audioinput'),
        getSpeakers: () => state.devices.filter(device => device.kind === 'audiooutput'),
      };

      try {
        const constraints = {audio: true, video: true};

        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

         const devices = await navigator.mediaDevices.enumerateDevices();

        state.devices = devices.filter(item => {
          return item.deviceId !== 'default' && item.deviceId !== 'communications';
        });
      } catch (error) {
        state.handleDenied = true;

        const cameraPermission = await navigator.permissions.query({name: 'camera'})
        const microphonePermission = await navigator.permissions.query({name: 'microphone'})

        state.camera = (cameraPermission.state === 'denied');
        state.microphone = (microphonePermission.state === 'denied');
      }

      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }

      return state;
  };

  /**
   * Request access to user media devices (camera and microphone).
   * Supports muting video or audio optionally.
   * Returns a processed MediaStream combining canvas stream and audio track.
   */
  Media.grab = async (devices, muteVideo = false, muteAudio = false) => {
    try {
      Media.devices = devices;

      let videoParams = (muteVideo)? false : {
        deviceId: {
          exact: devices.camera,
        },
        width: {
          min: Media.options.minVideoWidth,
          max: Media.options.maxVideoWidth
        },
        height: {
          min: Media.options.minVideoHeight,
          max: Media.options.maxVideoHeight
        }
      };

      let audioParams = {
        deviceId: {
          exact: devices.microphone
        }
      };

      const media = await navigator.mediaDevices.getUserMedia({
        video: videoParams,
        audio: audioParams
      });

      clearInterval(Media.interval);

      if (Media.parent.userSettings.camDisable) {
        media.addTrack(createEmptyVideoTrack({ width:640, height:480 }));
      }

      Media.video.srcObject = media;
      Media.video.muted = true;
      Media.video.play();

      const audioTrack = media.getAudioTracks()[0];

      Media.video.addEventListener('loadeddata', Media.setInterval);

      const processedMedia = Media.canvas.captureStream();
      processedMedia.addTrack(audioTrack);

      Media.userMedia = processedMedia;
      Media.parent.emit('onMediaStreamReady');

      if (muteAudio) {
        Media.muteMicrophone(true);
      }

      return processedMedia;
    } catch (error) {
      const errorMessage = mediaGrabErrors.find(e => e.name.includes(error.name));
      const message = errorMessage?.message || error.name;
      return message || error.name;
    }
  };

  /**
   * Start periodic media processing interval according to configured FPS.
   */
  Media.setInterval = () => {
    if (Media.parent.userSettings.camDisable) return;

    if (Media.interval) {
      clearInterval(Media.interval)
      Media.interval = null;
    }

    const fps = Media.parent?.configs?.mediapipe?.fps || DEFAULT_FPS;

    Media.process = false;
    Media.interval = setInterval(Media.processOnMedia, 1000 / fps);
  };

  /**
   * Main media processing loop to capture video frames, flip image,
   * apply body segmentation blur, and detect faces with callbacks.
   */
  Media.processOnMedia = async () => {
    if (Media.process) return;

    Media.process = true;

    try {
      await drawVideoOnCanvas(Media.video, Media.canvas);

      if (Media.parent.userSettings.camDisable) {
        Media.process = false;
        return;
      }

      await flipVideoImage(Media.canvas);

      if (Media.bodySegmenter.blur > 0) {
        await bodySegmentation.blur(Media.bodySegmenter, Media.canvas);
      }

      const faceDetectorCallbacks = Media.faceDetector.callbacks.filter(cb => cb.enable);

      if (faceDetectorCallbacks.length > 0) {
        await faceDetection.detect(Media.faceDetector, Media.canvas);

        if (Media.faceDetector.positions?.length > 0) {
          const faceBox = Media.faceDetector.positions[0].box;

          faceDetectorCallbacks.forEach(cb => {
            try {
              cb.callback(faceBox, Media.canvas, cb.name);
            } catch (err) {
              console.warn(`[Media.processOnMedia] Face detection callback error for '${cb.name}':`, err);
            }
          });
        }
      }
    } catch (error) {
      console.error('[Media.processOnMedia] Processing error:', error);
    } finally {
      Media.process = false;
    }
  };

  /**
   * Enable or disable background blur (body segmentation).
   * @param {boolean} status
   */
  Media.blurBackground = (status = true) => {
    Media.bodySegmenter.blur = status? BLUR_INTENSITY : 0;
  };

  /**
   * Register or update a face detection callback by name.
   * @param {string} name
   * @param {function} callback
   * @returns
   */
  Media.registerFaceDetectorCallback = (name, callback) => {
    let index = Media.faceDetector.callbacks.findIndex(cb => cb.name === name);

    if (index >= 0) {
      Media.faceDetector.callbacks[index]['callback'] = callback;
    } else {
      index = Media.faceDetector.callbacks.push({
        name: name,
        enable: false,
        callback: callback
      }) - 1;
    }

    return Media.faceDetector.callbacks[index];
  };

  /**
   * Stop and release user media tracks and clear intervals.
   */
  Media.release = async () => {
    if (!Media.video) return;

    const stopMediaTracks = (element) => {
      if (!element?.srcObject) return;

      const tracks = element.srcObject.getTracks();
      tracks.forEach(track => {
        try {
          track.stop();
        } catch (err) {
          console.warn('[Media.release] Failed to stop track:', err);
        }
      });
    }

    Media.video.pause();
    Media.video.removeEventListener('loadeddata', Media.setInterval);

    stopMediaTracks(Media.video);
    clearInterval(Media.interval);
    Media.video.load();

    Media.userMedia = null;

    return true;
  };

  /**
   * Reset all peer connections' media streams (video/audio).
   */
  Media.resetConnectionsStream = () => {
    const connections = Media.parent.People.getConnections();

    connections.forEach(connection => {
      Media.streamVideo(connection.peerJsId, connection.stream);
      Media.streamAudio(connection.peerJsId, connection.stream);
    });
  };


  /**
   * Set video element's media stream for a given peer or local user.
   * Optionally allow custom element references and event handling.
   */
  Media.streamVideo = (peerJsId, media, options = {}) => {
    const baseRef = peerJsId ? `${Media.options.remoteVideoRef}-${peerJsId}` : Media.options.localVideoRef;
    const reference = options.customReference || baseRef;
    const video = document.getElementById(reference);

    if (!video) return;

    video.muted = options.videoMute !== false;
    video.srcObject = media;

    video.addEventListener('loadedmetadata', () => video.play(), { once: true });

    if (options.eventListener !== false) {
      video.addEventListener('play', () => {
        if(!Media.events.play && Media.events.play.length > 0) {
          Media.events.play.forEach((item) => {
            if(!item.handler) return false;
            item.handler(video);
          });
        }
      }, { once: true });
    }
  };


  /**
   * Set audio element's media stream for a remote peer.
   */
  Media.streamAudio = (peerJsId, media) => {
    const reference = `${Media.options.remoteAudioRef}-${peerJsId}`;
    const audio = document.getElementById(reference);
    if (!audio) return;
    audio.srcObject = media;
  };

  /**
   * Register or update event handlers for media events (e.g. play).
   * @param {string} name Event name
   * @param {function} handler Event handler function
   * @param {string} section Event section (default 'play')
   */
  Media.setEvent = (name = 'none', handler = () => {}, section = 'play') => {
    if (!Media.events) Media.events = {};
    if (!Media.events[section]) Media.events[section] = [];

    const index = Media.events[section].findIndex(x => x.name === name);
    const item  = {
      name: name,
      handler: handler
    };

    if (index > -1) {
      Media.events[section][index] = item;
    } else {
      Media.events[section].push(item);
    }
  };

  /**
   * Mute or unmute user's camera
   * @param {boolean} status
   * If not provided, toggles the current camera disable state (mutes if currently unmute, unmute if currently muted).
   * @returns {void}
   */
  Media.muteCamera = (status = !Media.parent.userSettings.camDisable) => {
    Media.parent.userSettings.camDisable = status;
    Media.terminateConnectionsVideoAudioMedia('video');
  };


  /**
   * Mute user's microphone by disabling audio tracks on peer connections.
   * @param {boolean} status
   * If not provided, toggles the current microphone disable state (mutes if currently unmute, unmute if currently muted).
   * @returns {void}
   */
  Media.muteMicrophone = (status = !Media.parent.userSettings.micDisable) => {
    Media.parent.userSettings.micDisable = status;
    Media.terminateConnectionsVideoAudioMedia('audio');
  };


  /**
   * Update all peer connections to use a new media stream's video and audio tracks.
   * @param {MediaStream} media
   */
  Media.resetConnectionsVideoAudioMedia = (media) => {
    const connections = Media.parent.People.getConnections();

    connections.forEach(connection => {
      const senders = connection.mediaConnection.peerConnection.getSenders();
      const camIndex = senders.findIndex(x => x.track && x.track.kind === 'video');
      const micIndex = senders.findIndex(x => x.track && x.track.kind === 'audio');

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
        camMute: Media.parent.userSettings.camDisable,
        micMute: Media.parent.userSettings.micDisable
      });
    });
  };

  /**
   * Broadcast mute/unmute status to all peer connections via data channels.
   */
  Media.sendUserMediaMuteStatusByDataConnection = (videoStatus, audioStatus) => {
    const connections = Media.parent.People.getConnections();

    connections.forEach(connection => {
      connection.dataConnection.send({
        event: 'muteMedia',
        camMute: videoStatus,
        micMute: audioStatus
      });
    });
  };

  /**
   * Terminate or re-grab media tracks on peer connections based on type (video/audio).
   * Handles releasing streams, restarting camera if needed, and sending updated mute status.
   */
  Media.terminateConnectionsVideoAudioMedia = (type = 'video') => {
    if (type === 'video' && !Media.parent.userSettings.camDisable) {
      Media.release();
      Media.grab(
          Media.devices,
          Media.parent.userSettings.camDisable,
          Media.parent.userSettings.micDisable
      ).then(media => {
        Media.streamVideo(null, media);
        Media.resetConnectionsVideoAudioMedia(media);
      })
    } else if (type === 'video') {
      Media.video.srcObject.getVideoTracks().forEach(track => {
        track.stop();
      });
      clearInterval(Media.interval);
    } else {
      Media.video.srcObject.getAudioTracks().forEach(track => {
        track.enabled = !Media.parent.userSettings.micDisable;
      });
    }

    Media.sendUserMediaMuteStatusByDataConnection(
        Media.parent.userSettings.camDisable,
        Media.parent.userSettings.micDisable
    );
  };

  /**
   * Handle incoming mute status from a peer and update UI accordingly.
   * @param {Object} data - Contains peerJsId, camMute, micMute status
   */

  Media.setConnectionMediaStatus = (data) => {
    const connections = Media.parent.People.getConnections();
    const connection = connections.find(x => x.peerJsId === data.peerJsId);

    if (connection) {
      connection.camMute = data.camMute;
      connection.micMute = data.micMute;
      Media.streamVideo(data.peerJsId, connection.mediaConnection.remoteStream);
      Media.streamAudio(data.peerJsId, connection.mediaConnection.remoteStream);
      Media.parent.emit('onMediaStreamReset', {
        detail: {
          peerJsId: data.peerJsId
        }
      });

      if(connection.camMute) {
        connection.camCover = true;
      } else {
        setTimeout(() => {
          connection.camCover = false;
        }, 500)
      }
    }
  };

  Media.screenShare = {};
  Media.screenRecord = {};

  return Media;
};