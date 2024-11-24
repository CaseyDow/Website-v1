let SUITS = ["S", "D", "H", "C"];
let NUMS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "$"];

let deck, played, players, hand, hands, selected, settings;
let tupleNames = ["a single", "double", "triple", "quadruple", "quintuple", "sextuple"];
let suitNames = ["Spades", "Diamonds", "Hearts", "Clubs"];
let cardNames = ["Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Jack", "Queen", "King", "Ace"];

let client = new XMLHttpRequest();
client.open('GET', '/resources/nvwk/nvwk.txt');
client.onreadystatechange = function() {
  document.getElementById("info").innerHTML = client.responseText;
};
client.send();

function shuffle(arr) {
  let curIndex = arr.length, tempValue, randIndex;
  while (0 !== curIndex) {
    randIndex = Math.floor(Math.random() * curIndex);
    curIndex -= 1;
    tempValue = arr[curIndex];
    arr[curIndex] = arr[randIndex];
    arr[randIndex] = tempValue;
  }
  return arr;
}

function makeDeck() {
  let deck, strDeck;
  deck = [];
  strDeck = "GaNV:";
  for (let t = 0; t < SUITS.length; t++) {
    for (let r = 0; r < NUMS.length - 1; r++) {
      deck.push([SUITS[t], NUMS[r]]);
    }
  }
  if (options[1] % 2 == 0) {
    deck.push(["$", "$"]);
    deck.push(["$", "$"]);
  }
  deck = shuffle(deck);
  for (let i = 0; i < deck.length; i++) {
    strDeck += deck[i][0] + "," + deck[i][1] + ";";
  }
  strDeck += ";" + options[0] + ";;" + options[2] + ";;" + options[1];
  ws.send(strDeck);
}

