

module.exports = () => {
    const ShareScreen = {
        parent: null,
    }

    ShareScreen.initial = (parent) => {
        ShareScreen.parent = parent;

        return ShareScreen;
    }

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

            await ShareScreen.parent.peerJsObject.screenShareConnection(true);

            const connections = ShareScreen.parent.People.getConnections();
            const peerObject = ShareScreen.parent.peerJsObject.sharePeer;

            connections.forEach((connection) => {
                peerObject.call(connection.peerJsId, media, {
                    metadata: {
                        type: 'screen-sharing',
                        peerJsId: ShareScreen.parent.peerJsId,
                        sharePeerJsId: ShareScreen.parent.peerJsObject.sharePeerJsId
                    }
                });
            });

            return media;
        } catch (error) {
            console.error('Error starting screen share:', error);
            throw error;
        }
    };

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
                    peerJsId: ShareScreen.parent.peerJsObject.peerJsId,
                });
            });

            ShareScreen.eventTrigger(false);

            await ShareScreen.parent.peerJsObject.screenShareConnection(false);

            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            ShareScreen.parent.userSettings.share = false;
            ShareScreen.parent.userSettings.shareMedia = null;
        } catch (error) {
            console.error('Error stop screen share:', error);
            throw error;
        }
    }

    ShareScreen.callToNewJoinedUser = (peerjsId) => {
        const peerObject = ShareScreen.parent.peerJsObject.sharePeer;

        peerObject.call(peerjsId, ShareScreen.parent.userSettings.shareMedia, {
            metadata: {
                type: 'screen-sharing',
                peerJsId: ShareScreen.parent.peerJsId,
                sharePeerJsId: ShareScreen.parent.peerJsObject.sharePeerJsId
            }
        });
    }

    ShareScreen.eventTrigger = (status = true) => {
        const event = new CustomEvent('onScreenShareModule', {
            detail: {
                status: status
            }
        });

        window.dispatchEvent(event);
    }

    ShareScreen.closeScreenShare = (data) => {
        ShareScreen.parent.People.setData(data.peerJsId, 'share', false);
        ShareScreen.eventTrigger(false);
    }

    return ShareScreen;
}
