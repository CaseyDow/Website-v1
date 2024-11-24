let TYPES = ["M", "R", "W", "S"];
let RARTS = ["2C1", "2C2", "2C3", "2R1", "2R2", "2E1", "1M1"];

let clicked, players, hand, deck, hands, played, target;
let stats, sortStats, protections, tokens;

let classTypes = {
  "Knight":"W",
  "Archer":"R",
  "Mage":"M",
  "Warlock":"S"
};
let colors = {
  "Knight":"#ffd966",
  "Archer":"#b6d7a8",
  "Mage":"#6fa8dc",
  "Warlock":"#c27ba0"
};
let colorsDark = {
  "Knight":"#ac881d",
  "Archer":"#649051",
  "Mage":"#2c679c",
  "Warlock":"#882d5d"
};
let classes = [
  "Knight",
  "Archer",
  "Mage",
  "Warlock"
];
let abilities = [
  [
    "Royal Aura: Ignore true damage dealt\nby Magic Weapons.",
    "Castle Armory: At the start of the game,\nand at each Intermission, gain an Armor Token."
  ],
  [
    "Magical Quiver: Start the game with a\nSpeed Token and a token of your choice.",
    "Nimble Feet: Once per combat, dodge the\ndamage of an attack of your choice."
  ],
  [
    "Hoarding: At the start of the game,\ngain a random Game and Combat Token.",
    "Enchanted Lifeline: Once per combat,\ninstead of dying block all damage until\nyour next turn. Live on 15."
  ],
  [
    "Overconfidence: While at or above 5 Life Points,\ngain +2 attack, and below it, gain +2 armor.",
    "Demonic Essence: When you use a Soul weapon,\nheal for a third of the damage of the weapon."
  ],
  "Empowered Strikes: After you use a card\nfrom your class, your next hit\ndeals +5 damage."
];
let cards = {
  "MC1":"Piercing Wand",
  "MC2":"Mushroom on a Stick",
  "MC3":"Scepter of Wisdom",
  "MR1":"Ethereal Enhancements",
  "MR2":"Conjuring Staff",
  "ME1":"Glass Orb",
  "MM1":"Mindbreaker",
  "RC1":"Shurikens",
  "RC2":"Throwing Spear",
  "RC3":"Compound Crossbow",
  "RR1":"Luminecent Shotter",
  "RR2":"Terrain Bow",
  "RE1":"Blowdarts",
  "RM1":"Stormshot",
  "WC1":"Copper Ward",
  "WC2":"Smithing Hammer",
  "WC3":"Scimitar of Judgement",
  "WR1":"Thick Cleaver",
  "WR2":"Heavy Axe",
  "WE1":"Sentinel's Sword",
  "WM1":"Vulcan's Greatsword",
  "SC1":"Explosive Darkblade",
  "SC2":"Firespit Scythe",
  "SC3":"Soul Barrier",
  "SR1":"Shadow Dagger",
  "SR2":"Demonic Boomerang",
  "SE1":"Dual Scythes",
  "SM1":"Reaper of Souls",
  "JJ1":"Incantation"
};
let classBuffs = [
  [0, 0, -1, 2],
  [2, -1, 0, 0],
  [0, 20, 0, -10]
];
let tokenNames = ["Attack", "Armor", "Speed", "Health", "Arcane", "Mushroom", "Recycle", "Life"];
let tokenColors = ["#b50000", "#ffa444", "#7fcf7e", "#d64545", "#6dc5d6", "#ff6969", "#6688ff", "#ffdd61"];
let incantationNames = ["King's Blessing", "Super Speed", "Arcanography", "Ultimate Confrontation"];


let client = new XMLHttpRequest();
client.open('GET', '/resources/tapp/tapp.txt');
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
  strDeck = "GaTP:";
  for (let t = 0; t < TYPES.length; t++) {
    for (let r = 0; r < RARTS.length; r++) {
      for (let i = 0; i < parseInt(RARTS[r].slice(0, 1)); i++) {
        deck.push([TYPES[t], RARTS[r].slice(1)]);
      }
    }
  }
  if (options[1] % 2 == 0) {
    deck.push(["J", "J1"]);
    deck.push(["J", "J1"]);
  }
  deck = shuffle(deck);
  for (let i = 0; i < deck.length; i++) {
    strDeck += deck[i][0] + "," + deck[i][1] + ";";
  }
  strDeck += ";" + options[0];
  ws.send(strDeck);
}

