module.exports = () => {

  const People = {
    parent: null,
    connections: null,
    waitingList: null,
    options: null,
  }

  People.setup = (parent, connections, waitingList, options) => {
    this.parent = parent;
    this.connections = connections;
    this.waitingList = waitingList;
    this.options = options;
  }

  /**
   * Add peer js user connection
   */
  People.add = async (mediaConnection, dataConnection, data = false) => {
    let index = this.connections.findIndex(x => x.id === mediaConnection.peer);

    if (index === -1) {
      let userIndex = this.parent.Room.information.users.findIndex(x => x.peerJsId === mediaConnection.peer);

      let count = this.connections.push({
        id: mediaConnection.peer,
        peerJsId: mediaConnection.peer,
        mediaConnection: mediaConnection,
        dataConnection: dataConnection,
        active: false,
        camMute: true,
        micMute: true,
        share: false,
        name: ((userIndex !== -1)? this.parent.Room.information.users[userIndex].name : ''),
        isCreator: ((userIndex !== -1)? this.parent.Room.information.users[userIndex].roomCreator : false),
      });

      if (data) {
        this.connections[(count - 1)].name = data.name;
        this.connections[(count - 1)].isCreator = data.roomCreator;
      }

      dataConnection.on('open', () => {
        dataConnection.send({
          event: 'muteMedia',
          camMute: this.parent.userSettings.camDisable,
          micMute: this.parent.userSettings.micDisable
        });
      });

      mediaConnection.on('stream', peerVideoStream => {
        this.parent.Media.streamVideo(mediaConnection.peer, peerVideoStream);
        this.parent.Media.streamAudio(mediaConnection.peer, peerVideoStream);
        this.connections[(count - 1)].stream = peerVideoStream;
        this.connections[(count - 1)].active = true;
      });

      return (count - 1);
    }

    return index;
  }

  People.remove = (data) => {
    let index = this.connections.findIndex(x => x.peerJsId === data.peerJsId);

    if (index > -1) {
      this.connections[index].mediaConnection.close();
      this.connections[index].dataConnection.close();
      this.connections.splice(index, 1);

      // reset video and audio stream
      setTimeout(this.parent.Media.resetConnectionsStream, 10);
    }
  }

  People.closeAll = () => {
    this.parent.Media.screenShare.stopShareScreen();

    this.connections.forEach((connection) => {
      connection.mediaConnection.close();
      connection.dataConnection.close();
    });

    this.connections = [];
  }

  People.getConnections = () => {
    return this.connections;
  }

  People.addToWaitingList = (data) => {
    this.waitingList.push(data);
  }

  People.removeFromWaitingList = (index) => {
    if(index > -1) {
      this.waitingList.splice(index, 1);
    }
  }

  People.removeFromWaitingListByPeerJsId = (peerJsId) => {
    const index = this.waitingList.findIndex(x => x.peerJsId === peerJsId);

    if(index > -1) {
      this.waitingList.splice(index, 1);
    }
  }

  // helper methods
  People.setData = (peerJsId, key, value, options = {}) => {
    let index = (options?.customKey)?
        this.connections.findIndex(x => x[options.customKey] === peerJsId) :
        this.connections.findIndex(x => x.peerJsId === peerJsId);

    if (index > -1) {
      this.connections[index][key] = value;
    }
  }

  People.findOne = (key, value) => {
    let index = this.connections.findIndex(x => x[key] === value);

    return (index > -1)? this.connections[index] : null;
  }

  People.find = (key, value) => {
    let data = [];

    this.connections.forEach(item => {
      if(item[key] === value) {
        data.push(item);
      }
    })

    return data;
  }

  return People;
}
