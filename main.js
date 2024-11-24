let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");
let width, height, fontSize;
canvas.style.zoom = 0.25;

let ws = new WebSocket('ws://localhost:17891');

let resize = function() {
  width = Math.round(document.body.clientWidth * 0.8);
  height = Math.round(window.innerHeight * 0.75);
  canvas.width = width * 4;
  canvas.height = height * 4;
  ctx.scale(4, 4);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (width / 2 < height) {
    fontSize = width / 2;
  } else {
    fontSize = height;
  }
};

function rect(x, y, across, up, color="#ffffff") {
  ctx.fillStyle = "#000000";
  ctx.fillRect(x - across / 2, y - up / 2, across, up);
  ctx.fillStyle = color;
  ctx.fillRect(x - across / 2 + 3, y - up / 2 + 3, across - 6, up - 6);
}

function text(text, x, y, font=null, color="#000000") {
  if (font != null) {
    ctx.font = font + "px Big Shoulders Display";
  }
  ctx.fillStyle = color;
  text = (text + "").split("\n");
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], x, y + (i - (text.length - 1) / 2) * font);
  }
}

function log(text) {
  let docLog = document.getElementById("log");
  text = text.split("#");
  docLog.innerHTML += text.splice(0, 1);
  for (let i = 0; i < text.length; i += 2) {
    text.splice(i + 1, 0, text[i].slice(6));
    text[i] = text[i].slice(0, 6);
  }
  for (let i = 0; i < text.length; i += 2) {
    docLog.innerHTML += "<font color='" + text[i] + "'>" + text[i + 1] + "</font>";
  }
  docLog.innerHTML += "<br>";
  docLog.scrollTop = docLog.scrollHeight;
}

function between(point, middle, length) {
  return middle - length / 2 < point && point < middle + length / 2;
}

function onMainClick(event) {
  console.log(event.offsetX, event.offsetY)
  console.log(width * 0.4, width * 0.6, height * 41 / 66, height * 47 / 66)
  if (width * 0.4 < event.offsetX && event.offsetX < width * 0.6) {
    if (height * 41 / 66 < event.offsetY && event.offsetY < height * 47 / 66) {
      canvas.removeEventListener("click", onMainClick);
      window.removeEventListener("keydown", onMainPress);
      startCreate();
    }
  }
}

function onMainPress(event) {
  if (event.key == "Backspace") {
    gameID = gameID.slice(0, -1);
  } else if (!isNaN(event.key)) {
    gameID += event.key;
    if (gameID.length >= 4) {
      gameID = gameID.slice(1);
    }
  } else if (event.key == "Enter" && gameID.length == 3) {
    canvas.removeEventListener("click", onMainClick);
    window.removeEventListener("keydown", onMainPress);
    ws.send(gameID + "0");
  }
  window.requestAnimationFrame(drawMain);
}

class Error {
  constructor() {
    this.opacity = 0;
    this.message = "";
  }

  draw() {
    this.opacity -= 0.02;
    ctx.fillStyle = "rgba(255, 0, 0, " + this.opacity + ")";
    ctx.fillText(this.message, width / 2, height / 1.2);
    window.requestAnimationFrame(drawMain);
  }
}

function drawMain() {
  rect(width / 2, height / 2, width, height, "#64c8dc");
  rect(width / 2, height / 1.8, width / 4, height / 9);
  rect(width / 2, height / 1.5, width / 5, height / 11);
  text("Multiplayer", width / 2, height / 6, fontSize / 6);
  text("Game ID:", width / 2, height / 2.3, fontSize / 17);
  text(gameID, width / 2, height / 1.8, fontSize / 17);
  text("Create Game", width / 2, height / 1.5, fontSize / 20);
  if (error.opacity > 0) {
    error.draw();
  }
}

let gameID = "";
let error = new Error();

function connectionLost(message) {
  error.message = message;
  error.opacity = 8;
  window.onresize = function() {
    window.requestAnimationFrame(drawMain);
    resize();
  };
  window.addEventListener("keydown", onMainPress);
  canvas.addEventListener("click", onMainClick);
  window.requestAnimationFrame(drawMain);
}
ws.onmessage = message;
ws.onclose = function() {
  connectionLost("Error: Could not connect to server.");
};

function setup() {
  window.onresize = function() {
    window.requestAnimationFrame(drawMain);
    resize();
  };
  window.requestAnimationFrame(drawMain);
  window.addEventListener("keydown", onMainPress);
  canvas.addEventListener("click", onMainClick);
}

resize();
setup();

document.onreadystatechange = function() {
  if (document.readyState == "complete") {
    let check = setInterval(function() {
      if (document.fonts.check('1em Big Shoulders Display')) {
        setTimeout(function() {
          window.requestAnimationFrame(drawMain);
        }, 20);
        clearInterval(check);
      }
    }, 20);
  }
};

window.addEventListener('keydown', function(e) {
  if(e.keyCode == 32 && e.target == document.body) {
    e.preventDefault();
  }
});

window.onbeforeunload = function() {
  ws.close();
};
