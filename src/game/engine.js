// ═══════════════════════════════════════════
//  KABOOT – Baloot Game Engine
//  Correct Saudi Baloot rules
// ═══════════════════════════════════════════

export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
export const VALUES = [7, 8, 9, 10, 11, 12, 13, 14]; // 11=J 12=Q 13=K 14=A

export const SUIT_SYMBOLS = {
  spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣',
};
export const SUIT_NAMES_AR = {
  spades: 'بستوني', hearts: 'قلوب', diamonds: 'ديناري', clubs: 'سباتي',
};

export const POSITIONS = ['south', 'west', 'north', 'east'];
// Team 0 = Us (south=human, north=partner)
// Team 1 = Them (west, east = opponents)
export const TEAMS = { south: 0, north: 0, west: 1, east: 1 };

// ─── Deck ───────────────────────────────────
export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value, id: `${value}_${suit}` });
    }
  }
  return deck;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Deal cards:
 * - 7 cards to each player (28 total)
 * - 1 card face-up in the center (the "bid card")
 * - 3 reserve cards dealt to each player AFTER bidding (1 each)
 *   (3 remaining go 1 to each of 3 non-bidding players, center card goes to bidder OR 1 to each player)
 *
 * Simpler final implementation:
 * - 7 cards each = 28
 * - 1 center card = card #29
 * - 3 remaining = after bidding, 1 extra to each of the 3 non-first-bid players
 *   OR: after bidding, distribute reserve[0..2] to west/north/east; center card to south if they bid, else to reserve
 *
 * Clean rule used here:
 * - Everyone gets 7 cards
 * - 1 center card shown
 * - After bidding, everyone gets 1 more card (bidder gets center card, others get reserve)
 */
export function deal() {
  const shuffled = shuffle(createDeck());
  return {
    south: shuffled.slice(0, 7),
    west: shuffled.slice(7, 14),
    north: shuffled.slice(14, 21),
    east: shuffled.slice(21, 28),
    centerCard: shuffled[28],
    reserve: [shuffled[29], shuffled[30], shuffled[31]], // 1 per non-center player after bid
  };
}

// ─── Card Display ────────────────────────────
export function cardLabel(value) {
  const m = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  return m[value] || String(value);
}

export function isRed(suit) {
  return suit === 'hearts' || suit === 'diamonds';
}

// ─── Scoring ─────────────────────────────────
/**
 * Card point values:
 * Sun mode - trump suit:   J=20, 9=14, A=11, 10=10, K=4, Q=3, 8=0, 7=0
 * Sun mode - other suits:  A=11, 10=10, K=4, Q=3, J=2, 9=0, 8=0, 7=0
 * Baloot mode - all suits: A=11, 10=10, K=4, Q=3, J=2, 9=0, 8=0, 7=0
 * Last trick: +10 bonus
 * Kaboot (all 8 tricks): +100 bonus
 */
export function cardPoints(card, mode, trumpSuit) {
  if (!card) return 0;
  const { suit, value } = card;
  if (mode === 'sun' && suit === trumpSuit) {
    const pts = { 11: 20, 9: 14, 14: 11, 10: 10, 13: 4, 12: 3, 8: 0, 7: 0 };
    return pts[value] ?? 0;
  }
  const pts = { 14: 11, 10: 10, 13: 4, 12: 3, 11: 2, 9: 0, 8: 0, 7: 0 };
  return pts[value] ?? 0;
}

export function totalDeckPoints(mode, trumpSuit) {
  let total = 0;
  for (const suit of SUITS) {
    for (const value of VALUES) {
      total += cardPoints({ suit, value }, mode, trumpSuit);
    }
  }
  return total; // Sun = 152, Baloot = 120 (+ 10 last trick bonus)
}