let message = function(event) {
  if (event.data.startsWith("Code:")) {
    gameID = event.data.slice(5);
  } else if (event.data.startsWith("NV")) {
    let events = event.data.slice(3).split("//");
    setUpGame(events.shift());
    for (let i = 0; i < events.length; i++) {
      setTimeout(function() {
        message(new MessageEvent("message", { data: events.shift() }));
      }, 20 * i);
    }
    if (players[hand - 1] == "") {
      startClass();
    } else {
      startGame();
    }
    return;
  } else if (event.data.startsWith("Name")) {
    players[parseInt(event.data.slice(4, 5)) - 1] = event.data.slice(5);
  } else if (event.data.startsWith("Play")) {
    let vars = event.data.slice(4).split(";");
    let pNum = parseInt(vars.shift()) - 1;
    played.unshift([]);
    for (let i = 0; i < hands[pNum].length; i++) {
      if (vars.includes(hands[pNum][i].card[0] + "," + hands[pNum][i].card[1])) {
        hands[pNum][i].play(pNum + 1);
        played[0].push(hands[pNum][i]);
        hands[pNum].splice(hands[pNum].indexOf(hands[pNum][i]), 1);
        i -= 1;
      }
    }
    for (let i = 0; i < hands[pNum].length; i++) {
      hands[pNum][i].separate(hands[pNum].length, i + 1);
    }
    log(players[pNum] + " played " + tupleNames[vars.length - 1] + " " + cardNames[NUMS.indexOf(played[0][0].card[1])] + (vars.length > 1 ? "s" : ""));
    cardAbilities(pNum);
    settings[0] += settings[2];
    settings[0] += (players.length < settings[0] ? -1 : settings[0] < 1 ? 1 : 0) * players.length;
  } else if (event.data.startsWith("Pass")) {
    log(players[settings[0] - 1] + " passed.");
    if (settings[3] > 0) {
      settings[0] += settings[3] - 1;
      settings[3] = 0;
    }
    settings[0] += settings[2];
    settings[0] += (players.length < settings[0] ? -1 : settings[0] < 1 ? 1 : 0) * players.length;
  } else if (event.data.startsWith("Grab")) {
    let pNum = parseInt(event.data.slice(4, 5)) - 1;
    deck[deck.length - 1].grab(pNum - hand + 2 + (pNum - hand < -1 ? players.length : 0));
    hands[pNum].push(deck.pop());
    if (pNum == hand - 1) {
      hands[pNum].sort(function(a, b) {
        return NUMS.indexOf(b.card[1]) - NUMS.indexOf(a.card[1]);
      });
    }
    for (let i = 0; i < hands[pNum].length; i++) {
      hands[pNum][i].separate(hands[pNum].length, i + 1);
    }
    if (event.data.slice(5) != "") {
      let lisDeck = event.data.slice(5).split(";").slice(0, -1).map(function(x) {
        return x.split(",");
      });
      setTimeout(function() {
        let jokerNum;
        for (let i = 0; i < lisDeck.length; i++) {
          if (lisDeck[i][0] == "$") {
            jokerNum = lisDeck[i][1];
            lisDeck[i][1] = "$";
          }
          deck.push(new Card(lisDeck[i][0], lisDeck[i][1]));
          if (lisDeck[i][0] == "$") {
            deck[deck.length - 1].joker = parseInt(jokerNum);
          }
        }
      }, 1000);
    }
  } else if (event.data.startsWith("Shuffle")) {
    deck = [];
    played = [];
    selected = [""];
    let lisDeck = event.data.slice(7).split(";").map(x => x.split(","));
    let curJokers = 0;
    for (let i = 0; i < lisDeck.length; i++) {
      deck.push(new Card(lisDeck[i][0], lisDeck[i][1]));
      if (lisDeck[i][0] == "$") {
        curJokers += 1;
        deck[i].joker = curJokers;
      }
    }
    dealHands();
    settings[0] = 1;
    settings[1] = true;
    settings[2] = 1;
    log("The deck has been reshuffled!");
  } else if (event.data.startsWith("Clear")) {
    played = [];
    settings[1] = true;
    log("The pile has been cleared");
  } else if (event.data.startsWith("Joker")) {
    let pNum = parseInt(event.data.slice(5, 6)) - 1;
    let vars = event.data.slice(6).split(";");
    for (let i = 0; i < hands[pNum].length; i++) {
      if (hands[pNum][i].joker == parseInt(vars[0])) {
        hands[pNum][i].card = [vars[1], vars[2]];
        break;
      }
    }
  } else if (event.data.startsWith("Give")) {
    let pNum = parseInt(event.data.slice(4, 5)) - 1;
    let gNum = parseInt(event.data.slice(5, 6));
    let cardID = event.data.slice(6);
    for (let i = 0; i < hands[pNum].length; i++) {
      if (hands[pNum][i].card[0] + hands[pNum][i].card[1] == cardID) {
        let newCard = new Card(hands[pNum][i].card[0], hands[pNum][i].card[1]);
        newCard.grab(gNum - hand + (gNum - hand < -1 ? players.length + 2 : 2));
        hands[pNum].splice(i, 1);
        hands[gNum].push(newCard);
        for (let n = 0; n < hands[pNum].length; n++) {
          hands[pNum][n].separate(hands[pNum].length, n + 1);
        }
        if (gNum == hand - 1) {
          hands[gNum].sort(function(a, b) {
            return NUMS.indexOf(b.card[1]) - NUMS.indexOf(a.card[1]);
          });
        }
        for (let n = 0; n < hands[gNum].length; n++) {
          hands[gNum][n].separate(hands[gNum].length, n + 1);
        }
        break;
      }
    }
    window.requestAnimationFrame(drawGame);
  } else if (event.data.startsWith("Error")) {
    canvas.removeEventListener("click", onCreateClick);
    window.removeEventListener("keydown", onCreatePress);
    canvas.removeEventListener("click", onClassClick);
    window.removeEventListener("keydown", onClassPress);
    canvas.removeEventListener("click", onGameClick);
    window.removeEventListener("keydown", onGamePress);
    connectionLost(event.data);
    return;
  }
  if (hand != null && players[hand - 1] != "") {
    window.requestAnimationFrame(drawGame);
  }
};

