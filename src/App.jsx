import React, { useEffect, useMemo, useState } from 'react';

const INITIAL_BALANCE = 2000;
const CHIP_VALUES = [5, 25, 100, 500];
const BLACKJACK_PAYOUT = 1.5;
const DECK_REFRESH_THRESHOLD = 18;
const CURRENCY = '$';

const SUITS = [
  { symbol: '♠', name: 'Spades' },
  { symbol: '♥', name: 'Hearts' },
  { symbol: '♦', name: 'Diamonds' },
  { symbol: '♣', name: 'Clubs' }
];
const RANKS = [
  { rank: 'A', value: 11 },
  { rank: 'K', value: 10 },
  { rank: 'Q', value: 10 },
  { rank: 'J', value: 10 },
  { rank: '10', value: 10 },
  { rank: '9', value: 9 },
  { rank: '8', value: 8 },
  { rank: '7', value: 7 },
  { rank: '6', value: 6 },
  { rank: '5', value: 5 },
  { rank: '4', value: 4 },
  { rank: '3', value: 3 },
  { rank: '2', value: 2 }
];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const card of RANKS) {
      deck.push({
        suit: suit.symbol,
        rank: card.rank,
        value: card.value
      });
    }
  }
  return deck;
}

function shuffle(deck) {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function drawCards(deck, count) {
  const nextDeck = [...deck];
  const cards = [];
  for (let i = 0; i < count; i += 1) {
    const next = nextDeck.shift();
    if (next) {
      cards.push(next);
    }
  }
  return { cards, deck: nextDeck };
}

function handValue(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    total += card.rank === 'A' ? 11 : card.value;
    if (card.rank === 'A') {
      aces += 1;
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, soft: aces > 0 };
}

function isBlackjack(hand) {
  return hand.length === 2 && handValue(hand).total === 21;
}

function formatCard(card) {
  return `${card.rank}${card.suit}`;
}

function isRedSuit(suit) {
  return suit === '♥' || suit === '♦';
}

export default function App() {
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [bet, setBet] = useState(0);
  const [lastBet, setLastBet] = useState(0);
  const [deck, setDeck] = useState(() => shuffle(createDeck()));
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [status, setStatus] = useState('betting');
  const [message, setMessage] = useState('チップを置いてディールを開始します。');
  const [revealDealer, setRevealDealer] = useState(false);

  const playerValue = useMemo(() => handValue(playerHand).total, [playerHand]);
  const dealerValue = useMemo(() => handValue(dealerHand).total, [dealerHand]);

  const canBet = status === 'betting';
  const canDeal = status === 'betting' && bet > 0 && bet <= balance;
  const canHit = status === 'player';
  const canStand = status === 'player';

  const roundOver = status === 'roundOver';

  const availableBalance = balance;

  const refreshDeckIfNeeded = (currentDeck) => {
    if (currentDeck.length < DECK_REFRESH_THRESHOLD) {
      return shuffle(createDeck());
    }
    return currentDeck;
  };

  const handleAddChip = (value) => {
    if (!canBet) return;
    if (bet + value > balance) {
      setMessage('残高が足りません。');
      return;
    }
    setBet((prev) => prev + value);
  };

  const handleClearBet = () => {
    if (!canBet) return;
    setBet(0);
    setMessage('ベットをクリアしました。');
  };

  const handleAllIn = () => {
    if (!canBet) return;
    setBet(balance);
    setMessage('オールイン。覚悟はいいですか？');
  };

  const resolveRound = (outcome, payoutMultiplier = 0) => {
    setStatus('roundOver');
    setRevealDealer(true);
    if (outcome === 'push') {
      setBalance((prev) => prev + bet);
    } else if (outcome === 'win') {
      setBalance((prev) => prev + bet * (1 + payoutMultiplier));
    }
  };

  const finalizeRound = (playerFinal, dealerFinal) => {
    if (playerFinal > 21) {
      setMessage('バースト。ディーラーの勝ちです。');
      resolveRound('lose');
      return;
    }
    if (dealerFinal > 21) {
      setMessage('ディーラーがバースト。あなたの勝ちです。');
      resolveRound('win', 1);
      return;
    }
    if (playerFinal > dealerFinal) {
      setMessage('勝利。チップを獲得しました。');
      resolveRound('win', 1);
      return;
    }
    if (playerFinal < dealerFinal) {
      setMessage('惜しい。ディーラーの勝ち。');
      resolveRound('lose');
      return;
    }
    setMessage('プッシュ。ベットは返却されます。');
    resolveRound('push');
  };

  const handleDeal = () => {
    if (!canDeal) {
      setMessage('ベット額を確認してください。');
      return;
    }

    const nextDeck = refreshDeckIfNeeded(deck);
    const draw1 = drawCards(nextDeck, 2);
    const draw2 = drawCards(draw1.deck, 2);

    setBalance((prev) => prev - bet);
    setLastBet(bet);
    setPlayerHand(draw1.cards);
    setDealerHand(draw2.cards);
    setDeck(draw2.deck);
    setStatus('player');
    setRevealDealer(false);
    setMessage('ヒット or スタンドを選択してください。');

    const playerBJ = isBlackjack(draw1.cards);
    const dealerBJ = isBlackjack(draw2.cards);
    if (playerBJ || dealerBJ) {
      setRevealDealer(true);
      if (playerBJ && dealerBJ) {
        setMessage('双方ブラックジャック。プッシュ。');
        setStatus('roundOver');
        setBalance((prev) => prev + bet);
      } else if (playerBJ) {
        setMessage('ブラックジャック！ 3:2で支払われます。');
        setStatus('roundOver');
        setBalance((prev) => prev + bet * (1 + BLACKJACK_PAYOUT));
      } else {
        setMessage('ディーラーのブラックジャック。');
        setStatus('roundOver');
      }
    }
  };

  const handleHit = () => {
    if (!canHit) return;
    const draw = drawCards(deck, 1);
    const nextHand = [...playerHand, ...draw.cards];
    setPlayerHand(nextHand);
    setDeck(draw.deck);

    const total = handValue(nextHand).total;
    if (total > 21) {
      setMessage('バースト。');
      setStatus('roundOver');
      setRevealDealer(true);
      return;
    }
    if (total === 21) {
      handleStand(nextHand, draw.deck);
    }
  };

  const handleStand = (forcedHand, forcedDeck) => {
    const hasForcedHand = Array.isArray(forcedHand);
    const currentHand = hasForcedHand ? forcedHand : playerHand;
    let nextDeck = hasForcedHand && forcedDeck ? forcedDeck : deck;
    let nextDealer = [...dealerHand];

    setRevealDealer(true);

    while (handValue(nextDealer).total < 17) {
      const draw = drawCards(nextDeck, 1);
      nextDealer = [...nextDealer, ...draw.cards];
      nextDeck = draw.deck;
    }

    setDealerHand(nextDealer);
    setDeck(nextDeck);
    finalizeRound(handValue(currentHand).total, handValue(nextDealer).total);
  };

  const handleNextRound = (fromAuto = false) => {
    if (status !== 'roundOver') return;
    if (balance === 0) {
      setMessage('残高がありません。リセットしてください。');
      return;
    }
    setPlayerHand([]);
    setDealerHand([]);
    if (fromAuto) {
      setBet(lastBet > balance ? balance : lastBet);
    } else {
      setBet(0);
    }
    setRevealDealer(false);
    setStatus('betting');
    setMessage('次のベットを置いてください。');
  };

  const handleRebet = () => {
    if (!canBet) return;
    if (lastBet === 0) return;
    if (lastBet > balance) {
      setMessage('残高が足りません。');
      return;
    }
    setBet(lastBet);
    setMessage('前回のベットを再設定しました。');
  };

  const handleReset = () => {
    setBalance(INITIAL_BALANCE);
    setBet(0);
    setLastBet(0);
    setPlayerHand([]);
    setDealerHand([]);
    setDeck(shuffle(createDeck()));
    setRevealDealer(false);
    setStatus('betting');
    setMessage('テーブルに戻ってきました。');
  };

  useEffect(() => {
    if (status !== 'roundOver') return undefined;
    if (balance === 0) return undefined;
    const timer = setTimeout(() => {
      handleNextRound(true);
    }, 2200);
    return () => clearTimeout(timer);
  }, [status, balance]);

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="label">BLACKJACK NOIR</p>
          <h1>Velvet Table</h1>
        </div>
        <div className="balance">
          <span className="label">Balance</span>
          <strong>{CURRENCY}{availableBalance.toLocaleString()}</strong>
        </div>
      </header>

      <main className="table">
        <section className="hand dealer">
          <div className="hand-header">
            <h2>Dealer</h2>
            <span className="score">
              {revealDealer ? dealerValue : '??'}
            </span>
          </div>
          <div className="cards">
            {dealerHand.length === 0 && <div className="card ghost" />}
            {dealerHand.map((card, index) => {
              const hidden = !revealDealer && index === 0;
              const isRed = isRedSuit(card.suit);
              return (
                <div
                  key={`${card.rank}-${card.suit}-${index}`}
                  className={`card ${hidden ? 'back' : ''} ${isRed ? 'red' : ''}`}
                >
                  {hidden ? (
                    ''
                  ) : (
                    <>
                      <span className="corner top">{formatCard(card)}</span>
                      <span className="center">{card.suit}</span>
                      <span className="corner bottom">{formatCard(card)}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="hand player">
          <div className="hand-header">
            <h2>Player</h2>
            <span className="score">{playerHand.length ? playerValue : '--'}</span>
          </div>
          <div className="cards">
            {playerHand.length === 0 && <div className="card ghost" />}
            {playerHand.map((card, index) => (
              <div
                key={`${card.rank}-${card.suit}-${index}`}
                className={`card ${isRedSuit(card.suit) ? 'red' : ''}`}
              >
                <span className="corner top">{formatCard(card)}</span>
                <span className="center">{card.suit}</span>
                <span className="corner bottom">{formatCard(card)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="controls">
          <div className="message">{message}</div>

          <div className="bet-panel">
            <div className="bet-info">
              <div>
                <span className="label">Current Bet</span>
                <strong>{CURRENCY}{bet.toLocaleString()}</strong>
              </div>
              <div>
                <span className="label">Last Bet</span>
                <strong>{CURRENCY}{lastBet.toLocaleString()}</strong>
              </div>
            </div>

            <div className="chips">
              {CHIP_VALUES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="chip"
                  onClick={() => handleAddChip(value)}
                  disabled={!canBet}
                >
                  ¥{value}
                </button>
              ))}
              <button
                type="button"
                className="chip secondary"
                onClick={handleAllIn}
                disabled={!canBet}
              >
                ALL IN
              </button>
              <button
                type="button"
                className="chip ghost"
                onClick={handleClearBet}
                disabled={!canBet}
              >
                CLEAR
              </button>
            </div>
          </div>

          <div className="actions">
            <button type="button" className="primary" onClick={handleDeal} disabled={!canDeal}>
              DEAL
            </button>
            <button type="button" onClick={handleHit} disabled={!canHit}>
              HIT
            </button>
            <button type="button" onClick={() => handleStand()} disabled={!canStand}>
              STAND
            </button>
            <button type="button" onClick={handleRebet} disabled={!canBet || lastBet === 0}>
              REBET
            </button>
            <button type="button" className="ghost" onClick={handleNextRound} disabled={!roundOver}>
              NEXT ROUND
            </button>
            <button type="button" className="ghost" onClick={handleReset}>
              RESET
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>Deck refresh: {DECK_REFRESH_THRESHOLD}+ cards remain. Blackjack pays 3:2.</p>
      </footer>
    </div>
  );
}
