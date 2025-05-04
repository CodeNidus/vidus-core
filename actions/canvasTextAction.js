module.exports = () => {

  const action = {};


  action.setup = (text) => {
    return new Promise((resolve) => {
      if (this.initial) {
        resolve(true)
        return
      }

      this.lineCount = 4;
      this.initial = true;
      this.fontRatio = 0.05;
      this.fontName = 'Roboto';
      this.fontColor = "rgba(15, 23, 42, 1)"
      this.intervalTime = 15;

      this.x = 0;
      this.y = 0;
      this.text = text.toString();
      this.textHeight = 0;
      this.startHeight = 60;
      this.lineHeight = 0;
      this.canvasTextCard = document.getElementById("canvas-text-action-card");
      this.canvasText = document.getElementById('canvas-text');
      this.canvas = document.getElementById('canvas-text-scroll-section');

      this.canvasTextCard.style.display = 'block';
      this.canvasText.style.display = 'block';
      this.canvas.style.display = 'block';

      this.canvas.width = this.canvasTextCard.offsetWidth;
      this.canvas.height = this.canvasTextCard.offsetHeight;
      this.maxWidth = this.canvas.width;

      this.context = this.canvas.getContext('2d');

      this.fontSize = this.fontRatio * this.canvas.width;
      //this.lineHeight = parseInt(((this.canvas.height - (this.lineCount * this.fontSize)) / (this.lineCount - 1)) + this.fontSize);
      this.lineHeight = parseInt(this.canvas.height / this.lineCount);
      this.context.font = (this.fontSize / 16).toString() + 'em ' + this.fontName;
      this.context.fillStyle = this.fontColor;
      this.context.scale = 1;
      this.startHeight = this.canvas.height + 30;

      resolve(true)
    })
  }

  action.run = (parent, data) => {
    if (data.attributes.play) {
      action.setup(data.attributes.message).then(() => {
        if(data.attributes.pause) {
          clearInterval(this.interval);
        } else {
          this.interval = setInterval(action.renderText, 1000 / this.intervalTime);
        }
      });
    } else {
      this.initial = false;
      this.canvasTextCard.style.display = 'none';
      this.canvas.style.display = 'none';
      this.canvasText.style.display = 'none';
      clearInterval(this.interval);
    }
  }

  action.renderText = () => {
      // debug section
    /*
      this.counter++;
      this.debug.innerHTML = 'Interval: ' + this.counter.toString() + ' | TextHeight: ' + this.textHeight.toString() +
        ' | LineHeight: ' + this.lineHeight.toString() + ' | font: ' + this.fontSize.toString() +
        ' | width: ' + this.canvas.width.toString() + ' | height: ' + this.canvas.height.toString();
      //
    */
    //this.canvas.width = this.canvasTextCard.offsetWidth;

    if(this.textHeight == 0) {
      this.y = this.startHeight;
    } else {
      this.y -= 1;

      if (this.y < (this.textHeight * -1)) {
        this.y = this.startHeight;
      }
    }

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    action.wrapText(this.text, this.x, this.y);
  }

  action.wrapText = (text, x, y) => {
    let line = '';
    let lines = text.split(/\r?\n/);

    this.textHeight = 0;

    for (let i = 0; i < lines.length; i++) {
      let words = lines[i].split(' ');

      for(let j = 0; j < words.length; j++) {
        let testLine = line + words[j] + ' ';

        if (this.context.measureText(testLine).width > this.maxWidth && j > 0) {
          this.context.fillText(line, x, y);

          line = words[j] + ' ';
          y += this.lineHeight;
          this.textHeight += this.lineHeight;
        } else {
          line = testLine;
        }
      }

      this.context.fillText(line, x, y);
      line = '';

      y += this.lineHeight;
      this.textHeight += this.lineHeight;
    }


    if (this.textHeight == 0) {
      this.textHeight = this.lineHeight;
    }

    this.context.fillText(line, x, y);
  }

  return action;
}