function startCreate() {
  window.onresize = function() {
    resize();
    window.requestAnimationFrame(drawCreate);
  };
  canvas.addEventListener("click", onCreateClick);
  window.addEventListener("keydown", onCreatePress);
  window.requestAnimationFrame(drawCreate);
}

function onCreateClick(event) {
  if (between(event.offsetX, width * 0.3, width * 0.15)) {
    if (between(event.offsetY, height * 0.45, height * 0.1)) {
      options[1] += 1;
    }
  }
  if (between(event.offsetX, width * 0.3, width * 0.15)) {
    if (between(event.offsetY, height * 0.55, height * 0.1)) {
      options[2] += 1;
    }
  }
  if (between(event.offsetX, width * 0.3, width / 4)) {
    if (between(event.offsetY, height * 0.7875, height / 8)) {
      canvas.removeEventListener("click", onCreateClick);
      window.removeEventListener("keydown", onCreatePress);
      makeDeck();
      return;
    }
  }
  window.requestAnimationFrame(drawCreate);
}

function onCreatePress(event) {
  if (parseInt(event.key) > 1 && parseInt(event.key) < 7) {
    options[0] = parseInt(event.key);
  }
  window.requestAnimationFrame(drawCreate);
}

let options = [4, 0, 0];
function drawCreate() {
  rect(width / 2, height / 2, width, height, "#64c8dc");
  rect(width / 2, height / 2, width * 0.8, height * 0.8, "#c8f0ff");
  rect(width * 0.7, height / 2, width * 0.35, height * 0.7);
  rect(width * 0.3, height * 0.7875, width / 4, height / 8);
  text("How to Play", width * 0.7, height * 0.25, fontSize / 10);
  text("Be the person with the least points\nwhen the game ends by playing\nall your cards and attacking\nyour opponents!", width * 0.7, height * 0.45, fontSize / 16);
  text("NVWK", width * 0.3, height / 5, fontSize / 8);
  text("Start", width * 0.3, height * 0.7875, fontSize / 14);
  text("Players: " + options[0], width * 0.3, height * 0.35, fontSize / 14);
  if (options[1] % 2 == 0) {
    text("Jokers: On", width * 0.3, height * 0.45, fontSize / 14);
  } else {
    text("Jokers: Off", width * 0.3, height * 0.45, fontSize / 14);
  }
  if (options[2] % 2 == 0) {
    text("Revolutions: On", width * 0.3, height * 0.55, fontSize / 14);
  } else {
    text("Revolutions: Off", width * 0.3, height * 0.55, fontSize / 14);
  }
}

function setUpGame(data) {
  played = [];
  data = data.split(";;");
  data[0] = data[0].split(";")
  players = [...Array(parseInt(data[1]))].map(e => "");
  hand = parseInt(data[0].shift());
  selected = [""];
  let lisDeck = data[0].map(function(x) {
    return x.split(",");
  });
  deck = [];
  // settings = [turn, going up?, going right?, skips, revolutions, jokers];
  settings = [1, true, 1, 0, data[2] % 2 == 0, data[3] == 0];
  let curJokers = 0;
  for (let i = 0; i < lisDeck.length; i++) {
    deck.push(new Card(lisDeck[i][0], lisDeck[i][1]));
    if (lisDeck[i][0] == "$") {
      curJokers += 1;
      deck[i].joker = curJokers;
    }
  }
  dealHands();
}

function dealHands() {
  let amts = [10, 9, 8, 6, 5];
  hands = [...Array(players.length)].map(e => Array(0));
  for (let i = 0; i < hands.length; i++) {
    for (let n = 0; n < amts[players.length - 2]; n++) {
      deck[deck.length - 1].grab(i - hand + 2 + (i - hand < -1 ? players.length : 0));
      hands[i].push(deck.pop());
    }
    if (i == hand - 1) {
      hands[i].sort(function(a, b) {
        return NUMS.indexOf(b.card[1]) - NUMS.indexOf(a.card[1]);
      });
    }
    for (let n = 0; n < hands[i].length; n++) {
      hands[i][n].separate(hands[i].length, n + 1);
    }
  }
}

