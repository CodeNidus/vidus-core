
/**
 * RecordScreen module for capturing and processing screen recordings with audio mixing.
 */

module.exports = () => {

    const RecordScreen = {
        parent: null,
        ffmpeg: null,
        recorder: null,
        mediaStream: null,
        recordedChunks: [],
        isRecording: false,
        isFFmpegLoaded: false,
        _audioContext: null,
        _destination: null,
        _screenAudioSource: null,
        _micAudioSource: null,
        _connectionsAudioSource: [],
    };

    /**
     * Initialize the RecordScreen module
     * @param {Object} parent - Parent module instance
     * @returns {Object} RecordScreen instance
     */
    RecordScreen.initial = (parent) => {
        RecordScreen.parent = parent;
        RecordScreen.recorder = null;
        RecordScreen.initializeFFmpeg();
        RecordScreen.listenToEvents();

        parent.on('peerJsData', 'recordScreen', RecordScreen.setStatus);

        return RecordScreen;
    };

    /**
     * Initialize FFmpeg instance
     */
    RecordScreen.initializeFFmpeg = async () => {
        if (!RecordScreen.ffmpeg) {
            const ffmpegModule = await import('@ffmpeg/ffmpeg');
            const { FFmpeg } = ffmpegModule;
            RecordScreen.ffmpeg = new FFmpeg({ log: true });
        }

        if (!RecordScreen.isFFmpegLoaded) {
            await RecordScreen.ffmpeg.load();
            RecordScreen.isFFmpegLoaded = true;
        }
    };

    /**
     * Set up event listeners
     */
    RecordScreen.listenToEvents = () => {
        document.addEventListener('onMediaStreamReset', async function (event) {
            await RecordScreen.mixMicScreenAudioStreams();
        });

        document.addEventListener('onMediaStreamReady', async function (event) {
            await RecordScreen.mixMicScreenAudioStreams();
        });
    };

    /**
     * Start screen recording
     * @async
     * @returns {Promise<MediaStream>} Media stream being recorded
     */
    RecordScreen.startRecord = async () => {
        if (RecordScreen.isRecording) return;

        try {
            const media = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always',
                    resizeMode: 'crop-and-scale',
                    displaySurface: 'browser'
                },
                audio: true,
                preferCurrentTab: true
            });

            RecordScreen.isRecording = true;
            RecordScreen.parent.userSettings.record = true;
            RecordScreen.mediaStream = media;


            // Mixed screen audio with user mic audio
            const audioContext = new AudioContext();
            const destination = audioContext.createMediaStreamDestination();
            const screenAudio = audioContext.createMediaStreamSource(media);

            RecordScreen._audioContext = audioContext;
            RecordScreen._destination = destination;
            RecordScreen._screenAudioSource = screenAudio;

            screenAudio.connect(RecordScreen._destination);

            await RecordScreen.mixMicScreenAudioStreams();

            RecordScreen.mediaStream.getVideoTracks()[0].onended = () => {
                RecordScreen.stopRecord();
            };

            const options = {
                mimeType: 'video/webm;codecs=h264,opus',
                videoBitsPerSecond: 2500000 // 2.5Mbps
            };


            RecordScreen.recordedChunks = [];
            RecordScreen.recorder = new MediaRecorder(RecordScreen.mediaStream, options);

            RecordScreen.recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    RecordScreen.recordedChunks.push(event.data);
                }
            };

            RecordScreen.recorder.onstop = async () => {

                const processedData = await RecordScreen.processRecordedVideo();

                RecordScreen.saveData(processedData, `recording_${new Date().toISOString()}.mp4`);
                RecordScreen.eventTrigger(false, true);
                RecordScreen.cleanup();
            };

            RecordScreen.recorder.start(1000);
            RecordScreen.eventTrigger(true, true);

            return RecordScreen.mediaStream;
        } catch (error) {
            console.error('Recording failed:', error);
            RecordScreen.eventTrigger(false, true);
        }
    };

    /**
     * Stop screen recording
     */
    RecordScreen.stopRecord = async () => {
        if (!RecordScreen.isRecording) return;

        RecordScreen.isRecording = false;

        if (RecordScreen.mediaStream) {
            RecordScreen.mediaStream.getTracks().forEach(track => track.stop());
        }
    };

    /**
     * Mix microphone and screen audio streams with connection audio
     */
    RecordScreen.mixMicScreenAudioStreams = async () => {
        if (!RecordScreen.isRecording) return;

        if (RecordScreen._micAudioSource) {
            RecordScreen._micAudioSource.disconnect();
        }

        const micAudio = RecordScreen._audioContext.createMediaStreamSource(RecordScreen.parent.Media.userMedia);
        micAudio.connect(RecordScreen._destination);

        RecordScreen._micAudioSource = micAudio;

        // Mix with connected users audio streams
        RecordScreen._connectionsAudioSource.forEach(item => {
            item.disconnect();
        });

        RecordScreen._connectionsAudioSource = [];

        const connections = RecordScreen.parent.People.getConnections();

        connections.forEach(function (item, index) {
            const connectionAudio = RecordScreen._audioContext.createMediaStreamSource(item.stream);
            RecordScreen._connectionsAudioSource.push(connectionAudio);
            connectionAudio.connect(RecordScreen._destination);
        });

        // Update the mixed mediaStream audio tracks:
        RecordScreen.mediaStream = new MediaStream([
            ...RecordScreen.mediaStream.getVideoTracks(),
            ...RecordScreen._destination.stream.getAudioTracks()
        ]);
    };

    /**
     * Process recorded video with FFmpeg
     * @returns {Promise<Blob>} Processed video blob
     */
    RecordScreen.processRecordedVideo = async () => {
        const recordedBlob = new Blob(RecordScreen.recordedChunks, { type: 'video/webm' });

        if (!RecordScreen.ffmpeg || !RecordScreen.isFFmpegLoaded) {
            console.error('FFmpeg not initialized');
            return recordedBlob;
        }

        const arrayBuffer = await recordedBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        RecordScreen.ffmpeg.writeFile('input.webm', uint8Array);

        await RecordScreen.ffmpeg.exec([
            '-i', 'input.webm',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-movflags', 'faststart',
            'output.mp4'
        ]);

        const data = await RecordScreen.ffmpeg.readFile('output.mp4');

        return new Blob([data.buffer], { type: 'video/mp4' });
    };

    /**
     * Save recorded data as a file download
     * @function
     * @param {Blob} blobData - Video blob data to save
     * @param {string} fileName - Name for the downloaded file
     */
    RecordScreen.saveData = (function () {
        const link = document.createElement("a");

        return function (blobData, fileName) {
            const url = window.URL.createObjectURL(blobData);
            link.href = url;
            link.download = fileName;
            link.click();
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 100);
        };
    }());

    /**
     * Clean up resources and reset state
     */
    RecordScreen.cleanup = () => {
        RecordScreen.recordedChunks = [];
        RecordScreen.mediaStream = null;
        RecordScreen.recorder = null;
        RecordScreen._audioContext = null;
        RecordScreen._destination = null;
        RecordScreen._screenAudioSource = null;
        RecordScreen._micAudioSource = null;
        RecordScreen.parent.userSettings.record = false;

        if (!RecordScreen.ffmpeg || !RecordScreen.isFFmpegLoaded) {
            RecordScreen.ffmpeg.deleteFile('input.webm');
            RecordScreen.ffmpeg.deleteFile('output.mp4');
        }
    };


    /**
     * Handle new user joining (placeholder implementation)
     * @param {string} peerjsId - PeerJS connection ID
     * TODO: complete this section. Show meet recording status
     */
    RecordScreen.newJoinedUser = (peerjsId) => {
        //
    };

    /**
     * Check if screen recording is active
     * @returns {boolean} True if recording is active
     */
    RecordScreen.isRecordingScreen = () => {
        const connections = RecordScreen.parent.People.getConnections()
        const index = connections.findIndex(x => x.isCreator === true && x.record === true)
        return index > -1
    };

    /**
     * Set recording status for a connection
     * @param {Object} data - Status data object
     * @param {string} data.peerJsId - PeerJS connection ID
     * @param {boolean} data.record - Recording status
     */
    RecordScreen.setStatus = (data) => {
        const connections = RecordScreen.parent.People.getConnections();
        let connection = connections.find(x => x.peerJsId === data.peerJsId);

        if (connection) {
            connection.record = data.record;

            RecordScreen.eventTrigger(data.record)
        }
    };

    /**
     * Trigger recording status events
     * @param {boolean} status - Recording status
     * @param {boolean} sendToConnections - Whether to send to connections
     */
    RecordScreen.eventTrigger = (status = true, sendToConnections = false) => {
        const connections = RecordScreen.parent.People.getConnections()

        RecordScreen.parent.emit('onScreenRecordStateChange', {
            detail: {
                status: status
            }
        });

        if (sendToConnections) {
            connections.forEach(connection => {
                connection.dataConnection.send({
                    event: 'recordScreen',
                    record: status,
                });
            });
        }
    };

    return RecordScreen;
};
