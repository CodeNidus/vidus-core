

module.exports = () => {
    const ShareScreen = {
        parent: null,
        sharePeer: null,
        sharePeerJsId: null,
        initializeShareScreen: false,
        connectionDelay: 10000,
    };

    /**
     * Initialize Screen Share module
     * @param parent webrtc object
     * @returns screen share module
     */
    ShareScreen.initial = (parent) => {
        ShareScreen.parent = parent;
        ShareScreen.setupListener();

        parent.on('peerJsData', 'screenShare', ShareScreen.closeScreenShare);

        return ShareScreen;
    };

    /**
     * Starts screen sharing by capturing display media and establishing connections
     * @returns {Promise<MediaStream>} Promise that resolves to the screen sharing media stream
     * @throws {Error} If screen sharing fails to start
     */
    ShareScreen.startShareScreen = async () => {
        try {
            const media = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' },
                audio: true
            });

            media.getVideoTracks()[0].addEventListener('ended', () => {
                ShareScreen.stopShareScreen();
            });

            ShareScreen.parent.userSettings.share = true;
            ShareScreen.parent.userSettings.shareMedia = media;

            ShareScreen.eventTrigger(true);

            ShareScreen.parent.Media.streamVideo(null, media, {
                customReference: 'screen-sharing-video',
                videoMute: true,
                eventListener: false,
            });

            await ShareScreen.screenShareConnection(true);

            const connections = ShareScreen.parent.People.getConnections();
            const peerObject = ShareScreen.sharePeer;

            connections.forEach((connection) => {
                peerObject.call(connection.peerJsId, media, {
                    metadata: {
                        type: 'screen-sharing',
                        peerJsId: ShareScreen.parent.peerJsId,
                        sharePeerJsId: ShareScreen.sharePeerJsId
                    }
                });
            });

            return media;
        } catch (error) {
            console.error('Error starting screen share:', error);
        }
    };

    /**
     * Stops screen sharing and cleans up resources
     * @returns {Promise<void>} Promise that resolves when screen sharing is stopped
     * @throws {Error} If screen sharing fails to stop
     */
    ShareScreen.stopShareScreen = async () => {
        if (ShareScreen.parent.userSettings.share === false) {
            ShareScreen.eventTrigger(false);
            return;
        }

        try {
            const stream = ShareScreen.parent.userSettings.shareMedia;
            const connections = ShareScreen.parent.People.getConnections();

            connections.forEach(connection => {
                connection.dataConnection.send({
                    event: 'screenShare',
                    status: false,
                    peerJsId: ShareScreen.parent.peerJsId,
                });
            });

            ShareScreen.eventTrigger(false);

            await ShareScreen.screenShareConnection(false);

            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            ShareScreen.parent.userSettings.share = false;
            ShareScreen.parent.userSettings.shareMedia = null;
        } catch (error) {
            console.error('Error stop screen share:', error);
            throw error;
        }
    };

    /**
     * Establishes or terminates a screen sharing connection
     * @param {boolean} status - Whether to enable (true) or disable (false) screen sharing
     * @returns {Promise<VideoPeer>} Promise that resolves to the VideoPeer instance
     */
    ShareScreen.screenShareConnection = (status = false) => {
        return new Promise((resolve, reject) => {
            if (status) {
                ShareScreen.initializeScreenSharePeer(resolve, reject);
            } else {
                ShareScreen.terminateScreenSharePeer(resolve);
            }
        });
    };

    /**
     * Initializes a screen sharing peer connection
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     * @private
     */
    ShareScreen.initializeScreenSharePeer = (resolve, reject) => {
        try {
            if (ShareScreen.sharePeer) {
                ShareScreen.sharePeer.destroy();
            }

            ShareScreen.sharePeer = ShareScreen.parent.peerJs.createPeerJsInstance();

            ShareScreen.sharePeer.on('open', (id) => {
                ShareScreen.sharePeerJsId = id;

                // Listen for welcome message to confirm connection
                ShareScreen.sharePeer.socket.on('message', (data) => {
                    if (data.type === 'welcome' && !ShareScreen.initializeShareScreen) {
                        ShareScreen.initializeShareScreen = true;
                        resolve(true);
                    }
                });
            });

            ShareScreen.sharePeer.on('error', (error) => {
                reject(new Error(`Screen share error: ${error.message}`));
            });

            setTimeout(() => {
                if (!ShareScreen.initializeShareScreen) {
                    reject(new Error('Peer connection timeout.'));
                }
            }, ShareScreen.connectionDelay);
        } catch (error) {
            reject(new Error(`Failed to initialize screen share: ${error.message}`));
        }
    };

    /**
     * Terminates the screen sharing connection
     * @param {Function} resolve - Promise resolve function
     * @private
     */
    ShareScreen.terminateScreenSharePeer = (resolve) => {
        if (ShareScreen.sharePeer) {
            ShareScreen.sharePeer.destroy();
            ShareScreen.sharePeer = null;
        }

        ShareScreen.sharePeerJsId = null;
        ShareScreen.initializeShareScreen = false;
        resolve(true);
    };

    /**
     * Sets up peer call listeners for incoming screen sharing connections
     * @private
     */
    ShareScreen.setupPeerCall = () => {
        ShareScreen.parent.peerJs.listen('call', async (mediaConnection) => {
            const type = mediaConnection.metadata?.type;

            if (type !== 'screen-sharing') return;

            ShareScreen.parent.People.setData(mediaConnection.peer, 'shareMediaConnection', mediaConnection, {
                customKey: 'sharePeerJsId'
            });

            mediaConnection.on('stream', peerVideoStream => {
                ShareScreen.parent.Media.streamVideo(null, peerVideoStream, {
                    customReference: 'screen-sharing-video',
                    videoMute: false,
                    eventListener: false,
                });

                ShareScreen.parent.Media.screenShare.eventTrigger(true);
            });

            ShareScreen.parent.People.setData(mediaConnection.metadata?.peerJsId, 'share', true);
            ShareScreen.parent.People.setData(mediaConnection.metadata?.peerJsId, 'sharePeerJsId', mediaConnection.metadata?.sharePeerJsId);

            mediaConnection.answer();
        });
    };

    /**
     * Sets up event listeners for screen sharing module
     * @private
     */
    ShareScreen.setupListener = () => {
        document.addEventListener('onPeerJsReady', ShareScreen.setupPeerCall);
        document.addEventListener('onUserConnected', ShareScreen.callToNewJoinedUser);
        window.addEventListener('beforeunload', ShareScreen.eventsListenersRemove);
    };

    /**
     * Removes all event listeners when the page is unloading
     * @private
     */
    ShareScreen.eventsListenersRemove = () => {
        document.removeEventListener('onPeerJsReady', ShareScreen.setupPeerCall);
        document.removeEventListener('onUserConnected', ShareScreen.callToNewJoinedUser);
    };

    /**
     * Initiates a screen sharing call to a newly joined user
     * @param {CustomEvent} event - data object included PeerJS ID of the newly joined user
     * @private
     */
    ShareScreen.callToNewJoinedUser = (event) => {
        if (!ShareScreen.parent.userSettings.share) return;

        const peerJsId = event.detail?.peerJsId;
        const peerObject = ShareScreen.sharePeer;

        peerObject.call(peerJsId, ShareScreen.parent.userSettings.shareMedia, {
            metadata: {
                type: 'screen-sharing',
                peerJsId: ShareScreen.parent.peerJsId,
                sharePeerJsId: ShareScreen.sharePeerJsId
            }
        });
    };

    /**
     * Triggers a custom event for screen sharing status changes
     * @param {boolean} status - The screen sharing status (true for started, false for stopped)
     * @private
     */
    ShareScreen.eventTrigger = (status = true) => {
        ShareScreen.parent.emit('onScreenShareDisplay', {
            detail: {
                status: status
            }
        });
    };

    /**
     * Closes screen sharing for a specific peer and triggers status update
     * @param {Object} data - Data object containing peer information
     * @param {string} data.peerJsId - The PeerJS ID of the peer to close screen sharing for
     */
    ShareScreen.closeScreenShare = (data) => {
        ShareScreen.parent.People.setData(data.peerJsId, 'share', false);
        ShareScreen.eventTrigger(false);
    };

    /**
     * Gets the screen sharing peer connection ID
     * @returns {string|null} The screen share peer ID or null if not connected
     */
    ShareScreen.getShareId = () => {
        return ShareScreen.sharePeerJsId;
    };

    return ShareScreen;
};