let message = function(event) {
  if (event.data.startsWith("Code:")) {
    gameID = event.data.slice(5);
  } else if (event.data.startsWith("TP")) {
    let events = event.data.slice(3).split("//");
    setUpGame(events.shift());
    for (let i = 0; i < Math.min(players.length, events.length); i++) {
      message(new MessageEvent("message", { data: events.shift() }));
    }
    if (!isNaN(stats[hand - 1][0])) {
      startClass();
    } else {
      startGame();
    }
    for (let i = 0; i < events.length; i++) {
      setTimeout(function() {
        message(new MessageEvent("message", { data: events.shift() }));
      }, 20 * i);
    }
  } else if (event.data.startsWith("User")) {
    let data = event.data.slice(4).split(";;");
    let name = data.pop();
    data = data[0].split(";");
    if (isNaN(stats[data[0] - 1][0])) {
      return;
    }
    players[data[0] - 1] = name;
    for (let i = 1; i < 8; i++) {
      stats[data[0] - 1][i - 1] = isNaN(data[i]) ? data[i] : parseInt(data[i]);
    }
    stats[data[0] - 1][1] = 100;
    if (stats[data[0] - 1][5] == "Nimble Feet") {
      protections[data[0] - 1][0] = 0;
    }
    while (data.length > 8) {
      token(data[0] - 1, parseInt(data.pop()), false);
    }
    sortStats = stats.map(arr => arr.slice());
    for (let i = 0; i < sortStats.length; i++) {
      sortStats[i].push(i);
    }
    sortStats.sort(function(a, b) {
      return b[4] - a[4];
    });
    for (let i = 0; i < sortStats.length; i++) {
      sortStats[i] = sortStats[i][7];
    }
    for (let i = 0; i < sortStats.length; i++) {
      if (sortStats[i] == hand - 1) {
        sortStats.splice(i, 1);
        target = i < sortStats.length ? i : 0;
        break;
      }
    }
  } else if (event.data.startsWith("Grab")) {
    let pNum = parseInt(event.data.slice(5, 6)) - 1;
    let cardNum = parseInt(event.data.slice(6, 7));
    let modHand = pNum - hand + 2 + (pNum - hand < -1 ? players.length : 0);
    if (cardNum == 0) {
      if (deck.length > 0) {
        deck[deck.length - 1].grab(modHand);
        hands[pNum].push(deck.pop());
      }
    } else {
      if (played[1].length > cardNum - 1) {
        played[1][cardNum - 1].grab(modHand);
        hands[pNum].push(played[1][cardNum - 1]);
        if (deck.length > 0) {
          let card = deck.pop();
          card.image.src = '/images/tapp/' + card.card[0] + card.card[1] + '.png';
          played[1][cardNum - 1] = card;
        } else {
          played[1][cardNum - 1] = null;
        }
      }
    }
    for (let i = 0; i < hands[pNum].length; i++) {
      hands[pNum][i].separate(hands[pNum].length, i + 1);
    }
    if (protections.length > players.length) {
      protections[0][2] += 1;
      if (protections[0][1] <= protections[0][2]) {
        protections.shift();
        log("> " + colorsDark[stats[pNum][0]] + players[pNum] + " #000000finished using their Recycle Token.");
      }
    }
  } else if (event.data.startsWith("Play")) {
    let pNum = parseInt(event.data.slice(5, 6)) - 1;
    for (let i = 0; i < hands[pNum].length; i++) {
      if (event.data.slice(6, 9) == hands[pNum][i].card[0] + hands[pNum][i].card[1]) {
        let card = hands[pNum][i];
        card.play(pNum + 1, event.data.slice(9, 10), event.data.slice(10));
        hands[pNum].splice(hands[pNum].indexOf(card), 1);
        for (let n = 0; n < hands[pNum].length; n++) {
          hands[pNum][n].separate(hands[pNum].length, n + 1);
        }
        break;
      }
    }
  } else if (event.data.startsWith("Token")) {
    let pNum = parseInt(event.data.slice(7, 8)) - 1;
    if (event.data.slice(6, 7) == "P") {
      let tokenNum = parseInt(event.data.slice(8, 9));
      if (tokenNum == 0) {
        let modHand = pNum - hand + 2;
        if (modHand < 1) {
          modHand += players.length;
        }
        let suit = event.data.slice(9, 10);
        let num = event.data.slice(10, 12);
        let newCard = new Card(suit, num);
        newCard.dupe = true;
        newCard.grab(modHand);
        hands[pNum].push(newCard);
        for (let i = 0; i < hands[pNum].length; i++) {
          hands[pNum][i].separate(hands[pNum].length, i + 1);
        }
        tokens[pNum][0] -= 1;
      } else if (tokenNum == 1) {
        stats[pNum][1] += 20;
        tokens[pNum][1] -= 1;
        if (stats[pNum][1] > 100 + tokens[pNum][3] * 10) {
          stats[pNum][1] = 100 + tokens[pNum][3] * 10;
        }
      } else if (tokenNum == 2) {
        tokens[pNum][2] -= 1;
        protections.unshift([pNum, 0, 0]);
      } else if (tokenNum == 3) {
        stats[pNum][1] += parseInt(event.data.slice(9));
        protections[pNum].shift();
      }
      if (tokenNum < 3) {
        log("> " + colorsDark[stats[pNum][0]] + players[pNum] + "#000000 used a " + tokenNames[tokenNum + 4] + " token");
      }
    } else if (event.data.slice(6, 7) == "G") {
      if (pNum == hand - 1 && tokens.length > players.length) {
        tokens.pop();
      }
      token(pNum, parseInt(event.data.slice(8, 9)));
    }
  } else if (event.data.startsWith("Shuffle")) {
    deck = [];
    let lisDeck = event.data.split(";;")[0].slice(8).split(";").map(x => x.split(","));
    for (let i = 0; i < lisDeck.length; i++) {
      deck.push(new Card(lisDeck[i][0], lisDeck[i][1]));
    }
    played = [[], []];
    clicked[0] = null;
    clicked[1] = false;
    for (let i = 0; i < 3; i++) {
      played[1].push(deck.pop());
      played[1][i].image.src = '/images/tapp/' + played[1][i].card[0] + played[1][i].card[1] + '.png';
    }
    let sortHealth = [...stats];
    for (let i = 0; i < sortHealth.length; i++) {
      sortHealth[i] = [sortHealth[i][1], sortHealth[i][4], i];
    }
    sortHealth.sort(function(a, b) {
      return (a[0] == b[0] ? b[1] - a[1] : b[0] - a[0]);
    });
    for (let i = 0; i < sortHealth.length; i++) {
      let player = sortHealth[i][2];
      stats[player][1] = 100 + tokens[player][3] * 10;
      stats[player][6] -= i * 2;
      if (player == hand - 1) {
        deck.push(i);
        if (i == 0) {
          for (let n = 0; n < players.length; n++) {
            deck[n].image.src = '/images/tapp/' + deck[n].card[0] + deck[n].card[1] + '.png';
          }
        }
      }
      if (stats[player][5] == "Overconfidence") {
        if (stats[player][6] < 5 && stats[player][6] + i * 2 > 4) {
          stats[player][2] -= 2;
          stats[player][3] += 2;
        }
      }
      if (protections[player].includes("JK1")) {
        stats[player][2] -= 2;
      }
      if (stats[player][5] == "Castle Armory") {
        stats[player][3] += 1;
      }
      if (protections[player].includes("MC3")) {
        stats[player][2] -= 1;
        stats[player][3] -= 1;
        stats[player][4] -= 20;
      }
      if (protections[player].includes("WC1")) {
        stats[player][3] -= 4;
      }
      while (protections[player].includes("ES")) {
        stats[player][2] -= 5;
        protections[player].splice(protections[player].indexOf("ES"), 1);
      }
      protections[player].some(item => { if (isNaN(item) && item.includes("WC2")) {
        stats[player][3] += parseInt(item.slice(3));
      }});
      protections[player].some(item => { if (isNaN(item) && item.includes("RR2")) {
        stats[player][3] -= parseInt(item.slice(3));
      }});
    }
    protections = [...Array(players.length)].map(e => Array(0));
    for (let i = 0; i < protections.length; i++) {
      if (stats[i][5] == "Nimble Feet") {
        protections[i].push(0);
      }
    }
    log("The deck was reshuffled!");
    if (stats[hand - 1][0] != "Knight") {
      tokens.push(event.data.split(";;")[1].split(";")[hand - 1].split(","));
    }
    for (let i = 0; i < stats.length; i++) {
      if (stats[i][0] == "Knight") {
        token(i, parseInt(event.data.split(";;")[1].split(";")[i].split(",")));
      }
    }
  } else if (event.data.startsWith("Bounty")) {
    let pNum = parseInt(event.data.slice(6, 7)) - 1;
    let bCard = parseInt(event.data.slice(7, 8));
    let pos = parseInt(event.data.slice(8, 9));
    let modHand = pNum - hand + 2 + (pNum - hand < -1 ? players.length : 0);
    deck[bCard].grab(modHand);
    hands[pNum].push(deck[bCard]);
    for (let i = 0; i < hands[pNum].length; i++) {
      hands[pNum][i].separate(hands[pNum].length, i + 1);
    }
    deck[bCard] = null;
    if (pos == deck[deck.length - 1] - 1) {
      for (let n = 0; n < players.length; n++) {
        if (deck[n] != null) {
          deck[n].image.src = '/images/tapp/' + deck[n].card[0] + deck[n].card[1] + '.png';
        }
      }
    }
    if (pos == deck[deck.length - 1]) {
      for (let n = 0; n < players.length; n++) {
        if (deck[n] != null) {
          deck[n].image.src = '/images/back.png';
        }
      }
    }
    if (pos == players.length - 1) {
      sortStats = stats.map(arr => arr.slice());
      for (let i = 0; i < sortStats.length; i++) {
        sortStats[i].push(i);
      }
      sortStats.sort(function(a, b) {
        return b[4] - a[4];
      });
      for (let i = 0; i < sortStats.length; i++) {
        sortStats[i] = sortStats[i][7];
      }
      for (let i = 0; i < sortStats.length; i++) {
        if (sortStats[i] == hand - 1) {
          sortStats.splice(i, 1);
          target = i < sortStats.length ? i : 0;
          break;
        }
      }
      deck.splice(0, players.length);
      deck.pop();
    }
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
  if (Array.isArray(deck)) {
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
      window.requestAnimationFrame(drawCreate);
    }
  }
  if (between(event.offsetX, width * 0.3, width / 4)) {
    if (between(event.offsetY, height * 0.7875, height / 8)) {
      canvas.removeEventListener("click", onCreateClick);
      window.removeEventListener("keydown", onCreatePress);
      makeDeck();
    }
  }
}

function onCreatePress(event) {
  if (parseInt(event.key) > 1 && parseInt(event.key) < 6) {
    options[0] = parseInt(event.key);
  }
  window.requestAnimationFrame(drawCreate);
}

let options = [4, 0];
function drawCreate() {
  rect(width / 2, height / 2, width, height, "#64c8dc");
  rect(width / 2, height / 2, width * 0.8, height * 0.8, "#c8f0ff");
  rect(width * 0.7, height / 2, width * 0.35, height * 0.7);
  rect(width * 0.3, height * 0.7875, width / 4, height / 8);
  text("How to Play", width * 0.7, height * 0.25, fontSize / 10);
  text("Be the last person with Life Points\nby battling and eliminating your\nopponents!", width * 0.7, height * 0.45, fontSize / 16);
  text("TAPP", width * 0.3, height / 5, fontSize / 8);
  text("Start", width * 0.3, height * 0.7875, fontSize / 14);
  text("Players: " + options[0], width * 0.3, height * 0.35, fontSize / 14);
  if (options[1] % 2 == 0) {
    text("Jokers: On", width * 0.3, height * 0.45, fontSize / 14);
  } else {
    text("Jokers: Off", width * 0.3, height * 0.45, fontSize / 14);
  }
}