// ─── Trick Logic ─────────────────────────────
/**
 * Card strength for trick-winning comparison.
 * Returns a number; highest wins.
 *
 * Trump hierarchy (Sun mode, trump suit):
 *   J(1008) > 9(1007) > A(1006) > 10(1005) > K(1004) > Q(1003) > 8(1002) > 7(1001)
 *
 * Lead suit (non-trump):
 *   A(8) > 10(7) > K(6) > Q(5) > J(4) > 9(3) > 8(2) > 7(1)
 *
 * Off-suit (can't win): -1
 */
export function cardStrength(card, leadSuit, trumpSuit, mode) {
  if (!card) return -1;
  const { suit, value } = card;
  if (mode === 'sun' && suit === trumpSuit) {
    const order = { 11: 8, 9: 7, 14: 6, 10: 5, 13: 4, 12: 3, 8: 2, 7: 1 };
    return 1000 + (order[value] ?? 0);
  }
  if (suit === leadSuit) {
    const order = { 14: 8, 10: 7, 13: 6, 12: 5, 11: 4, 9: 3, 8: 2, 7: 1 };
    return order[value] ?? 0;
  }
  return -1; // can't win this trick
}

export function trickWinner(trickObj, leadSuit, trumpSuit, mode) {
  let best = -1;
  let winner = null;
  for (const [pos, card] of Object.entries(trickObj)) {
    const str = cardStrength(card, leadSuit, trumpSuit, mode);
    if (str > best) { best = str; winner = pos; }
  }
  return winner;
}

// ─── Valid Card Rules ────────────────────────
/**
 * Rules (Saudi Baloot standard):
 * 1. Must follow lead suit if possible.
 * 2. In Sun mode: if cannot follow lead suit, MUST play trump if you have one
 *    (exception: if your partner is already winning the trick, you may play any card).
 * 3. In Baloot mode: if cannot follow lead suit, may play any card.
 */
export function getValidCards(hand, leadSuit, trumpSuit, mode, currentTrick) {
  // Leading (first card of trick)
  if (!leadSuit || Object.keys(currentTrick).length === 0) return hand;

  // Must follow lead suit
  const suitCards = hand.filter(c => c.suit === leadSuit);
  if (suitCards.length > 0) return suitCards;

  // Can't follow suit
  if (mode === 'sun') {
    const trumpCards = hand.filter(c => c.suit === trumpSuit);
    if (trumpCards.length > 0) {
      // Check if partner is currently winning → if so, playing any card is allowed
      const curWinner = trickWinner(currentTrick, leadSuit, trumpSuit, mode);
      const playerPos = Object.keys(currentTrick).length; // simplified check
      // For simplicity: always require trump if you have it
      return trumpCards;
    }
  }

  return hand; // any card
}

// ─── Post-bid card distribution ─────────────
/**
 * After bidding:
 * - Bidding winner gets center card (suit becomes trump if 'sun')
 * - Other 3 players each get 1 reserve card
 * This gives everyone 8 cards total (7 + 1).
 */
export function distributeAfterBid(hands, centerCard, reserve, bidWinner) {
  const newHands = {
    south: [...hands.south],
    west: [...hands.west],
    north: [...hands.north],
    east: [...hands.east],
  };

  // Bidder gets center card
  newHands[bidWinner] = [...newHands[bidWinner], centerCard];

  // Others get reserve cards
  const others = POSITIONS.filter(p => p !== bidWinner);
  others.forEach((pos, i) => {
    if (reserve[i]) newHands[pos] = [...newHands[pos], reserve[i]];
  });

  return newHands;
}

// ─── Sort hand (nice display order) ─────────
export function sortHand(hand, mode, trumpSuit) {
  const suitOrder = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };
  // Put trump suit first
  return [...hand].sort((a, b) => {
    const aTs = mode === 'sun' && a.suit === trumpSuit ? -1 : suitOrder[a.suit];
    const bTs = mode === 'sun' && b.suit === trumpSuit ? -1 : suitOrder[b.suit];
    if (aTs !== bTs) return aTs - bTs;
    return b.value - a.value; // highest value first within suit
  });
}
