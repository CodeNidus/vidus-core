import socketio from 'socket.io-client';

class SocketIO {
  /**
   * Creates a new SocketIO instance
   * @constructor
   */
  constructor() {
    this.socket = null;
    this.initialized = false;

    /**
     * Reconnection configuration
     * @type {Object}
     * @private
     */
    this.reconnectionConfig = {
      enabled: true,
      attempts: 5,
      delay: 1000,
      maxDelay: 5000,
      backoffFactor: 1.5,
      currentAttempt: 0,
      timeout: null
    };
  }

  /**
   * Initialize the Socket.IO connection with configuration options
   */
  async initialize(options) {
    try {
      this.socket = socketio(options.webrtc_url, {
        withCredentials: true,
        autoConnect: false,
        transports: ['websocket'],
        reconnection: false,
      });

      this.socket.on('connect', () => {
        this._resetReconnectionAttempts();
      });

      this.socket.on('disconnect', (reason) => {
        if (reason !== 'io client disconnect' && this.reconnectionConfig.enabled) {
          this._attemptReconnection();
        }
      });

      this.socket.on('connect_error', (error) => {
        if (this.reconnectionConfig.enabled) {
          this._attemptReconnection();
        }
      });

      this.initialized = true;

      return true;
    } catch (error) {
      throw new Error(`Socket initialization failed: ${error.message}`);
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   * @private
   */
  _attemptReconnection() {
    if (this.isConnected() || !this.reconnectionConfig.enabled) return;

    if (this.reconnectionConfig.timeout) {
      clearTimeout(this.reconnectionConfig.timeout);
      this.reconnectionConfig.timeout = null;
    }

    if (this.reconnectionConfig.currentAttempt >= this.reconnectionConfig.attempts) {
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectionConfig.delay * Math.pow(
        this.reconnectionConfig.backoffFactor,
        this.reconnectionConfig.currentAttempt
      ),
      this.reconnectionConfig.maxDelay
    );

    this.reconnectionConfig.currentAttempt++;

    // Schedule reconnection attempt
    this.reconnectionConfig.timeout = setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.open();
      }
    }, delay);
  }

  /**
   * Reset reconnection attempts counter
   * @private
   */
  _resetReconnectionAttempts() {
    this.reconnectionConfig.enabled = true;
    this.reconnectionConfig.currentAttempt = 0;
    if (this.reconnectionConfig.timeout) {
      clearTimeout(this.reconnectionConfig.timeout);
      this.reconnectionConfig.timeout = null;
    }
  }

  /**
   * Establish or close the connection to the server
   * @param {boolean} [status=true] - Whether to connect or disconnect
   * @param {string|null} [token=null] - Authentication token for the connection
   * @returns {Promise<boolean>} Connection status
   */
  setConnection(status = true, token = null) {
    if (!this.initialized) {
      throw new Error('Socket not initialized. Call initial() first.');
    }

    if (!status) {
      this.disconnect();
      return Promise.resolve(false);
    }

    this._resetReconnectionAttempts();

    return new Promise((resolve, reject) => {
      this.socket.io.opts.query = {
        "user-token": token
      };

      const connectHandler = () => {
        cleanup();

        this.socket.on('connection:ready', () => {
          resolve(true);
        });
      };

      const errorHandler = (error) => {
        cleanup();
        reject(new Error(`Connection failed: ${error.message}`));
      };

      // Cleanup function to remove event listeners
      const cleanup = () => {
        this.socket.off('connect', connectHandler);
        this.socket.off('connect_error', errorHandler);
      };

      this.socket.once('connect', connectHandler);
      this.socket.once('connect_error', errorHandler);

      // Initiate connection
      this.socket.open();
    });
  }

  /**
   * Check if the socket is connected and initialized
   * @returns {boolean} Connection status
   */
  isConnected() {
    return (this.socket && this.initialized && this.socket.connected);
  }

  /**
   * Emit an event to the server
   * @param {string} eventName - The event name to emit
   * @param {...any} args - Arguments to send with the event
   * @returns {void}
   */
  emit(eventName, ...args) {
    if (!this.initialized) {
      throw new Error('Socket not initialized. Call initial() first.');
    }

    const lastArg = args[args.length - 1];

    if (typeof lastArg === 'function') {
      const callback = args.pop();
      this.socket.emit(eventName, ...args, callback);
    } else {
      this.socket.emit(eventName, ...args);
    }
  }

  /**
   * Listen for events from the server
   * @param {string} eventName - The event name to listen for
   * @param {Function} handler - The callback function to execute when the event is received
   * @returns {void}
   */
  listen(eventName, handler) {
    if (!this.initialized) {
      throw new Error('Socket not initialized. Call initial() first.');
    }

    this.socket.on(eventName, handler);
  }

  /**
   * Get the socket ID if connected
   * @returns {string|null} Socket ID or null if not connected
   */
  getId() {
    return this.isConnected() ? this.socket.id : null;
  }

  /**
   * Disconnect the socket and clean up resources
   * @returns {void}
   */
  disconnect() {
    this.reconnectionConfig.enabled = false;

    if (this.reconnectionConfig.timeout) {
      clearTimeout(this.reconnectionConfig.timeout);
      this.reconnectionConfig.timeout = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.initialized = false;
  }
}

export default SocketIO;