function setUpGame(data) {
  played = [[], []];
  data = data.split(";;");
  deck = data[0];
  players = [];
  for (let i = 0; i < parseInt(data[1]); i++) {
    players.push("P" + (i + 1));
  }
  clicked = [null, false, null, null];
  hand = parseInt(deck.slice(0, 2));
  hands = [...Array(players.length)].map(e => Array(0));
  stats = [...Array(players.length)].map(e => [0, 100, 0, 0, 0, "Empowered Strikes", 0]);
  tokens = [...Array(players.length)].map(e => [0, 0, 0, 0]);
  protections = [...Array(players.length)].map(e => Array(0));
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
  if (between(event.offsetX, width / 5, width / 6)) {
    for (let i = 0; i < 4; i++) {
      if (between(event.offsetY, height * (0.319 + i * 0.134), height * 0.12)) {
        stats[hand - 1][5] = "Empowered Strikes";
        stats[hand - 1][0] = i;
      }
    }
  }
  if (between(event.offsetX, width * 0.4, width / 7)) {
    for (let i = 2; i >= -2; i--) {
      if (between(event.offsetY, height * (0.52 - i * 8 / 75), height * 0.09)) {
        stats[hand - 1][2] = i;
      }
    }
  }
  if (between(event.offsetX, width * 0.7, width * 0.37)) {
    for (let i = 0; i < 3; i++) {
      if (between(event.offsetY, height * (0.34 + i * 0.18), height * 0.17)) {
        if (i == 2) {
          stats[hand - 1][5] = "Empowered Strikes";
        } else {
          stats[hand - 1][5] = abilities[stats[hand - 1][0]][i].split(":")[0];
        }
      }
    }
  }
  if (between(event.offsetX, width * 0.775, width / 4)) {
    if (between(event.offsetY, height * 0.86, height / 10)) {
      window.removeEventListener("keydown", onClassPress);
      canvas.removeEventListener("click", onClassClick);
      let playerStats = "User" + hand;
      stats[hand - 1][3] = 2 - stats[hand - 1][2] + classBuffs[1][stats[hand - 1][0]];
      stats[hand - 1][4] = 30 - Math.abs(stats[hand - 1][2]) * 15 + classBuffs[2][stats[hand - 1][0]];
      stats[hand - 1][2] += classBuffs[0][stats[hand - 1][0]];
      stats[hand - 1][0] = classes[stats[hand - 1][0]];
      if (stats[hand - 1][5] == "Castle Armory") {
        stats[hand - 1][3] += 1;
      }
      if (stats[hand - 1][5] == "Overconfidence") {
        stats[hand - 1][2] += 2;
      }
      for (let i = 0; i < stats[hand - 1].length - 1; i++) {
        playerStats += ";" + stats[hand - 1][i];
      }
      playerStats += ";10";
      if (players[hand - 1] == "") {
        players[hand - 1] = "P" + hand;
      }
      if (stats[hand - 1][0] == "Mage") {
        playerStats += ";" + Math.floor(Math.random() * 8);
      }
      if (stats[hand - 1][5] == "Hoarding") {
        playerStats += ";" + Math.floor(Math.random() * 4) + ";" + (Math.floor(Math.random() * 4) + 4);
      }
      if (stats[hand - 1][5] == "Magical Quiver") {
        playerStats += ";2;" + stats[hand - 1][6];
      }
      stats[hand - 1][0] = 0;
      ws.send(gameID + playerStats + ";;" + players[hand - 1]);
      startGame();
      return;
    }
  }
  if (between(event.offsetX, width * 0.95, width * 0.09)) {
    for (let i = 0; i < 8; i++) {
      if (between(event.offsetY, height * (0.275 + i * 0.07), height * 0.06)) {
        stats[hand - 1][6] = i;
      }
    }
  }
  window.requestAnimationFrame(drawClass);
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
  rect(width / 5, height * 0.52, width / 5, height * 0.55, "#c8f0ff");
  rect(width / 5, height * 0.16, width / 5, height * 0.14, "#c8f0ff");
  text("Class", width * 0.2, height * 0.16, fontSize / 15);
  rect(width * 0.4, height * 0.52, width / 6, height * 0.55, "#c8f0ff");
  rect(width * 0.4, height * 0.16, width / 6, height * 0.14, "#c8f0ff");
  text("Attack", width * 0.4, height * 0.16, fontSize / 15);
  rect(width * 0.7, height * 0.52, width / 2.5, height * 0.55, "#c8f0ff");
  rect(width * 0.7, height * 0.16, width / 2.5, height * 0.14, "#c8f0ff");
  text("Ability", width * 0.7, height * 0.16, fontSize / 15);
  for (let i = 0; i < 4; i++) {
    let color = stats[hand - 1][0] == i ? "#ff0000" : "#000000";
    rect(width / 5, height * (0.319 + i * 0.134), width / 6, height * 0.12, colors[classes[i]]);
    text(classes[i], width / 5, height * (0.319 + i * 0.134), fontSize / 20, color);
  }
  for (let i = 2; i >= -2; i--) {
    let color = stats[hand - 1][2] == i ? "#ff0000" : "#000000";
    rect(width * 0.4, height * (0.52 - i * 8 / 75), width / 7, height * 0.09, "#ffffff");
    text(i, width * 0.4, height * (0.52 - i * 8 / 75), fontSize / 20, color);
  }
  let abilityList = [abilities[stats[hand - 1][0]][0], abilities[stats[hand - 1][0]][1], abilities[4]];
  for (let i = 0; i < 3; i++) {
    let color = abilityList[i].includes(stats[hand - 1][5]) ? "#ff0000" : "#000000";
    rect(width * 0.7, height * (0.34 + i * 0.18), width * 0.37, height * 0.17, "#ffffff");
    text(abilityList[i], width * 0.7, height * (0.34 + i * 0.18), fontSize / 20, color);
  }
  if (stats[hand - 1][5] == "Magical Quiver") {
    rect(width * 0.95, height * 0.195, width * 0.09, height * 0.07, "#c8f0ff");
    text("Bonus", width * 0.95, height * 0.195);
    for (let i = 0; i < 8; i++) {
      let color = stats[hand - 1][6] == i ? "#ff0000" : "#000000";
      rect(width * 0.95, height * (0.275 + i * 0.07), width * 0.09, height * 0.06);
      text(tokenNames[i], width * 0.95, height * (0.275 + i * 0.07), fontSize / 25, color);
    }
  }
  let armor = 2 - stats[hand - 1][2] + classBuffs[1][stats[hand - 1][0]];
  let speed = 30 - Math.abs(stats[hand - 1][2]) * 15 + classBuffs[2][stats[hand - 1][0]];
  let dmg = stats[hand - 1][2] + classBuffs[0][stats[hand - 1][0]];
  rect(width * 0.2, height * 0.86, width * 0.2, height * 0.1, "#c8f0ff");
  rect(width * 0.475, height * 0.86, width * 0.34, height * 0.1, "#c8f0ff");
  rect(width * 0.775, height * 0.86, width * 0.25, height * 0.1, "#ffffff");
  text("Damage: " + dmg, width * 0.39, height * 0.86, fontSize / 20);
  text("Armor: " + armor, width * 0.475, height * 0.86);
  text("Speed: " + speed, width * 0.56, height * 0.86);
  text("Game ID: " + gameID, width * 0.2, height * 0.86);
  text("Continue as " + players[hand - 1], width * 0.775, height * 0.86);
}

