module.exports = () => {

  const action = {
    x: 0,
    y: 0,
    counter: 0,
    parent: null,
    wasRunning: false,
    text: null,
    lineCount: 4,
    lineHeight: 0,
    fontRatio: 0.05,
    fontName: 'Roboto',
    fontSize: 16,
    fontColor: "rgba(15, 23, 42, 1)",
    textHeight: 0,
    startHeight: 60,
    intervalTime: 15,
    canvas: null,
    debugBar: null,
    context: null,
    canvasText: null,
    canvasTextCard: null,
  };

  action.initialize = () => {
    return action;
  };

  /**
   * Set up the canvas and prepare for animation
   * @param {string} text - The text to display
   * @returns {Promise<boolean>} True if setup was successful
   * @throws {Error} If setup fails
   */
  action.setup = async (text) => {
    try {
      action.canvas = document.getElementById('canvas-text-action-scroll-section');
      action.debugBar = document.getElementById('canvas-text-action-debug-bar');
      action.canvasText = document.getElementById('canvas-text');
      action.canvasTextCard = document.getElementById("canvas-text-action-card");

      if (!action.canvas || !action.canvasTextCard) {
        console.error('Required DOM elements not found');
      }

      if (action.wasRunning) return true;

      action.eventTrigger(true);

      action.canvas.width = action.canvasTextCard.offsetWidth;
      action.canvas.height = action.canvasTextCard.offsetHeight;
      action.maxWidth = action.canvas.width;

      action.x = 0;
      action.y = 0;
      action.counter = 0;
      action.text = text.toString();
      action.context = action.canvas.getContext('2d');
      action.fontSize = action.fontRatio * action.canvas.width;
      action.lineHeight = parseInt(action.canvas.height / action.lineCount);
      action.context.font = (action.fontSize / 16).toString() + 'em ' + action.fontName;
      action.context.fillStyle = action.fontColor;
      action.context.scale = 1;
      action.startHeight = action.canvas.height + 30;
      action.wasRunning = true;

      return true;
    } catch(error) {
      console.error('Error setting up canvas text animation:', error);
      throw error;
    }
  };

  /**
   * Start or stop the animation
   * @param {Object} parent - Parent component
   * @param {Object} data - Configuration data
   */
  action.run = async (parent, data) => {
    action.parent = parent;

    if (data.attributes.play) {
      await action.setup(data.attributes.message);

      if(data.attributes.pause) {
        clearInterval(action.interval);
      } else {
        action.interval = setInterval(action.renderText, 1000 / action.intervalTime);
      }
    } else {
      action.wasRunning = false;
      action.eventTrigger(false);
      clearInterval(action.interval);
    }
  };

  /**
   * Render the text on the canvas (animation frame)
   */
  action.renderText = () => {
    if (action.parent.configs.debug) {
      action.counter++;
      action.debugBar.innerHTML = 'Interval: ' + action.counter.toString() +
        ' | TextHeight: ' + action.textHeight.toString() +
        ' | LineHeight: ' + action.lineHeight.toString() +
        ' | font: ' + action.fontSize.toString() +
        ' | width: ' + action.canvas.width.toString() +
        ' | height: ' + action.canvas.height.toString();
    }

    //action.canvas.width = action.canvasTextCard.offsetWidth;

    action.y = (action.textHeight == 0)? action.startHeight : action.y - 1;

    if (action.y < (action.textHeight * -1)) {
      action.y = action.startHeight;
    }

    action.context.clearRect(0, 0, action.canvas.width, action.canvas.height);
    action.wrapText(action.text, action.x, action.y);
  };

  /**
   * Wrap and render text on the canvas
   * @param {string} text - The text to render
   * @param {number} x - X position to start rendering
   * @param {number} y - Y position to start rendering
   */
  action.wrapText = (text, x, y) => {
    let line = '';
    const lines = text.split(/\r?\n/);

    action.textHeight = 0;

    for (let i = 0; i < lines.length; i++) {
      let words = lines[i].split(' ');

      for(let j = 0; j < words.length; j++) {
        let testLine = line + words[j] + ' ';

        if (action.context.measureText(testLine).width > action.maxWidth && j > 0) {
          action.context.fillText(line, x, y);

          line = words[j] + ' ';
          y += action.lineHeight;
          action.textHeight += action.lineHeight;
        } else {
          line = testLine;
        }
      }

      action.context.fillText(line, x, y);
      line = '';

      y += action.lineHeight;
      action.textHeight += action.lineHeight;
    }


    if (action.textHeight == 0) {
      action.textHeight = action.lineHeight;
    }

  //  action.context.fillText(line, x, y);
  };

  /**
   * Trigger status event
   * @param {boolean} status - The current status of the animation
   */
  action.eventTrigger = (status = true) => {
    const event = new CustomEvent('onCanvasTextActionStatus', {
      detail: {
        status: status
      }
    });

    window.dispatchEvent(event);
  };

  /**
   * Clean up resources and stop animation
   */
  action.destroy = () => {
    clearInterval(action.interval);
    action.interval = null;
    action.wasRunning = false;
    action.eventTrigger(false);
  };

  return action.initialize();
};