function startClass() {
  window.onresize = function() {
    resize();
    window.requestAnimationFrame(drawClass);
  };
  window.addEventListener("keydown", onClassPress);
  canvas.addEventListener("click", onClassClick);
  window.requestAnimationFrame(drawClass);
}

function onClassClick(event) {
  if (between(event.offsetX, width / 2, width / 5)) {
    if (between(event.offsetY, height / 1.5, height / 8)) {
      if (players[hand - 1] == "") {
        players[hand - 1] = "P" + hand;
      }
      ws.send(gameID + "Name" + hand + players[hand - 1]);
      window.removeEventListener("keydown", onClassPress);
      canvas.removeEventListener("click", onClassClick);
      startGame();
    }
  }
}

function onClassPress(event) {
  if (event.key == "Backspace") {
    players[hand - 1] = players[hand - 1].slice(0, -1);
  } else if (!event.key.match(/[^A-Za-z0-9 ]/) && event.key.length == 1) {
    players[hand - 1] += event.key;
    if (players[hand - 1].length > 10) {
      players[hand - 1] = players[hand - 1].slice(1);
    }
  }
  window.requestAnimationFrame(drawClass);
}

function drawClass() {
  rect(width / 2, height / 2, width, height, "#64c8dc");
  rect(width / 2, height / 2, width / 3, height / 6, "#ffffff");
  text("Name", width / 2, height * 0.3, fontSize / 6);
  text(players[hand - 1], width / 2, height / 2, fontSize / 10);
  rect(width / 2, height / 1.5, width / 5, height / 8, "#ffffff");
  text("Continue", width / 2, height / 1.5, fontSize / 15);
}

function startGame() {
  window.onresize = function() {
    [deck].concat(hands).forEach(elem => {
      for (let i = 0; i < elem.length; i++) {
        if (elem[i] != null) {
          elem[i].x *= Math.round(document.body.clientWidth * 0.8) / width;
          elem[i].y *= Math.round(window.innerHeight * 0.75) / height;
          if (elem[i].side % 2 == 0) {
            elem[i].offset *= Math.round(window.innerHeight * 0.75) / height;
          } else {
            elem[i].offset *= Math.round(document.body.clientWidth * 0.8) / width;
          }
        }
      }
    });
    resize();
    window.requestAnimationFrame(drawGame);
  };
  canvas.addEventListener("click", onGameClick);
  window.addEventListener("keydown", onGamePress);
  window.requestAnimationFrame(drawGame);
}

