module.exports = () => {

  const People = {
    parent: null,
    connections: null,
    waitingList: null,
    options: null,
  };

  /**
   * Initializes the People manager with required references and data.
   * @param {object} parent - The parent object containing shared resources (Room, Media, etc.)
   * @param {Array} [connections=[]] - Initial list of peer connections (optional)
   * @param {Array} [waitingList=[]] - Initial list of users in the waiting room (optional)
   * @param {object} [options={}] - Configuration options (optional)
   */
  People.setup = (parent, connections = [], waitingList = [], options = {}) => {
    People.parent = parent;
    People.connections = connections;
    People.waitingList = waitingList;
    People.options = options;
  };

  /**
   * Adds a new user connection to the People module
   * Establishes media and data connections with a peer and sets up event handlers
   *
   * @param {Object} mediaConnection - The PeerJS media connection object for audio/video streaming
   * @param {Object} dataConnection - The PeerJS data connection object for messaging
   * @param {Object|boolean} [data=false] - Optional user data object containing name and roomCreator status
   * @returns {Promise<boolean>} - Resolves to true when connection is successfully added
   * @throws {Error} - If the connection process fails
   */
  People.add = async (mediaConnection, dataConnection, data = false) => {
    try {
      const user = People.connections.find(x => x.id === mediaConnection.peer);

      if (user) {
        return true;
      }

      const userItem = People.parent.Room.information.users.find(x => x.peerJsId === mediaConnection.peer);
      const userName = userItem?.name || '';
      const userType = userItem?.roomCreator || false;

      const count = People.connections.push({
        id: mediaConnection.peer,
        peerJsId: mediaConnection.peer,
        mediaConnection: mediaConnection,
        dataConnection: dataConnection,
        active: false,
        camMute: true,
        micMute: true,
        share: false,
        record: false,
        name: userName,
        isCreator: userType,
      });

      const connection = People.connections[count - 1];

      if (data) {
        connection.name = data.name;
        connection.isCreator = data.roomCreator;
      }

      dataConnection.on('open', () => {
        dataConnection.send({
          event: 'muteMedia',
          camMute: People.parent.userSettings.camDisable,
          micMute: People.parent.userSettings.micDisable
        });
      });

      mediaConnection.on('stream', peerVideoStream => {
        connection.stream = peerVideoStream;
        connection.active = true;

        People.parent.Media.streamVideo(mediaConnection.peer, peerVideoStream);
        People.parent.Media.streamAudio(mediaConnection.peer, peerVideoStream);
      });

      return true;
    } catch (error) {
      if (People.parent.configs.debug) {
        console.error('Error add connection:', error);
      }

      throw error;
    }
  };

  /**
   * Removes a peer connection by peerJsId and cleans up resources.
   * @param {string} peerJsId - connection unique peer id
   */
  People.remove = (peerJsId) => {
    try {
      const index = People.connections.findIndex(x => x.peerJsId === peerJsId);

      if (index > -1) {
        const connection = People.connections[index];

        connection.mediaConnection.close();
        connection.dataConnection.close();
        People.connections.splice(index, 1);

        // reset video and audio stream
        setTimeout(People.parent.Media.resetConnectionsStream, 10);
      }
    } catch (error) {
      if (People.parent.configs.debug) {
        console.error('Error removing connection:', error);
      }

      throw error;
    }
  };

  /**
   * Forcefully closes all active connections and resets state.
   */
  People.closeAll = () => {
    try {
      People.parent.Media.screenShare.stopShareScreen();

      People.connections.forEach((connection) => {
        connection.mediaConnection.close();
        connection.dataConnection.close();
      });

      People.connections = [];
      People.waitingList = [];
    } catch (error) {
      console.error('Error close connections:', error);
    }
  };

  /**
   * Returns the current list of connections.
   * @returns {Array} List of connection objects
   */
  People.getConnections = () => {
    return People.connections;
  };

  /**
   * Adds a user to the waiting list (e.g., for moderated rooms).
   * @param {object} data - User data (must include `peerJsId`)
   */
  People.addToWaitingList = (data) => {
    if (People.waitingList.some(x => x.peerJsId === data.peerJsId)) return;
    People.waitingList.push(data);
  };

  /**
   * Removes a user from the waiting list by array index.
   * @param {number} index - Position in the waitingList array
   */
  People.removeFromWaitingList = (index) => {
    if(index > -1) {
      People.waitingList.splice(index, 1);
    }
  };

  /**
   * Removes a user from the waiting list by peerJsId.
   * @param {string} peerJsId - The peer's unique ID
   */
  People.removeFromWaitingListByPeerJsId = (peerJsId) => {
    const index = People.waitingList.findIndex(x => x.peerJsId === peerJsId);

    People.removeFromWaitingList(index);
  };

  /**
   * Updates a property of a connection identified by peerJsId.
   * @param {string} peerJsId - Target connection ID
   * @param {string} key - Property to update (e.g., 'camMute')
   * @param {*} value - New value
   * @param {string} peerJsIdKey - stored peerjs id key, use to search by alternate property
   */
  People.setData = (peerJsId, key, value, peerJsIdKey = 'peerJsId') => {
    const index =  People.connections.findIndex(x => x[peerJsIdKey] === peerJsId);

    if (index > -1) {
      People.connections[index][key] = value;
    }
  };

  /**
   * Finds the first connection matching a key-value pair.
   * @param {string} key - Property name (e.g., 'isCreator')
   * @param {*} value - Value to match
   * @returns {object|null} Connection object or null if not found
   */
  People.findOne = (key, value) => {
    return People.connections.find(x => x[key] === value) || null;
  };

  /**
   * Finds all connections matching a key-value pair.
   * @param {string} key - Property name
   * @param {*} value - Value to match
   * @returns {Array} Filtered list of connections (empty if none match)
   */
  People.find = (key, value) => {
    return People.connections.filter(item => item[key] === value);
  };

  return People;
};
