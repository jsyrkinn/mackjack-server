
var Player = require('../models/player');
var Card = require('../models/card');
var Hand = require('../models/hand');

drawCard = function(game) {
  var deck = game.deck
  if (deck.length > 0) {
      var idx = Math.floor(Math.random()*deck.length);
      return deck.splice(idx, 1)[0];
  }
}

dealCard = function(game, hand) {
  //TODO make game handle running out of cards
  hand.cards.push(drawCard(game));
}

syncMoney = function(user, player) {
  if(user.playerID == player.playerID) {
    player.money = user.money;
  } else {
    console.log('syncMoney: mismatch');
  }
}

addPlayer = function(game, user) {
  user.inGame = true;
  player = new Player(user.playerID, user.playerName);
  syncMoney(user, player);
  if(game.moveNumber == 0) {
    game.players.push(player);
  } else {
    game.joinQueue.push(player);
  }
}

addQueuedPlayers = function(game) {
  game.joinQueue.forEach(function(player){
    game.players.push(player);
  })
  game.joinQueue = [];
}

startNewRound = function(game) {
  game.moveNumber = 0;
  game.deck = [];
  ['Spades', 'Clubs', 'Hearts', 'Diamonds'].forEach(function(suit) {
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].forEach(function(rank) {
        game.deck.push(new Card(rank, suit));
      });
  });
  addQueuedPlayers(game);
  game.players.forEach(function(player) {
    player.hands = [new Hand()];
  })
  game.currentPlayer = 0;
  game.currentPlayerHand = 0;
  game.dealerHand = new Hand();
  dealCard(game, game.dealerHand);
}

hasPlayer = function(game, user) {
  inGame = false;
  game.players.forEach(function(player) {
    if(user.playerID == player.playerID) {
      inGame = true;
    }
  })
  return inGame;
}

isPlayerMove = function(game, user) {
  return game.players[game.currentPlayer].playerID == user.playerID;
}

advanceMove = function(game) {
  game.moveNumber++
}

advanceHand = function(game) {
  game.currentPlayerHand++
  // TODO handle all players not active
  while(
      !game.players[game.currentPlayer].active ||
      game.currentPlayerHand >= game.players[game.currentPlayer].hands.length
    ) {
    game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
    game.currentPlayerHand = 0;
  }
  if(game.betting && game.players[game.currentPlayer].hands[game.currentPlayerHand].bet > 0) {
    game.betting = false;
  }
  if(!game.finished && game.players[game.currentPlayer].hands[game.currentPlayerHand].finished) {
    // TODO end game calculations
    game.finished = true;
  }
}

handTotals = function(hand) {
  var totals = [];
  totals[0] = 0;
  for (var i = 0; i < hand.cards.length; i++ ) {
    var card = hand.cards[i];
    var totLength = totals.length;
    for(var b = 0; b < totLength; b++){
      if (card.rank != 1 && card.rank <= 10) {
          totals[b] += card.rank;
      }
      else if (card.rank > 10){
          totals[b] += 10;
      }
      else {
          totals.push(totals[b] + 11);
          totals[b]+=1;
      }
    }
  }
  return totals.sort();
}

finishRound = function(game) {
  game.finished = true;
  while(handTotals(game.dealerHand)[0] < 17) {
    dealCard(game, game.dealerHand);
  }  
}

currentPlayerStay = function(game, user) {
  if(currentPlayer.playerID != user.playerID || game.betting) {
    return false;
  }
  currentPlayer.hands[game.currentPlayerHand].finished = true;
  advanceHand(game);
  advanceMove(game);
  return true;
}

currentPlayerBet = function(game, user, amount) {
  currentPlayer = game.players[game.currentPlayer];
  if(user.money < amount ||
      currentPlayer.playerID != user.playerID ||
      !game.betting) {
    return false;
  }
  user.money -= amount;
  syncMoney(user, currentPlayer);
  currentPlayer.hands[game.currentPlayerHand].bet = amount;
  advanceHand(game);
  advanceMove(game);
  return true;
}

currentPlayerHit = function(game, user) {
  currentPlayer = game.players[game.currentPlayer];
  if(currentPlayer.playerID != user.playerID || game.betting) {
    return false;
  }
  hand = currentPlayer.hands[game.currentPlayerHand];
  dealCard(game, hand);
  totals = handTotals(hand);
  if(totals[0] == 21) {
    advanceHand(game);
  } else if(handTotals(hand)[0] > 21) {
    hand.busted = true;
    advanceHand(game);
  }
  advanceMove(game);
  return true;
}

exports.dealCard = dealCard;
exports.startNewRound = startNewRound;
exports.addPlayer = addPlayer;
exports.hasPlayer = hasPlayer;
exports.addQueuedPlayers = addQueuedPlayers;
exports.isPlayerMove = isPlayerMove;
exports.advanceHand = advanceHand;
exports.syncMoney = syncMoney;
exports.currentPlayerStay = currentPlayerStay;
exports.currentPlayerBet = currentPlayerBet;
exports.currentPlayerHit = currentPlayerHit;