function onGameClick(event) {
  hands[hand - 1].some(card => {
    if (between(event.offsetX, card.x, width / 8)) {
      if (between(event.offsetY, card.y, height / 4)) {
        if (selected.includes(card)) {
          selected.splice(selected.indexOf(card), 1);
          card.y += height / 32;
          if (selected.length == 1) {
            selected[0] = "";
          }
        } else if (selected[0] == "" || (selected[0] == card.card[1] && selected[0] != "$")) {
          selected[0] = card.card[1];
          selected.push(card);
          card.y -= height / 32;
        }
        window.requestAnimationFrame(drawGame);
        return true;
      }
    }
  });
  if (between(event.offsetX, 7 * width / 8, width / 6)) {
    if (between(event.offsetY, 5 * height / 6, height / 12)) {
      if (settings[0] != hand) {
        log("#000000It is not your turn!")
      } else if (selected.length == 1) {
        ws.send(gameID + "Pass");
      } else if (selected[0] != "$" && canPlay()) {
        let cards = "";
        for (let i = 1; i < selected.length; i++) {
          cards += ";" + selected[i].card[0] + "," + selected[i].card[1];
        }
        ws.send(gameID + "Play" + hand + cards);
        selected = [""];
      }
    }
  }
  if (between(event.offsetX, 7 * width / 8, width / 6)) {
    if (between(event.offsetY, 5 * height / 7, height / 12)) {
      if (played.length > 0) {
        if (settings[0] == hand) {
          ws.send(gameID + "Clear");
        } else {
          log("It is not your turn!");
        }
      } else {
        deck = []
        for (let t = 0; t < SUITS.length; t++) {
          for (let r = 0; r < NUMS.length - 1; r++) {
            deck.push([SUITS[t], NUMS[r]]);
          }
        }
        if (settings[5]) {
          deck.push(["$", "$"]);
          deck.push(["$", "$"]);
        }
        deck = shuffle(deck);
        let lisDeck = "Shuffle";
        for (let i = 0; i < deck.length; i++) {
          lisDeck += deck[i][0] + "," + deck[i][1] + ";";
        }
        ws.send(gameID + lisDeck.slice(0, -1));
      }
    }
  }
  if (between(event.offsetX, 17 * width / 64, width / 8)) {
    if (between(event.offsetY, height / 2, height / 4)) {
      if (selected[0] != "$") {
        let extra = "";
        if (deck.length == 1) {
          let curCards = [];
          let jokers = options[1] % 2 == 0 ? 2 : 0;
          let handCards = hands.flat().concat(deck);
          if (played.length > 0) {
            handCards = handCards.concat(played[0]);
          }
          for (let i = 0; i < handCards.length; i++) {
            curCards.push(handCards[i].card[0] + handCards[i].card[1]);
            if (handCards[i].joker > 0) {
              jokers--;
            }
          }
          let newDeck = [];
          for (let t = 0; t < SUITS.length; t++) {
            for (let r = 0; r < NUMS.length - 1; r++) {
              if (!curCards.includes(SUITS[t] + NUMS[r])) {
                newDeck.push([SUITS[t], NUMS[r]]);
              }
            }
          }
          for (let i = 0; i < jokers; i++) {
            newDeck.push(["$", i + 1]);
          }
          newDeck = shuffle(newDeck)
          for (let i = 0; i < newDeck.length; i++) {
            extra += newDeck[i][0] + "," + newDeck[i][1] + ";";
          }
        }
        ws.send(gameID + "Grab" + hand + extra);
      }
    }
  }
  if (selected[0] == "$") {
    for (let i = 0; i < 13; i++) {
      if (between(event.offsetX, width * (i + 1) * 309 / 5780, width / 20)) {
        if (between(event.offsetY, 3 * height / 8, height / 5)) {
          selected[1].newNum = i;
          window.requestAnimationFrame(drawGame);
        }
      }
    }
    for (let i = 0; i < 4; i++) {
      if (between(event.offsetX, width * (1 + i * 1.5) * 3 / 28, width * 11 / 70)) {
        if (between(event.offsetY, 5 * height / 8, height / 5)) {
          selected[1].newSuit = i;
          window.requestAnimationFrame(drawGame);
        }
      }
    }
    if (between(event.offsetX, width * 4017 / 5780, width / 20)) {
      if (between(event.offsetY, 5 * height / 8, height / 5)) {
        if (selected[1].newNum != null && selected[1].newSuit != null) {
          let newNum = NUMS[selected[1].newNum];
          let newSuit = SUITS[selected[1].newSuit];
          selected[1].image.src = '/images/cards/' + newNum + newSuit + '.png';
          selected[0] = newNum;
          ws.send(gameID + "Joker" + hand + selected[1].joker + ";" + newSuit + ";" + newNum);
        }
      }
    }
  }
  for (let i = 0; i < players.length; i++) {
    if (between(event.offsetX, 7 * width / 8, width / 4)) {
      if (between(event.offsetY, height / 15 * (i + 2), height / 15)) {
        if (selected[0] != "" && selected.length == 2) {
          ws.send(gameID + "Give" + hand + i + selected[1].card[0] + selected[1].card[1]);
          selected = [""];
        }
      }
    }
  }
}

function onGamePress(event) {
}

