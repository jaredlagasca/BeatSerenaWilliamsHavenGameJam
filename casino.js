window.CasinoGame = (() => {
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const PRICES = {
    shoes: 250,
    racket: 300,
    band: 350,
    magnet: 400,
    visor: 450,
    prize: 500,
    rematch: 200
  };

  let callbacks = {
    getBankroll: () => 1000,
    setBankroll: () => {},
    getUpgrades: () => ({ shoes: false, racket: false, band: false, magnet: false, visor: false, prize: false }),
    onBuyUpgrade: () => {},
    onBuyRematch: () => {},
    onBankrupt: () => {}
  };

  let bj = {
    deck: [],
    playerHand: [],
    dealerHand: [],
    inRound: false,
    betChoice: 50,
    activeBet: 0
  };

  let cf = {
    pick: 'heads',
    betChoice: 50,
    flipping: false
  };

  const els = {};

  function init(cb) {
    callbacks = cb;

    els.tabBj = document.getElementById('tab-blackjack');
    els.tabCf = document.getElementById('tab-coinflip');
    els.panelBj = document.getElementById('panel-blackjack');
    els.panelCf = document.getElementById('panel-coinflip');

    els.bankrollVal = document.getElementById('casino-bankroll-val');

    els.bjDealerCards = document.getElementById('bj-dealer-cards');
    els.bjPlayerCards = document.getElementById('bj-player-cards');
    els.bjDealerScore = document.getElementById('bj-dealer-score');
    els.bjPlayerScore = document.getElementById('bj-player-score');
    els.bjMessage = document.getElementById('bj-message');
    els.btnBjDeal = document.getElementById('btn-bj-deal');
    els.btnBjHit = document.getElementById('btn-bj-hit');
    els.btnBjStand = document.getElementById('btn-bj-stand');
    els.btnBjDouble = document.getElementById('btn-bj-double');

    els.cfCoin = document.getElementById('cf-coin');
    els.cfMessage = document.getElementById('cf-message');
    els.btnPickHeads = document.getElementById('btn-pick-heads');
    els.btnPickTails = document.getElementById('btn-pick-tails');
    els.btnCfFlip = document.getElementById('btn-cf-flip');

    els.btnBuyShoes = document.getElementById('btn-buy-shoes');
    els.btnBuyRacket = document.getElementById('btn-buy-racket');
    els.btnBuyBand = document.getElementById('btn-buy-band');
    els.btnBuyMagnet = document.getElementById('btn-buy-magnet');
    els.btnBuyVisor = document.getElementById('btn-buy-visor');
    els.btnBuyPrize = document.getElementById('btn-buy-prize');
    els.btnBuyRematch = document.getElementById('btn-buy-rematch');
    els.rematchHint = document.getElementById('rematch-hint');

    bindEvents();
    refreshUI();
  }

  function bindEvents() {
    els.tabBj.addEventListener('click', () => switchTab('bj'));
    els.tabCf.addEventListener('click', () => switchTab('cf'));

    document.querySelectorAll('[data-bj-bet]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (bj.inRound) return;
        document.querySelectorAll('[data-bj-bet]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.dataset.bjBet;
        bj.betChoice = val === 'all' ? 'all' : parseInt(val, 10);
        refreshUI();
      });
    });

    document.querySelectorAll('[data-cf-bet]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (cf.flipping) return;
        document.querySelectorAll('[data-cf-bet]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.dataset.cfBet;
        cf.betChoice = val === 'all' ? 'all' : parseInt(val, 10);
        refreshUI();
      });
    });

    els.btnBjDeal.addEventListener('click', dealBlackjack);
    els.btnBjHit.addEventListener('click', hitBlackjack);
    els.btnBjStand.addEventListener('click', standBlackjack);
    els.btnBjDouble.addEventListener('click', doubleBlackjack);

    els.btnPickHeads.addEventListener('click', () => {
      if (cf.flipping) return;
      cf.pick = 'heads';
      els.btnPickHeads.classList.add('active');
      els.btnPickTails.classList.remove('active');
    });

    els.btnPickTails.addEventListener('click', () => {
      if (cf.flipping) return;
      cf.pick = 'tails';
      els.btnPickTails.classList.add('active');
      els.btnPickHeads.classList.remove('active');
    });

    els.btnCfFlip.addEventListener('click', flipCoin);

    els.btnBuyShoes.addEventListener('click', () => buyUpgrade('shoes'));
    els.btnBuyRacket.addEventListener('click', () => buyUpgrade('racket'));
    els.btnBuyBand.addEventListener('click', () => buyUpgrade('band'));
    els.btnBuyMagnet.addEventListener('click', () => buyUpgrade('magnet'));
    els.btnBuyVisor.addEventListener('click', () => buyUpgrade('visor'));
    els.btnBuyPrize.addEventListener('click', () => buyUpgrade('prize'));
    els.btnBuyRematch.addEventListener('click', buyRematch);
  }

  function switchTab(tab) {
    const isBj = tab === 'bj';
    els.tabBj.classList.toggle('active', isBj);
    els.tabCf.classList.toggle('active', !isBj);
    els.panelBj.classList.toggle('active', isBj);
    els.panelCf.classList.toggle('active', !isBj);
  }

  function getEffectiveBet(choice) {
    const bank = callbacks.getBankroll();
    if (bank <= 0) return 0;
    if (choice === 'all') return bank;
    return Math.min(bank, choice);
  }

  function refreshUI() {
    const bank = callbacks.getBankroll();
    const upgrades = callbacks.getUpgrades();

    els.bankrollVal.textContent = `$${bank}`;

    const bjBet = getEffectiveBet(bj.betChoice);
    els.btnBjDeal.textContent = bjBet > 0 ? `DEAL ($${bjBet})` : 'NO CHIPS';
    els.btnBjDeal.disabled = bj.inRound || bjBet <= 0;
    els.btnBjHit.disabled = !bj.inRound;
    els.btnBjStand.disabled = !bj.inRound;
    els.btnBjDouble.disabled = !bj.inRound || bj.playerHand.length !== 2 || bank < bj.activeBet;

    const cfBet = getEffectiveBet(cf.betChoice);
    els.btnCfFlip.textContent = cfBet > 0 ? `FLIP COIN ($${cfBet})` : 'NO CHIPS';
    els.btnCfFlip.disabled = cf.flipping || cfBet <= 0;

    updateShopBtn(els.btnBuyShoes, upgrades.shoes, PRICES.shoes, bank);
    updateShopBtn(els.btnBuyRacket, upgrades.racket, PRICES.racket, bank);
    updateShopBtn(els.btnBuyBand, upgrades.band, PRICES.band, bank);
    updateShopBtn(els.btnBuyMagnet, upgrades.magnet, PRICES.magnet, bank);
    updateShopBtn(els.btnBuyVisor, upgrades.visor, PRICES.visor, bank);
    updateShopBtn(els.btnBuyPrize, upgrades.prize, PRICES.prize, bank);

    const canRematch = !bj.inRound && !cf.flipping && bank >= PRICES.rematch;
    els.btnBuyRematch.disabled = !canRematch;
    els.rematchHint.textContent = bank >= PRICES.rematch
      ? 'Ready to challenge Serena Williams!'
      : `Need $${PRICES.rematch - bank} more to afford a rematch.`;
  }

  function updateShopBtn(btn, owned, price, bank) {
    if (owned) {
      btn.textContent = 'OWNED';
      btn.disabled = true;
    } else {
      btn.textContent = `$${price}`;
      btn.disabled = bj.inRound || cf.flipping || bank < price;
    }
  }

  function buyUpgrade(key) {
    if (bj.inRound || cf.flipping) return;
    const bank = callbacks.getBankroll();
    const upgrades = callbacks.getUpgrades();
    if (upgrades[key] || bank < PRICES[key]) return;

    callbacks.setBankroll(bank - PRICES[key]);
    callbacks.onBuyUpgrade(key);
    window.SoundFX.pointWin();
    refreshUI();
  }

  function buyRematch() {
    if (bj.inRound || cf.flipping) return;
    const bank = callbacks.getBankroll();
    if (bank < PRICES.rematch) return;

    callbacks.setBankroll(bank - PRICES.rematch);
    callbacks.onBuyRematch();
  }

  function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function handValue(hand) {
    let total = 0;
    let aces = 0;
    for (const card of hand) {
      if (card.rank === 'A') {
        total += 11;
        aces += 1;
      } else if (['K', 'Q', 'J'].includes(card.rank)) {
        total += 10;
      } else {
        total += parseInt(card.rank, 10);
      }
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }
    return total;
  }

  function renderCards(hideDealerHole) {
    els.bjDealerCards.innerHTML = '';
    els.bjPlayerCards.innerHTML = '';

    bj.dealerHand.forEach((card, idx) => {
      const hidden = hideDealerHole && idx === 1;
      els.bjDealerCards.appendChild(makeCardEl(card, hidden));
    });

    bj.playerHand.forEach((card) => {
      els.bjPlayerCards.appendChild(makeCardEl(card, false));
    });

    els.bjPlayerScore.textContent = handValue(bj.playerHand);
    els.bjDealerScore.textContent = hideDealerHole
      ? handValue([bj.dealerHand[0]])
      : handValue(bj.dealerHand);
  }

  function makeCardEl(card, hidden) {
    const div = document.createElement('div');
    const isRed = card.suit === '♥' || card.suit === '♦';
    div.className = `card${isRed ? ' red' : ''}${hidden ? ' hidden' : ''}`;
    if (!hidden) {
      div.innerHTML = `
        <span>${card.rank}</span>
        <span class="card-suit-center">${card.suit}</span>
        <span style="align-self:flex-end">${card.rank}</span>
      `;
    }
    return div;
  }

  function dealBlackjack() {
    const bet = getEffectiveBet(bj.betChoice);
    if (bet <= 0 || bj.inRound) return;

    callbacks.setBankroll(callbacks.getBankroll() - bet);
    bj.activeBet = bet;
    bj.inRound = true;
    bj.deck = createDeck();
    bj.playerHand = [bj.deck.pop(), bj.deck.pop()];
    bj.dealerHand = [bj.deck.pop(), bj.deck.pop()];
    window.SoundFX.card();

    const pVal = handValue(bj.playerHand);
    const dVal = handValue(bj.dealerHand);

    if (pVal === 21 || dVal === 21) {
      renderCards(false);
      if (pVal === 21 && dVal === 21) {
        finishBlackjack('win', `VIP RULE: Tie on 21 wins! You win $${bet}!`);
      } else if (pVal === 21) {
        finishBlackjack('blackjack', `BLACKJACK (2:1)! You win $${bet * 2}!`);
      } else {
        finishBlackjack('lose', 'Dealer has Blackjack. You lose.');
      }
      return;
    }

    renderCards(true);
    els.bjMessage.textContent = 'Hit, Stand, or Double Down!';
    refreshUI();
  }

  function hitBlackjack() {
    if (!bj.inRound) return;
    bj.playerHand.push(bj.deck.pop());
    window.SoundFX.card();
    renderCards(true);

    const pVal = handValue(bj.playerHand);
    if (pVal > 21) {
      renderCards(false);
      finishBlackjack('lose', `Bust (${pVal})! You lose $${bj.activeBet}.`);
    } else if (bj.playerHand.length >= 5) {
      renderCards(false);
      finishBlackjack('win', `5-CARD CHARLIE! You win $${bj.activeBet}!`);
    } else if (pVal === 21) {
      standBlackjack();
    } else {
      refreshUI();
    }
  }

  function doubleBlackjack() {
    if (!bj.inRound || bj.playerHand.length !== 2) return;
    const bank = callbacks.getBankroll();
    if (bank < bj.activeBet) return;

    callbacks.setBankroll(bank - bj.activeBet);
    bj.activeBet *= 2;
    bj.playerHand.push(bj.deck.pop());
    window.SoundFX.card();

    const pVal = handValue(bj.playerHand);
    if (pVal > 21) {
      renderCards(false);
      finishBlackjack('lose', `Bust on Double (${pVal})! You lose $${bj.activeBet}.`);
    } else {
      standBlackjack();
    }
  }

  function standBlackjack() {
    if (!bj.inRound) return;
    while (handValue(bj.dealerHand) < 17) {
      bj.dealerHand.push(bj.deck.pop());
    }
    renderCards(false);

    const pVal = handValue(bj.playerHand);
    const dVal = handValue(bj.dealerHand);

    if (dVal > 21 || pVal > dVal) {
      finishBlackjack('win', `You win $${bj.activeBet}! (${pVal} vs ${dVal})`);
    } else if (pVal < dVal) {
      finishBlackjack('lose', `Dealer wins (${dVal} vs ${pVal}).`);
    } else if (pVal >= 20) {
      finishBlackjack('win', `VIP RULE: Tie on ${pVal} wins! You win $${bj.activeBet}!`);
    } else {
      finishBlackjack('push', `Push (${pVal} vs ${dVal}) — bet returned.`);
    }
  }

  function finishBlackjack(outcome, message) {
    bj.inRound = false;
    const bank = callbacks.getBankroll();
    if (outcome === 'blackjack') {
      callbacks.setBankroll(bank + bj.activeBet * 3);
      window.SoundFX.win();
    } else if (outcome === 'win') {
      callbacks.setBankroll(bank + bj.activeBet * 2);
      window.SoundFX.pointWin();
    } else if (outcome === 'push') {
      callbacks.setBankroll(bank + bj.activeBet);
    } else {
      window.SoundFX.pointLose();
    }

    els.bjMessage.textContent = message;
    refreshUI();
    checkBankruptcy();
  }

  function flipCoin() {
    const bet = getEffectiveBet(cf.betChoice);
    if (bet <= 0 || cf.flipping) return;

    cf.flipping = true;
    callbacks.setBankroll(callbacks.getBankroll() - bet);
    els.cfMessage.textContent = 'Flipping...';
    window.SoundFX.coin();
    refreshUI();

    els.cfCoin.classList.remove('show-tails', 'flipping');
    void els.cfCoin.offsetWidth;
    els.cfCoin.classList.add('flipping');

    const result = Math.random() < 0.5 ? 'heads' : 'tails';

    setTimeout(() => {
      els.cfCoin.classList.remove('flipping');
      els.cfCoin.classList.toggle('show-tails', result === 'tails');

      if (result === cf.pick) {
        callbacks.setBankroll(callbacks.getBankroll() + bet * 2);
        els.cfMessage.textContent = `${result.toUpperCase()}! You won $${bet}!`;
        window.SoundFX.pointWin();
      } else {
        els.cfMessage.textContent = `${result.toUpperCase()}! You lost $${bet}.`;
        window.SoundFX.pointLose();
      }

      cf.flipping = false;
      refreshUI();
      checkBankruptcy();
    }, 850);
  }

  function checkBankruptcy() {
    if (callbacks.getBankroll() <= 0 && !bj.inRound && !cf.flipping) {
      setTimeout(() => {
        if (callbacks.getBankroll() <= 0) {
          callbacks.onBankrupt();
        }
      }, 950);
    }
  }

  function resetTable() {
    bj.inRound = false;
    bj.playerHand = [];
    bj.dealerHand = [];
    els.bjDealerCards.innerHTML = '';
    els.bjPlayerCards.innerHTML = '';
    els.bjDealerScore.textContent = '0';
    els.bjPlayerScore.textContent = '0';
    els.bjMessage.textContent = 'Place your bet and click Deal!';
    els.cfMessage.textContent = 'Pick Heads or Tails, choose a bet, and Flip!';
    refreshUI();
  }

  return {
    init,
    refreshUI,
    resetTable
  };
})();
