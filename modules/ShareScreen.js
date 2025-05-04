

module.exports = () => {


    const ShareScreen = {}

    ShareScreen.initial = (parent) => {
        this.parent = parent;
        this.screenShare = document.getElementById(this.parent.options.screenShareRef);

        return ShareScreen;
    }


    ShareScreen.startShareScreen = async () => {
        return new Promise((resolve, reject) => {
            navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always'
                },
                audio: true
            }).then(async media => {
                this.parent.userSettings.share = true;
                this.parent.userSettings.shareMedia = media;

                this.parent.Media.streamVideo(null, media, {
                    customReference: 'screen-sharing-video',
                    videoMute: true,
                    eventListener: false,
                });

                const screenShare = document.getElementById(this.parent.options.screenShareRef);
                screenShare.style.display = 'block';

                await this.parent.peerJsObject.screenShareConnection(true);

                const connections = this.parent.People.getConnections();
                const peerObject = this.parent.peerJsObject.sharePeer;

                connections.forEach((connection) => {
                    peerObject.call(connection.peerJsId, media, {
                        metadata: {
                            type: 'screen-sharing',
                            peerJsId: this.parent.peerJsId,
                            sharePeerJsId: this.parent.peerJsObject.sharePeerJsId
                        }
                    });
                });

                ShareScreen.eventTrigger(true);

                resolve(media);
            }).catch((error) => {
                reject(error);
            });
        });
    }

    ShareScreen.stopShareScreen = () => {
        return new Promise(async (resolve, reject) => {
            const stream = this.parent.userSettings.shareMedia;
            const connections = this.parent.People.getConnections();

            connections.forEach(connection => {
                connection.dataConnection.send({
                    event: 'screenShare',
                    status: false,
                    peerJsId: this.parent.peerJsObject.peerJsId,
                });
            });

            ShareScreen.eventTrigger(false);

            await this.parent.peerJsObject.screenShareConnection(false);

            if (stream) {
                const tracks = stream?.getTracks();

                tracks.forEach((track) => {
                    track.stop();
                });
            }

            const screenShare = document.getElementById(this.parent.options.screenShareRef);
            if (screenShare) screenShare.style.display = 'none';

            this.parent.userSettings.share = false;
            this.parent.userSettings.shareMedia = null;
        })
    }

    ShareScreen.callToNewJoinedUser = (peerjsId) => {
        const peerObject = this.parent.peerJsObject.sharePeer;

        peerObject.call(peerjsId, this.parent.userSettings.shareMedia, {
            metadata: {
                type: 'screen-sharing',
                peerJsId: this.parent.peerJsId,
                sharePeerJsId: this.parent.peerJsObject.sharePeerJsId
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
        const screenShare = document.getElementById(this.parent.options.screenShareRef);
        screenShare.style.display = 'none';
        this.parent.People.setData(data.peerJsId, 'share', false);
        ShareScreen.eventTrigger(false);
    }

    return ShareScreen;
}