class Card {
  constructor(suit, num) {
    this.card = [suit, num];
    this.hand = 0;
    this.x = 11 * width / 36;
    this.y = height / 2;
    this.side = 0;
    this.image = new Image();
    this.image.onload = function() {
      if (players[hand - 1] != "") {
        window.requestAnimationFrame(drawGame);
      }
    };
    this.image.src = '/images/back.png';
  }

  grab(newHand) {
    let cardPos = [[1, 1, 1, 1, 1, 1, 1], [0, 1, 1, 1, 2, 2], [1, 0, 1, 2, 1, 2], [0, 1, 1, 1, 2, 2]];
    let handPos = [[3 * width / 8, 27 * height / 32], [3 * width / 32, height / 2],
                [3 * width / 8, 5 * height / 32], [21 * width / 32, height / 2]]
    let x = 0;
    while (x < newHand) {
      x += cardPos[this.side][players.length - 2];
      this.side += 1;
    }
    let handsOnSide = cardPos[this.side - 1][players.length - 2];
    let handOnSide = newHand - x + handsOnSide;
    this.x = handPos[this.side - 1][0];
    this.y = handPos[this.side - 1][1];
    if (handsOnSide > 1) {
      if (this.side == 2) {
        this.y += ((handsOnSide + 1) / 2 - handOnSide) * height / handsOnSide;
      } else if (this.side == 3) {
        this.x -= ((handsOnSide + 1) / 2 - handOnSide) * width / (handsOnSide + 1);
      } else if (this.side == 4) {
        this.y -= ((handsOnSide + 1) / 2 - handOnSide) * height / handsOnSide;
      }
    }
    if (this.side % 2 == 0) {
      this.offset = this.y;
    } else {
      this.offset = this.x;
    }
    this.hand = newHand;
    if (this.hand == 1) {
      this.image.src = '/images/cards/' + this.card[1] + this.card[0] + '.png';
    } else {
      this.image.src = '/images/back.png';
    }
  }

  separate(total, num) {
    let amt = 0.25;
    if (this.hand == 1) {
      amt = 0.5;
    }
    if (this.side % 2 == 0) {
      if (total > 8) {
        this.y = this.offset + ((total + 1) / 2 - num) * height / total * amt;
      } else {
        this.y = this.offset + ((total + 1) / 2 - num) * height / 8 * amt;
      }
    } else {
      if (total > 8) {
        this.x = this.offset + ((total + 1) / 2 - num) * width / total * amt;
      } else {
        this.x = this.offset + ((total + 1) / 2 - num) * width / 8 * amt;
      }
    }
  }

  play(player, vars="") {
    this.x = 4 * width / 9;
    this.y = height / 2;
    this.image.src = '/images/cards/' + this.card[1] + this.card[0] + '.png';
  }
}

function canPlay() {
  if (played.length == 0) {
    return selected[0] != "5";
  }
  let valSel = NUMS.indexOf(selected[0]);
  let valPlay = NUMS.indexOf(played[0][0].card[1]);
  let lastSuits = played[0].map((elem) => elem.card[0]);
  let currSuits = selected.slice(1).map((elem) => elem.card[0]);
  if (played[0][0].card[1] == "9" && lastSuits.includes("S")) {
    return false;
  } else if (settings[3] > 0 && selected[0] != "8") {
    return false;
  }
  if (selected.length - 1 != played[0].length) {
    if (Math.abs(valSel - valPlay) == 1) {
      if (selected.length == played[0].length && valSel % 2 != 1) {
        return false;
      } else if (selected.length - 2 == played[0].length && valSel % 2 != 0) {
        return false;
      }
    } else {
      return false;
    }
  }
  if (selected[0] == "9" && currSuits.includes("C")) {
    return true;
  }
  if (played[0][0].card[1] == "Q") {
    if (!["10", "A"].includes(selected[0])) {
      return false;
    }
    for (let i = 0; i < lastSuits.length; i++) {
      if (!currSuits.includes(lastSuits[i])) {
        return false;
      }
    }
  }
  if (selected[0] == "10") {
    if (!["2", "3", "K", "A"].includes(played[0][0].card[1])) {
      return true;
    }
  }
  if (valSel > valPlay != settings[1] && valSel != valPlay) {
    return false;
  }
  if (selected[0] == "5") {
    let fives = {"C":"H", "H":"S", "S":"D", "D":"C"};
    for (let i = 1; i < selected.length; i++) {
      if (!lastSuits.includes(fives[selected[i].card[0]])) {
        return false;
      }
    }
  }
  return true;
}