function startGame() {
  window.onresize = function() {
    [deck, played[0]].concat(hands).forEach(elem => {
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
  let lisDeck = deck.slice(2).split(";").map(function(x) {
    return x.split(",");
  });
  deck = [];
  for (let i = 0; i < lisDeck.length; i++) {
    deck.push(new Card(lisDeck[i][0], lisDeck[i][1]));
  }
  for (let i = 0; i < 3; i++) {
    played[1].push(deck.pop());
    played[1][i].image.src = '/images/tapp/' + played[1][i].card[0] + played[1][i].card[1] + '.png';
  }
  for (let i = 0; i < hands.length; i++) {
    for (let n = 0; n < 5; n++) {
      deck[deck.length - 1].grab(i - hand + 2 + (i - hand < -1 ? players.length : 0));
      hands[i].push(deck.pop());
    }
    for (let n = 0; n < hands[i].length; n++) {
      hands[i][n].separate(hands[i].length, n + 1);
    }
  }
  canvas.addEventListener("click", onGameClick);
  window.addEventListener("keydown", onGamePress);
  window.requestAnimationFrame(drawGame);
}

function onGameClick(event) {
  for (let i = 0; i < hands.length; i++) {
    if (hands[i].length > 0 && i != hand - 1) {
      let cX, cY, cW, cH;
      if (hands[i][0].side % 2 == 0) {
        cY = hands[i][0].offset;
        cX = hands[i][0].x;
        cW = width / 9;
        if (hands[i].length > 8) {
          cH = (hands[i].length - 1) * height / 2 / hands[i].length + height / 4.5;
        } else {
          cH = (hands[i].length - 1) * height / 16 + height / 4.5;
        }
      } else {
        cX = hands[i][0].offset;
        cY = hands[i][0].y;
        cH = height / 4.5;
        if (hands[i].length > 8) {
          cW = (hands[i].length - 1) * width / 2 / hands[i].length + width / 9;
        } else {
          cW = (hands[i].length - 1) * width / 16 + width / 9;
        }
      }
      if (between(event.offsetX, cX, cW)) {
        if (between(event.offsetY, cY, cH)) {
          let clickCard = clicked[0] != null ? clicked[0].card[0] + clicked[0].card[1] : null;
          if (clickCard == "MR2") {
            for (let i = 0; i < played[0].length; i++) {
              if (played[0][i].card[0] + played[0][i].card[1] != "MR2" && !played[0][i].skip) {
                clickCard = played[0][i].card[0] + played[0][i].card[1];
                break;
              }
            }
          }
          if (clickCard == "SE1" && protections.length == players.length) {
            ws.send(gameID + "Play:" + hand + clicked[0].card[0] + clicked[0].card[1] + sortStats[target] + i);
            target += 1;
            if (target >= sortStats.length) {
              target -= sortStats.length;
            }
          } else {
            clicked[2] = clicked[2] == i ? null : i;
            window.requestAnimationFrame(drawGame);
          }
        }
      }
    }
    if (between(event.offsetX, 7 * width / 8, width / 4)) {
      if (between(event.offsetY, height / 15 * (i + 2), height / 15)) {
        let clickCard = clicked[0] != null ? clicked[0].card[0] + clicked[0].card[1] : null;
        if (clickCard == "MR2") {
          for (let i = 0; i < played[0].length; i++) {
            if (played[0][i].card[0] + played[0][i].card[1] != "MR2" && !played[0][i].skip) {
              clickCard = played[0][i].card[0] + played[0][i].card[1];
              break;
            }
          }
        }
        if (clickCard == "SE1" && protections.length == players.length) {
          ws.send(gameID + "Play:" + hand + clicked[0].card[0] + clicked[0].card[1] + sortStats[target] + i);
          target += 1;
          if (target >= sortStats.length) {
            target -= sortStats.length;
          }
        } else {
          clicked[2] = clicked[2] == i ? null : i;
          window.requestAnimationFrame(drawGame);
        }
      }
    }
  }
  for (let i = 0; i < players.length; i++) {
    if (!isNaN(stats[i][0])) {
      return;
    }
  }
  if (protections.length > players.length && protections[0][0] != hand - 1) {
    log(colorsDark[stats[protections[0][0]][0]] + players[protections[0][0]] + " #000000is using a Recycle Token.");
    return;
  }
  if (tokens.length > players.length) {
    for (let i = 0; i < 3; i++) {
      if (between(event.offsetX, width * 0.45, width * 0.3)) {
        if (between(event.offsetY, height * (0.35 + i * 0.15), height * 0.125)) {
          ws.send(gameID + "Token:G" + hand + tokens[tokens.length - 1][i]);
        }
      }
    }
    return;
  }
  if (!isNaN(deck[deck.length - 1])) {
    let nullCount = 0;
    for (let i = 0; i < players.length; i++) {
      if (deck[i] == null) {
        nullCount++;
      }
    }
    for (let i = 0; i < players.length; i++) {
      if (between(event.offsetX, width * ((2 * i - players.length + 6.625) / 15), width / 8)) {
        if (between(event.offsetY, height / 2, height / 4)) {
          if (nullCount == deck[deck.length - 1]) {
            ws.send(gameID + "Bounty" + hand + i + deck[deck.length - 1]);
          }
        }
      }
    }
    return;
  }
  [clicked[0]].concat([...hands[hand - 1]].reverse()).some(card => {
    if (card != undefined) {
      if (between(event.offsetX, card.x, width / 8)) {
        if (between(event.offsetY, card.y, height / 4)) {
          if (clicked[0] != card) {
            clicked[0] = card;
          } else {
            clicked[0] = null;
            clicked[1] = false;
          }
          window.requestAnimationFrame(drawGame);
          return true;
        }
      }
    }
  });
  if (between(event.offsetX, 59 * width / 64, 3 * width / 32)) {
    for (let i = 0; i < 3; i++) {
      if (between(event.offsetY, height * (7 + i) / 15 + fontSize / 80, fontSize / 20)) {
        if (tokens[hand - 1][i] > 0) {
          clicked[3] = clicked[3] == i ? null : i;
          window.requestAnimationFrame(drawGame);
        }
      }
    }
  }
  if (between(event.offsetX, 7 * width / 8, width / 6)) {
    if (between(event.offsetY, 5 * height / 6, height / 12)) {
      if (protections.length > players.length) {
        log("#000000You may not play while using a Recycle Token!");
      } else if (clicked[3] == 1 || clicked[3] == 2) {
        ws.send(gameID + "Token:P" + hand + clicked[3]);
        clicked[3] = null;
      } else if (clicked[3] == 0) {
        ws.send(gameID + "Token:P" + hand + clicked[3] + clicked[0].card[0] + clicked[0].card[1]);
        clicked[3] = null;
      } else if (clicked[0] == null && stats[hand - 1][5] == "Nimble Feet" && !isNaN(protections[hand - 1][0])) {
        ws.send(gameID + "Token:P" + hand + 3 + protections[hand - 1][0]);
      } else if (clicked[0] != null) {
        let clickCard = clicked[0].card[0] + clicked[0].card[1];
        if (clickCard == "MR2") {
          for (let i = 0; i < played[0].length; i++) {
            if (played[0][i].card[0] + played[0][i].card[1] != "MR2" && !played[0][i].skip) {
              clickCard = played[0][i].card[0] + played[0][i].card[1];
              break;
            }
          }
        }
        let vars = getVars(clicked[0], hand - 1, sortStats[target]);
        if (clickCard == "MC2") {
          if (between(event.offsetX, 551 * width / 600, width * 0.08)) {
            vars = "E";
          }
        } else if (clickCard == "SE1") {
          return;
        }
        ws.send(gameID + "Play:" + hand + clicked[0].card[0] + clicked[0].card[1] + sortStats[target] + vars);
        target += 1;
        if (target >= sortStats.length) {
          target -= sortStats.length;
        }
      }
    }
  }
  if (between(event.offsetX, 7 * width / 8, width / 6)) {
    if (between(event.offsetY, 5 * height / 7, height / 12)) {
      let message;
      if (clicked[0] == null) {
        for (let i = 0; i < hands.length; i++) {
          if (hands[i].length > 3) {
            log("#000000All players must have three cards to reshuffle!");
            return;
          }
        }
        deck = shuffle(played[0].concat(played[1]).concat(deck));
        message = "Shuffle:";
        for (let i = 0; i < deck.length; i++) {
          if (deck[i] != null && !deck[i].dupe) {
            message += deck[i].card[0] + "," + deck[i].card[1] + ";";
          }
        }
        for (let i = 0; i < players.length; i++) {
          let randTokens = [];
          while (randTokens.length < 3){
            let r = Math.floor(Math.random() * 8);
            if (randTokens.indexOf(r) == -1) {
              randTokens.push(r);
            }
          }
          message += ";" + randTokens[0] + "," + randTokens[1] + "," + randTokens[2];
        }
      } else {
        if (protections.length > players.length && protections[0][1] >= 3) {
          log("#000000You may only discard up to three with a Recycle Token!");
        } else if (protections.length > players.length && protections[0][2] > 0) {
          log("#000000You may not discard after drawing while using a Recycle Token!");
        } else {
          message = "Play:" + hand + clicked[0].card[0] + clicked[0].card[1] + "D";
        }
      }
      ws.send(gameID + message);
    }
  }
  if (between(event.offsetX, 11 * width / 36, width / 9)) {
    if (between(event.offsetY, 13 * height / 36, 2 * height / 9)) {
      if (hands[hand - 1].length < 5) {
        ws.send(gameID + "Grab:" + hand + 0);
      } else {
        log("#000000Your hand is full!");
      }
    }
  }
  for (let i = 1; i < 4; i++) {
    if (between(event.offsetX, width * (i + 1) / 8, width / 9)) {
      if (between(event.offsetY, 343 * height / 576, 2 * height / 9)) {
        if (hands[hand - 1].length < 5) {
          ws.send(gameID + "Grab:" + hand + i);
        } else {
          log("#000000Your hand is full!");
        }
      }
    }
  }
}

function onGamePress(event) {
  if (event.key == " ") {
    if (clicked[1]) {
      clicked[1] = false;
    } else if (clicked[0] != null) {
      clicked[1] = true;
    }
    window.requestAnimationFrame(drawGame);
  }
}

function checkBarrier(aim) {
  if (protections[aim].includes("SC3")) {
    protections[aim].splice(protections[aim].indexOf("SC3"), 1);
    log("> " + colorsDark[stats[aim][0]] + players[aim] + "'s #000000 Soul Barrier blocked the ability!");
    return true;
  } else {
    return false;
  }
}

function checkBlock(aim) {
  if (protections[aim].includes("WR1")) {
    protections[aim].splice(protections[aim].indexOf("WR1"), 1);
    log("> " + colorsDark[stats[aim][0]] + players[aim] + "'s #000000 Thick Cleaver blocked the attack!");
  } else if (protections[aim].includes("EL") && !protections[aim].includes("ELD")) {
    log("> " + colorsDark[stats[aim][0]] + players[aim] + "'s #000000 Enchanted Lifeline protected them!");
  } else if (protections[aim].includes("JA1")) {
    protections[aim].splice(protections[aim].indexOf("JA1"), 1);
    log("> " + colorsDark[stats[aim][0]] + players[aim] + "'s #000000 Super Speed dodged the attack!");
  } else {
    return false;
  }
  return true;
}

class Card {
  constructor(suit, num) {
    this.card = [suit, num];
    this.hand = 0;
    this.x = 11 * width / 36;
    this.y = height / 2;
    this.side = 0;
    this.image = new Image();
    this.image.src = '/images/back.png';
    this.image.onload = function() {
      window.requestAnimationFrame(drawGame);
    };
  }

  grab(newHand) {
    let cardPos = [[1, 1, 1, 1, 1, 1, 1], [0, 1, 1, 1, 2, 2], [1, 0, 1, 2, 1, 2], [0, 1, 1, 1, 2, 2]];
    let handPos = [[3 * width / 8, 27 * height / 32], [width / 16, height / 2],
                  [3 * width / 8, height / 8], [11 * width / 16, height / 2]];
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
      this.image.src = '/images/tapp/' + this.card[0] + this.card[1] + '.png';
    } else {
      this.image.src = '/images/back.png';
    }
    window.requestAnimationFrame(drawGame);
  }

  separate(total, num) {
    if (this.side % 2 == 0) {
      if (total > 8) {
        this.y = this.offset + ((total + 1) / 2 - num) * height / 2 / total;
      } else {
        this.y = this.offset + ((total + 1) / 2 - num) * height / 16;
      }
    } else {
      if (total > 8) {
        this.x = this.offset + ((total + 1) / 2 - num) * width / 2 / total;
      } else {
        this.x = this.offset + ((total + 1) / 2 - num) * width / 16;
      }
    }
  }

  play(player, aim, vars="") {
    if (player == hand) {
      clicked[0] = null;
      clicked[1] = false;
    }
    this.x = 4 * width / 9;
    this.y = height / 2;
    this.image.src = '/images/tapp/' + this.card[0] + this.card[1] + '.png';
    played[0].unshift(this);
    if (aim == "D" || player == 0) {
      this.skip = true;
      log(colorsDark[stats[player - 1][0]] + players[player - 1] + "#000000 discarded a " + cards[this.card[0] + this.card[1]]);
      if (protections.length > players.length) {
        protections[0][1] += 1;
      }
      return;
    }
    if (this.card[0] + this.card[1] == "JJ1") {
      this.skip = true;
    }
    ability(this.card, player - 1, parseInt(aim), vars);
  }
}

function getVars(card, player, aim) {
  let vars = "";
  let cardID = card.card[0] + card.card[1];
  if (cardID == "MR2") {
    for (let i = 0; i < played[0].length; i++) {
      if (played[0][i].card[0] + played[0][i].card[1] != "MR2" && !played[0][i].skip) {
        cardID = played[0][i].card[0] + played[0][i].card[1];
        break;
      }
    }
  }
  if (cardID == "MM1") {
    vars = Math.floor(Math.random() * (hands[aim].length));
  } else if (cardID == "ME1") {
    let cHands = hands.map(function(arr) {
        return arr.slice();
    });
    cHands[player].splice(cHands[player].indexOf(card), 1);
    let orbs = [player];
    for (let i = 0; i < cHands.length; i++) {
      cHands[i].forEach(function(c) {
        if (c.card[0] + c.card[1] == "JJ1") {
          cHands[i].splice(cHands[i].indexOf(c), 1);
        }
      });
    }
    for (let t = 0; t < orbs.length; t++) {
      for (let i = 0; i < stats.length; i++) {
        if (cHands[i].length > 0 && i != orbs[t]) {
          let nCard = cHands[i][Math.floor(Math.random() * (cHands[i].length))];
          let cardID = nCard.card[0] + nCard.card[1];
          if (["ME1", "MR2"].includes(cardID)) {
            vars += i + "," + cardID + ",;";
            orbs.push(i);
          } else {
            let cVars = getVars(new Card(nCard.card[0], nCard.card[1]), i, i);
            if (nCard.card[0] + nCard.card[1] == "MC2") {
              cVars = "E";
            } else if (cardID == "SE1") {
              cVars = orbs[t];
            }
            vars += i + "," + cardID + "," + cVars + ";";
          }
          cHands[i].splice(cHands[i].indexOf(nCard), 1);
        }
      }
    }
  } else if (cardID == "JJ1") {
    if (stats[player][0] == "Mage") {
      vars = Math.floor(Math.random() * 4) + ";" + (4 + Math.floor(Math.random() * 4));
    }
  }
  return vars;
}

function ability(card, player, aim, vars="", silent=false) {
  if (!silent) {
    if (player == aim) {
      log("> " + colorsDark[stats[player][0]] + players[player] + "#000000 hit themself with " + cards[card[0] + card[1]]);
    } else if (card[0] + card[1] == "MC2" && vars == "E") {
      log(colorsDark[stats[player][0]] + players[player] + "#000000 ate their Mushroom on a Stick");
    } else if (card[0] + card[1] == "JJ1") {
      log(colorsDark[stats[player][0]] + players[player] + "#000000 used " + incantationNames[classes.indexOf(stats[player][0])]);
    } else {
      log(colorsDark[stats[player][0]] + players[player] + "#000000 hit " + colorsDark[stats[aim][0]] + players[aim] + "#000000 with " + cards[card[0] + card[1]]);
    }
  }
  if (card[0] == "M") {
    if (card[1] == "C1") {
      dmg(9 + (checkBarrier(aim) ? 0 : stats[aim][3]), player, aim, card, true);
    } else if (card[1] == "C2") {
      if (vars == "E") {
        stats[player][1] += 10;
      } else {
        dmg(12, player, aim, card, true);
      }
    } else if (card[1] == "C3") {
      dmg(9, player, aim, card, true);
      stats[player][2] += 1;
      stats[player][3] += 1;
      stats[player][4] += 20;
      protections[player].push("MC3");
    } else if (card[1] == "R1") {
      dmg(12, player, aim, card, true);
      protections[player].push("MR1");
    } else if (card[1] == "R2") {
      let last;
      let found = false;
      for (let i = 1; i < played[0].length; i++) {
        if (played[0][i].card[0] + played[0][i].card[1] != "MR2" && !played[0][i].skip) {
          last = [played[0][i].card[0] + played[0][i].card[1], i];
          found = true;
          break;
        }
      }
      if (!found) {
        dmg(11, player, aim, card, true);
        return;
      }
      if (vars != "E") {
        dmg(11, player, aim, card, true);
      }
      if (last[0] == "MC1") {
        if (!checkBarrier(aim)) {
          stats[player][1] -= stats[player][3];
        }
      } else if (last[0] == "ME1") {
        ability([last[0].slice(0, 1), last[0].slice(1)], player, aim, vars, true);
      } else if (last[0] == "WC2") {
        if (!checkBarrier(aim)) {
          protections[aim].push("WC2" + stats[aim][3]);
          stats[aim][3] = 0;
          if (stats[aim][5] == "Royal Aura") {
            stats[aim][1] -= stats[aim][3];
          }
        }
      } else if (last[0] == "WR2") {
        if (!checkBarrier(aim)) {
          stats[aim][1] -= 2 * Math.floor(stats[player][3] / 2);
        }
      } else if (last[0] == "WE1") {
        for (let i = 0; i < stats.length; i++) {
          if (i != player) {
            if (!checkBarrier(i)) {
              stats[i][1] -= 5 + Math.floor(stats[player][3] / 2);
            }
          }
        }
      } else if (last[0] == "RC1") {
        for (let i = 0; i < stats.length; i++) {
          if (i != aim && stats[i][4] < stats[player][4]) {
            if (!checkBarrier(i)) {
              dmg(11, player, i, card, true);
            }
          }
        }
      } else if (last[0] == "RC2") {
        if (!checkBarrier(aim)) {
          stats[aim][1] -= Math.floor(stats[player][4] / 15);
        }
      } else if (last[0] == "RC3") {
        if (!checkBarrier(aim)) {
          stats[aim][1] -= 11 + stats[player][2] + (stats[player][0] == "Mage" ? 2 : 0);
        }
      } else if (last[0] == "RE1") {
        if (!checkBarrier(aim)) {
          if (stats[aim][5] == "Royal Aura") {
            stats[aim][1] -= stats[aim][3];
          }
          for (let i = 0; i < Math.floor(stats[player][4] / 30) + 1; i++) {
            stats[aim][1] -= 11 + stats[player][2] + (stats[player][0] == "Mage" ? 2 : 0);
          }
        }
      } else if (last[0] == "RM1") {
        for (let i = 0; i < stats.length; i++) {
          if (i != player) {
            if (!checkBarrier(i)) {
              stats[player][1] -= 2 + Math.floor(stats[player][4] / 10);
            }
          }
        }
      } else if (last[0] == "SC2") {
        for (let i = 0; i < stats.length; i++) {
          if (i != player) {
            if (!checkBarrier(i)) {
              dmg(3, player, i, card, true);
            }
          }
        }
      } else if (last[0] == "SR1") {
        let total = 11 + stats[player][2] + (stats[player][0] == "Mage" ? 2 : 0);
        stats[player][1] += Math.floor(total / 2);
      } else if (last[0] == "SR2") {
        if (11 + stats[player][2] + (stats[player][0] == "Mage" ? 2 : 0) > 14) {
          for (let i = 0; i < stats.length; i++) {
            if (i != player) {
              if (!checkBarrier(i)) {
                dmg(4, player, i, card, true);
              }
            }
          }
        }
      } else if (last[0] == "SE1") {
        if (!checkBarrier(aim)) {
          dmg(11, player, parseInt(vars), card, true);
        }
      } else {
        let targetHP = stats[aim][1];
        ability([last[0].slice(0, 1), last[0].slice(1)], player, aim, vars, true);
        stats[aim][1] = targetHP;
      }
    } else if (card[1] == "E1") {
      vars = vars.split(";").slice(0, -1);
      protections.some(item => { if (isNaN(item) && item.includes("SC1")) {
        if (!(checkBarrier(aim) || checkBlock(aim))) {
          stats[aim][1] -= 4;
          item.splice(item.indexOf("SC1"), 1);
        }
      }});
      for (let h = 0; h < vars.length; h++) {
        let cVar = vars[h].split(",");
        cVar[0] = parseInt(cVar[0]);
        if (checkBarrier(cVar[0])) {
          continue;
        }
        for (let i = 0; i < hands[cVar[0]].length; i++) {
          let pCard = hands[cVar[0]][i];
          if (cVar[1] == pCard.card[0] + pCard.card[1]) {
            if (cVar[0] == hand - 1) {
              clicked[0] = null;
              clicked[1] = false;
            }
            pCard.x = 4 * width / 9;
            pCard.y = height / 2;
            pCard.image.src = '/images/tapp/' + pCard.card[0] + pCard.card[1] + '.png';
            played[0].push(pCard);
            ability(pCard.card, cVar[0], cVar[0], cVar[2]);
            hands[cVar[0]].splice(i, 1);
            message(new MessageEvent("message", { data: "Grab:" + (cVar[0] + 1) + 0 }));
            break;
          }
        }
      }
    } else if (card[1] == "M1") {
      dmg(17, player, aim, card, true);
      if (aim != player && hands[aim].length > 0 && !checkBarrier(aim)) {
        let steal = parseInt(vars);
        let newCard = new Card(hands[aim][steal].card[0], hands[aim][steal].card[1]);
        newCard.grab(player - hand + (player - hand < -1 ? players.length + 2 : 2));
        hands[aim].splice(steal, 1);
        hands[player].push(newCard);
        message(new MessageEvent("message", { data: "Grab:" + (aim + 1) + 0 }));
      }
    }
  } else if (card[0] == "W") {
    if (card[1] == "C1") {
      dmg(11, player, aim, card);
      stats[player][3] += 4;
      protections[player].push("WC1");
    } else if (card[1] == "C2") {
      if (!checkBarrier(aim)) {
        protections[aim].push("WC2" + stats[aim][3]);
        stats[aim][3] = 0;
      }
      dmg(12, player, aim, card);
    } else if (card[1] == "C3") {
      dmg(11, player, aim, card);
      stats[player][1] += stats[player][3];
    } else if (card[1] == "R1") {
      dmg(12, player, aim, card);
      protections[player].push("WR1");
    } else if (card[1] == "R2") {
      let extra = checkBarrier(aim) ? 0 : 2 * Math.floor(stats[player][3] / 2);
      dmg(13 + extra, player, aim, card);
    } else if (card[1] == "E1") {
      dmg(7, player, aim, card);
      for (let i = 0; i < stats.length; i++) {
        if (i != player) {
          if (!(checkBarrier(i) || checkBlock(i))) {
            stats[i][1] -= 5 + Math.floor(stats[player][3] / 2);
            while (protections[i].includes("MR1")) {
              if (!(checkBarrier(player) || checkBlock(player))) {
                for (let n = 0; n < hands[i].length; n++) {
                  if (hands[i][n].card[0] == "M") {
                    stats[player][1] -= 3;
                  }
                }
              }
              protections[i].splice(protections[i].indexOf("MR1"), 1);
            }
          }
        }
      }
    } else if (card[1] == "M1") {
      dmg(18, player, aim, card);
      stats[player][1] += 10 + stats[player][3];
    }
  } else if (card[0] == "R") {
    if (card[1] == "C1") {
      dmg(10, player, aim, card);
      for (let i = 0; i < stats.length; i++) {
        if (i != aim && stats[i][4] < stats[player][4]) {
          if (!checkBarrier(i)) {
            dmg(10, player, i, card);
          }
        }
      }
    } else if (card[1] == "C2") {
      let extra = checkBarrier(aim) ? 0 : Math.floor(stats[player][4] / 15);
      dmg(11 + extra, player, aim, card);
    } else if (card[1] == "C3") {
      let total = stats[player][2] + (stats[player][0] == "Archer" ? 8 : 6);
      dmg(6 + (checkBarrier(aim) ? 0 : total), player, aim, card);
    } else if (card[1] == "R1") {
      dmg(12, player, aim, card);
      protections[player].push("RR1");
    } else if (card[1] == "R2") {
      let bonus = Math.floor(stats[player][4] / 10);
      dmg(12, player, aim, card);
      stats[player][3] += bonus;
      protections[player].push("RR2" + bonus);
    } else if (card[1] == "E1") {
      if (checkBarrier(aim)) {
        dmg(6, player, aim, card);
      } else {
        for (let i = 0; i < Math.floor(Math.max(stats[player][4], 0) / 30) + 2; i++) {
          dmg(6, player, aim, card, true);
        }
      }
    } else if (card[1] == "M1") {
      dmg(19, player, aim, card);
      for (let i = 0; i < stats.length; i++) {
        if (i != player) {
          if (!(checkBarrier(i) || checkBlock(i))) {
            stats[i][1] -= 2 + Math.floor(stats[player][4] / 10);
            while (protections[i].includes("MR1")) {
              if (!(checkBarrier(player) || checkBlock(player))) {
                for (let n = 0; n < hands[i].length; n++) {
                  if (hands[i][n].card[0] == "M") {
                    stats[player][1] -= 3;
                  }
                }
              }
              protections[i].splice(protections[i].indexOf("MR1"), 1);
            }
          }
        }
      }
    }
  } else if (card[0] == "S") {
    if (card[1] == "C1") {
      dmg(12, player, aim, card);
      protections[player].push("SC1");
    } else if (card[1] == "C2") {
      dmg(11, player, aim, card);
      for (let i = 0; i < stats.length; i++) {
        if (i != player) {
          if (!(checkBarrier(i) || checkBlock(i))) {
            stats[i][1] -= 3;
            while (protections[i].includes("MR1")) {
              if (!(checkBarrier(player) || checkBlock(player))) {
                for (let n = 0; n < hands[i].length; n++) {
                  if (hands[i][n].card[0] == "M") {
                    stats[player][1] -= 3;
                  }
                }
              }
              protections[i].splice(protections[i].indexOf("MR1"), 1);
            }
          }
        }
      }
    } else if (card[1] == "C3") {
      dmg(12, player, aim, card);
      protections[player].push("SC3");
    } else if (card[1] == "R1") {
      let total = 15 + stats[player][2] + (stats[player][0] == "Warlock" ? 2 : 0);
      stats[player][1] += Math.floor(total / 2);
      dmg(15, player, aim, card);
    } else if (card[1] == "R2") {
      if (14 + stats[player][2] + (stats[player][0] == "Warlock" ? 2 : 0) > 14) {
        for (let i = 0; i < stats.length; i++) {
          if (i != player) {
            if (!(checkBarrier(i) || checkBlock(i))) {
              stats[i][1] -= 4;
            }
          }
        }
      }
      dmg(14, player, aim, card);
    } else if (card[1] == "E1") {
      dmg(8, player, aim, card, true);
      if (!checkBarrier(parseInt(vars))) {
        dmg(8, player, parseInt(vars), card, true);
        log("> " + colorsDark[stats[player][0]] + players[player] + "#000000 hit " + colorsDark[stats[parseInt(vars)][0]] + players[parseInt(vars)] + "#000000 with Dual Scythes");
      }
    } else if (card[1] == "M1") {
      dmg(22, player, aim, card);
      for (let i = 0; i < stats.length; i++) {
        if (i != player) {
          if (!checkBarrier(i)) {
            stats[i][6] -= 1;
            if (stats[i][5] == "Overconfidence") {
              if (stats[i][6] < 5 && stats[i][6] + 1 > 4) {
                stats[i][2] -= 2;
                stats[i][3] += 2;
              }
            }
          }
        }
      }
    }
  } else if (card[0] == "J") {
    if (stats[player][0] == "Knight") {
      stats[player][1] += 15;
      stats[player][2] += 2;
      protections[player].push("JK1");
    } else if (stats[player][0] == "Archer") {
      protections[player].push("JA1");
      protections[player].push("JA1");
    } else if (stats[player][0] == "Mage") {
      vars = vars.split(";");
      token(player, parseInt(vars[0]));
      token(player, parseInt(vars[1]));
    } else if (stats[player][0] == "Warlock") {
      for (let i = 0; i < stats.length; i++) {
        stats[i][1] = 50;
      }
      stats[player][2] += 1;
    }
  }
  if (stats[player][1] > 100 + tokens[player][3] * 10) {
    stats[player][1] = 100 + tokens[player][3] * 10;
  }
  if (classTypes[stats[player][0]] == card[0] && stats[player][5] == "Empowered Strikes") {
    stats[player][2] += 5;
    protections[player].push("ES");
  }
  if (!protections[aim].includes("EL")) {
    if (stats[aim][5] == "Enchanted Lifeline" && stats[aim][1] <= 0) {
      stats[aim][1] = 15;
      protections[aim].push("EL");
      log(colorsDark[stats[aim][0]] + players[aim] + "#000000 Enchanted Lifeline saved them!");
    }
  }
}

function dmg(amt, player, aim, card, dmg=false) {
  if (!checkBlock(aim)) {
    if (stats[aim][5] == "Royal Aura" && card[0] == "M") {
      dmg = false;
    }
    let total = amt - (dmg ? 0 : stats[aim][3]) + stats[player][2];
    total += classTypes[stats[player][0]] == card[0] ? 2 : 0;
    if (protections[aim].includes("RR1") && stats[aim][4] > stats[player][4]) {
      total = Math.floor(total / 2 - (dmg ? 0 : stats[aim][3]) / 2);
    }
    stats[aim][1] -= total > 0 ? total : 0;
    while (protections[player].includes("ES")) {
      stats[player][2] -= 5;
      protections[player].splice(protections[player].indexOf("ES"), 1);
    }
    if (card[0] == "S" && stats[player][5] == "Demonic Essence") {
      let healAmt = amt + stats[player][2] + 2;
      stats[player][1] += Math.floor(healAmt / 3);
    }
    if (stats[aim][5] == "Nimble Feet" && !isNaN(protections[aim][0])) {
      protections[aim][0] = total > 0 ? total : 0;
    }
  }
  if (protections[player].includes("MC3")) {
    stats[player][2] -= 1;
    stats[player][3] -= 1;
    stats[player][4] -= 20;
    protections[player].splice(protections[player].indexOf("MC3"), 1);
  }
  while (protections[aim].includes("MR1")) {
    if (!(checkBarrier(player) || checkBlock(player))) {
      for (let i = 0; i < hands[aim].length; i++) {
        if (hands[aim][i].card[0] == "M") {
          stats[player][1] -= 3;
        }
      }
    }
    protections[aim].splice(protections[aim].indexOf("MR1"), 1);
  }
  if (protections[player].includes("WC1")) {
    stats[player][3] -= 4;
    protections[player].splice(protections[player].indexOf("WC1"), 1);
  }
  protections[player].some(item => { if (isNaN(item) && item.includes("WC2")) {
    stats[player][3] += parseInt(item.slice(3));
    protections[player].splice(protections[player].indexOf(item), 1);
  }});
  protections[player].some(item => { if (isNaN(item) && item.includes("RR2")) {
    stats[player][3] -= parseInt(item.slice(3));
    protections[player].splice(protections[player].indexOf(item), 1);
  }});
  protections.some(item => { if (isNaN(item) && item.includes("SC1")) {
    if (!(checkBarrier(player) || checkBlock(player))) {
      stats[player][1] -= 4;
      item.splice(item.indexOf("SC1"), 1);
    }
  }});
  if (protections[player].includes("EL")) {
    protections[player].push("ELD");
  }
  if (protections[player].includes("WR1")) {
    protections[player].splice(protections[player].indexOf("WR1"), 1);
  }
  if (protections[player].includes("RR1")) {
    protections[player].splice(protections[player].indexOf("RR1"), 1);
  }
}

function token(player, num, msg=true) {
  if (num < 2) {
    stats[player][num + 2] += 1;
  } else if (num == 2) {
    stats[player][4] += 20;
  } else if (num == 3) {
    stats[player][1] += 10;
    tokens[player][3] += 1;
  } else if (num < 7) {
    tokens[player][num - 4] += 1;
  } else if (num == 7) {
    stats[player][6] += 1;
  }
  if (msg) {
    log("> " + colorsDark[stats[player][0]] + players[player] + "#000000 gained a " + tokenNames[num] + " token");
  }
}

function drawInfo() {
  rect(7 * width / 8, height / 2, width / 4, height);
  text(gameID, 7 * width / 8, height * 15 / 16, fontSize / 15);
  text("Deck: " + deck.length + " cards", 7 * width / 8, height / 15 - fontSize / 80, fontSize / 20);
  for (let i = 0; i < players.length; i++) {
    let pInfo = players[i] + ": " + stats[i][1] + " health";
    let color = "#000000";
    if (i == hand - 1) {
      color = "#2d7d07";
    } else if (!isNaN(stats[i][0])) {
      color = "#848484";
    } else if (i == sortStats[target]) {
      color = "#ff4242";
    }
    text(pInfo, 7 * width / 8, height / 15 * (i + 2), fontSize / 20, color);
  }
  text("Attack: " + stats[hand - 1][2], 13 * width / 16, height * 7 / 15 + fontSize / 80);
  text("Armor: " + stats[hand - 1][3], 13 * width / 16, height * 8 / 15 + fontSize / 80);
  text("Speed: " + stats[hand - 1][4], 13 * width / 16, height * 3 / 5 + fontSize / 80);
  let tokenNames = ["Arcane: ", "Mushroom: ", "Recycle: "];
  for (let i = 0; i < 3; i++) {
    let color = "#000000";
    if (clicked[3] == i) {
      color = "#ff0000";
    }
    text(tokenNames[i] + tokens[hand - 1][i], 59 * width / 64, height * (7 + i) / 15 + fontSize / 80, fontSize / 20, color);
  }
  let clickCard = clicked[0] != null ? clicked[0].card[0] + clicked[0].card[1] : null;
  if (clickCard == "MR2") {
    for (let i = 0; i < played[0].length; i++) {
      if (played[0][i].card[0] + played[0][i].card[1] != "MR2" && !played[0][i].skip) {
        clickCard = played[0][i].card[0] + played[0][i].card[1];
        break;
      }
    }
  }
  if (clickCard == "MC2" && clicked[3] == null) {
    rect(499 * width / 600, height / 1.2, width * 0.08, height / 12, "#ff2020");
    rect(551 * width / 600, height / 1.2, width * 0.08, height / 12, "#50ff50");
    text("Play", 499 * width / 600, height / 1.2);
    text("Eat", 551 * width / 600, height / 1.2);
  } else {
    if (clicked[0] == null && clicked[3] != 1 && clicked[3] != 2) {
      rect(width * 0.875, height / 1.2, width / 6, height / 12, "#ffc0c0");
    } else {
      rect(width * 0.875, height / 1.2, width / 6, height / 12, "#ff2020");
    }
    if (clicked[3] != null) {
      text("Use", width * 0.875, height / 1.2);
    } else if (clickCard == "SE1") {
      text("Click a Hand", width * 0.875, height / 1.2);
    } else if (clicked[0] == null && stats[hand - 1][5] == "Nimble Feet" && !isNaN(protections[hand - 1][0])) {
      rect(width * 0.875, height / 1.2, width / 6, height / 12, "#ff2020");
      text("Dodge (" + protections[hand - 1][0] + ")", width * 0.875, height / 1.2);
    } else {
      text("Play", width * 0.875, height / 1.2);
    }
  }
  rect(width * 0.875, height / 1.4, width / 6, height / 12, "#2020ff");
  if (clicked[0] == null) {
    text("Reshuffle", width * 0.875, height / 1.4);
  } else {
    text("Discard", width * 0.875, height / 1.4);
  }
}

let selected = new Image();
selected.src = "/images/selected.png";
let deckImg = new Image();
deckImg.src = "/images/deck.png";
let blankImg = new Image();
blankImg.src = "/images/blank.png";
function drawGame() {
  rect(width / 2, height / 2, width, height, "#dcdcdc");
  drawInfo();
  hands.slice(hand).concat(hands.slice(0, hand)).forEach(pHand => {
    for (let i = 0; i < pHand.length; i++) {
      if (pHand[i].hand == 1) {
        ctx.drawImage(pHand[i].image, pHand[i].x - width / 16, pHand[i].y - height / 8, width / 8, height / 4);
      } else {
        ctx.drawImage(pHand[i].image, pHand[i].x - width / 18, pHand[i].y - height / 9, width / 9, height / 4.5);
      }
    }
  });
  for (let i = 0; i < 3; i++) {
    if (played[1][i] == null) {
      ctx.drawImage(blankImg, (14 + i * 9) * width / 72, 31 * height / 64, width / 9, height / 4.5);
    } else {
      ctx.drawImage(played[1][i].image, (14 + i * 9) * width / 72, 31 * height / 64, width / 9, height / 4.5);
    }
  }
  if (played[0].length > 0) {
    ctx.drawImage(played[0][0].image, 7 * width / 18, height / 4, width / 9, height / 4.5);
  } else {
    ctx.drawImage(blankImg, 7 * width / 18, height / 4, width / 9, height / 4.5);
  }
  if (deck.length > 0) {
    ctx.drawImage(deckImg, width / 4, height / 4, width / 9, height / 4.5);
  }
  if (clicked[0] != null) {
    ctx.drawImage(selected, clicked[0].x - width / 16 - 4, clicked[0].y - height / 8 - 4, width / 8 + 8, height / 4 + 8);
    ctx.drawImage(clicked[0].image, clicked[0].x - width / 16, clicked[0].y - height / 8, width / 8, height / 4);
    if (clicked[1]) {
      ctx.drawImage(clicked[0].image, 3 * width / 16, height / 32, 3 * width / 8, 3 * height / 4);
    }
  }
  if (tokens.length > players.length) {
    rect(3 * width / 8, height / 2, width / 2, height / 2, "#f0f0f0");
    text("Tokens", width * 0.2125, height / 2, fontSize / 8);
    for (let i = 0; i < 3; i++) {
      rect(width * 0.45, height * (0.35 + 0.15 * i), width * 0.3, height / 8, tokenColors[tokens[tokens.length - 1][i]]);
      text(tokenNames[tokens[tokens.length - 1][i]], width * 0.45, height * (0.35 + 0.15 * i), fontSize / 12);
    }
  } else if (!isNaN(deck[deck.length - 1])) {
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
  if (clicked[2] != null) {
    let color;
    if (stats[clicked[2]][0] == "Knight") {
      color = "#ffd966";
    } else if (stats[clicked[2]][0] == "Archer") {
      color = "#b6d7a8";
    } else if (stats[clicked[2]][0] == "Mage") {
      color = "#6fa8dc";
    } else if (stats[clicked[2]][0] == "Warlock") {
      color = "#c27ba0";
    }
    rect(3 * width / 8, height / 2, width / 2, height / 2, color);
    text(players[clicked[2]], 3 * width / 8, height * 0.31, fontSize / 12);
    text("Class: " + stats[clicked[2]][0], width / 4, height * 0.6, fontSize / 18);
    text("Life Points: " + stats[clicked[2]][6], width / 2, height * 0.6);
    text("Ability: " + stats[clicked[2]][5], 3 * width / 8, height * 0.68);
    text("Health: " + stats[clicked[2]][1], 7 * width / 24, height * 0.4);
    text("Attack: " + stats[clicked[2]][2], 7 * width / 24, height * 0.48);
    text("Armor: " + stats[clicked[2]][3], 11 * width / 24, height * 0.4);
    text("Speed: " + stats[clicked[2]][4], 11 * width / 24, height * 0.48);
  }
}