function cardAbilities(player) {
  let lastNum = played[0][0].card[1];
  let lastSuits = played[0].map((elem) => elem.card[0]);
  if (["2", "A", "10"].includes(lastNum)) {
    settings[1] = settings[1] == false;
  } else if (lastNum == "4") {
    settings[2] *= -1;
  } else if (lastNum == "5") {
  } else if (lastNum == "6") {
  } else if (lastNum == "7" && hand - 1 == player) {
    for (let i = 0; i < lastSuits.length; i++)
    if (lastSuits[i] == "S") {
      for (let n = 0; n < hands.length; n++) {
        if (n != hand - 1) {
          revealRandom(n);
        }
      }
    } else if (lastSuits[i] == "D") {
      revealRandom(hand < 2 ? hands.length - 1 : hand - 2);
    } else if (lastSuits[i] == "H") {
      revealRandom(hand > hands.length - 1 ? 0 : hand);
    }
  } else if (lastNum == "8") {
    settings[3] += played[0].length;
  } else if (lastNum == "9") {
    if (lastSuits.includes("S")) {
      setTimeout(function() {
        message(new MessageEvent("message", { data: "Clear" }));
      }, 1000);
      settings[0] -= settings[2];
      settings[0] += (players.length < settings[0] ? -1 : settings[0] < 1 ? 1 : 0) * players.length;
    }
  } else if (lastNum == "J") {
  } else if (lastNum == "K") {
  }
}

function revealRandom(aim) {
  let aimHand = [...hands[aim]];
  let randIndex = Math.floor(Math.random() * aimHand.length);
  while (aimHand.length > 0) {
    if (aimHand[randIndex].image.src != "/images/back.png") {
      break;
    }
    aimHand.splice(randIndex, 1);
    randIndex = Math.floor(Math.random() * aimHand.length);
  }
  if (aimHand.length == 0) {
    return;
  }
  for (let i = 0; i < hands[aim].length; i++) {
    if (hands[aim][i] == aimHand[randIndex]) {
      hands[aim][i].image.src = '/images/cards/' + hands[aim][i].card[1] + hands[aim][i].card[0] + '.png';
    }
  }
  log("> " + players[aim] + " has a " + cardNames[NUMS.indexOf(aimHand[randIndex].card[1])] + " of " + suitNames[SUITS.indexOf(aimHand[randIndex].card[0])]);
}

function drawInfo() {
  rect(7 * width / 8, height / 2, width / 4, height);
  text(gameID, 7 * width / 8, height * 15 / 16, fontSize / 15);
  text("Deck: " + deck.length + " cards", 7 * width / 8, height / 15 - fontSize / 80, fontSize / 20);
  for (let i = 0; i < players.length; i++) {
    let pInfo = players[i] + ": " + hands[i].length + " cards";
    if (players[i] == "") {
      pInfo = "P" + (i + 1) + pInfo;
    }
    let color = "#000000";
    if (i == settings[0] - 1) {
      color = "#ff4242";
    } else if (i == hand - 1) {
      color = "#2d7d07";
    } else if (players[i] == "") {
      color = "#848484";
    }
    text(pInfo, 7 * width / 8, height / 15 * (i + 2), fontSize / 20, color);
  }
  if (settings[1]) {
    text("Card Order: Up", 7 * width / 8, height / 1.6);
  } else {
    text("Card Order: Down", 7 * width / 8, height / 1.6);
  }
  if (settings[2] > 0) {
    text("Play Order: Left", 7 * width / 8, height / 1.8);
  } else {
    text("Play Order: Right", 7 * width / 8, height / 1.8);
  }
  if (selected.length == 1 || canPlay()) {
    rect(7 * width / 8, height / 1.2, width / 6, height / 12, "#ff2020");
  } else {
    rect(7 * width / 8, height / 1.2, width / 6, height / 12, "#ffc0c0");
  }
  if (selected.length > 1) {
    let lastSuits = selected.slice(1).map((elem) => elem.card[0]);
    if (selected[0] == "9" && (lastSuits.includes("H") || lastSuits.includes("D")) || selected[0] == "K") {
      text("Click a Name", 7 * width / 8, height / 1.2);
    } else {
      text("Play", 7 * width / 8, height / 1.2);
    }
  } else {
    text("Pass", 7 * width / 8, height / 1.2);
  }
  rect(7 * width / 8, height / 1.4, width / 6, height / 12, "#2020ff");
  if (played.length > 0) {
    text("Clear", 7 * width / 8, height / 1.4);
  } else {
    text("Reshuffle", 7 * width / 8, height / 1.4);
  }
}

let blankImg = new Image();
blankImg.src = "/images/blank.png";
let deckImg = new Image();
deckImg.src = "/images/deck.png";
function drawGame() {
  rect(width / 2, height / 2, width, height, "#dcdcdc");
  drawInfo();
  hands.slice(hand).concat(hands.slice(0, hand)).forEach(pHand => {
    for (let i = pHand.length - 1; i >= 0; i--) {
      ctx.drawImage(pHand[i].image, pHand[i].x - width / 16, pHand[i].y - height / 8, width / 8, height / 4);
    }
  });
  if (played.length > 0) {
    for (let i = 0; i < played[0].length; i++) {
      let offset = (i - (played[0].length - 1) / 2) * width / 12 / played[0].length;
      ctx.drawImage(played[0][i].image, 3 * width / 8 + offset, 3 * height / 8, width / 8, height / 4);
    }
  } else {
    ctx.drawImage(blankImg, 3 * width / 8, 3 * height / 8, width / 8, height / 4);
  }
  if (deck.length > 0) {
    ctx.drawImage(deckImg, 13 * width / 64, 3 * height / 8, width / 8, height / 4);
  }
  if (selected[0] == "$") {
    rect(3 * width / 8, height / 2, width * 0.71, height / 2, "#c0c0c0");
    for (let i = 0; i < 13; i++) {
      let color = selected[1].newNum == i ? "#ff0000" : "#000000";
      rect(width * (i + 1) * 309 / 5780, 3 * height / 8, width / 20, height / 5);
      text(NUMS[i], width * (i + 1) * 309 / 5780, 3 * height / 8, fontSize / 20, color);
    }
    for (let i = 0; i < 4; i++) {
      let color = selected[1].newSuit == i ? "#ff0000" : "#000000";
      rect(width * (1 + i * 1.5) * 3 / 28, 5 * height / 8, width * 11 / 70, height / 5);
      text(suitNames[i], width * (1 + i * 1.5) * 3 / 28, 5 * height / 8, fontSize / 20, color);
    }
    rect(width * 4017 / 5780, 5 * height / 8, width / 20, height / 5, "#00af00");
    text("Done", width * 4017 / 5780, 5 * height / 8);
  }
  if (0) {
    rect(3 * width / 8, 5 * height / 12, width * (2 * players.length + 1) / 15, height / 1.5, "#f0f0f0");
    text("Bounty", 3 * width / 8, 11 * height / 48, fontSize / 8);
    for (let i = 0; i < players.length; i++) {
      if (deck[i] == null) {
        ctx.drawImage(blankImg, width * (5 / 16 + (2 * i + 1 - players.length) / 15), 3 * height / 8, width / 8, height / 4);
      } else {
        ctx.drawImage(deck[i].image, width * (5 / 16 + (2 * i + 1 - players.length) / 15), 3 * height / 8, width / 8, height / 4);
      }
    }
  }
}
