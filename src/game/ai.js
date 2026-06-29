// ═══════════════════════════════════════════
//  KABOOT – AI Player Logic
// ═══════════════════════════════════════════
import {
  cardPoints, cardStrength, getValidCards, trickWinner, TEAMS,
} from './engine';

// ─── AI Bidding Decision ─────────────────────
/**
 * centerCard: the face-up card whose suit is the proposed trump
 * hasBid: whether someone has already bid (if true, only 'pass' makes sense)
 *
 * Returns: 'sun' | 'baloot' | 'pass'
 */
export function aiBid(hand, centerCard, hasBid) {
  if (hasBid) return 'pass'; // first-to-bid wins; others just pass

  const centerSuit = centerCard.suit;

  // Score the hand assuming center suit as trump
  let sunScore = 0;
  let balootScore = 0;
  const suitCounts = {};

  for (const card of hand) {
    balootScore += cardPoints(card, 'baloot', null);
    sunScore += cardPoints(card, 'sun', centerSuit);
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
  }

  const hasJackTrump = hand.some(c => c.suit === centerSuit && c.value === 11);
  const hasNineTrump = hand.some(c => c.suit === centerSuit && c.value === 9);
  const trumpCount = suitCounts[centerSuit] || 0;

  // Very strong trump hand → bid Sun
  if (sunScore >= 60 && (hasJackTrump || hasNineTrump)) return 'sun';
  if (sunScore >= 50 && hasJackTrump && hasNineTrump) return 'sun';
  if (sunScore >= 55 && trumpCount >= 3) return 'sun';

  // Very strong overall hand → bid Baloot (brave move, high points)
  if (balootScore >= 70) return 'baloot';

  // Decent trump hand
  if (sunScore >= 44 && (hasJackTrump || hasNineTrump) && trumpCount >= 2) return 'sun';

  return 'pass';
}

// ─── AI Card Play Decision ───────────────────
/**
 * Decides which card the AI should play.
 * Strategy:
 *   - If leading: play highest scoring card (often a trump or high card)
 *   - If partner winning: dump lowest value card to save high cards
 *   - If opponent winning: try to beat them, otherwise dump lowest
 */
export function aiPlayCard(pos, hand, leadSuit, trumpSuit, mode, currentTrick) {
  const valid = getValidCards(hand, leadSuit, trumpSuit, mode, currentTrick);

  // Leading the trick
  if (Object.keys(currentTrick).length === 0 || !leadSuit) {
    // Play highest value card; prefer non-trump first unless only trump
    const nonTrump = valid.filter(c => mode !== 'sun' || c.suit !== trumpSuit);
    const pool = nonTrump.length > 0 ? nonTrump : valid;
    return [...pool].sort((a, b) =>
      cardPoints(b, mode, trumpSuit) - cardPoints(a, mode, trumpSuit)
    )[0];
  }

  // Determine who is currently winning
  const curWinner = Object.keys(currentTrick).length > 0
    ? trickWinner(currentTrick, leadSuit, trumpSuit, mode)
    : null;
  const partnerOf = { south: 'north', north: 'south', west: 'east', east: 'west' };
  const partnerWinning = curWinner && TEAMS[curWinner] === TEAMS[pos];

  if (partnerWinning) {
    // Partner is winning → contribute lowest-value card (save good cards)
    return [...valid].sort((a, b) =>
      cardPoints(a, mode, trumpSuit) - cardPoints(b, mode, trumpSuit)
    )[0];
  }

  // Opponent winning → try to beat them
  const byStrength = [...valid].sort((a, b) =>
    cardStrength(b, leadSuit, trumpSuit, mode) - cardStrength(a, leadSuit, trumpSuit, mode)
  );
  const bestCard = byStrength[0];
  const bestStr = cardStrength(bestCard, leadSuit, trumpSuit, mode);
  const winnerStr = curWinner
    ? cardStrength(currentTrick[curWinner], leadSuit, trumpSuit, mode)
    : -1;

  if (bestStr > winnerStr) return bestCard; // can beat current winner
  return byStrength[byStrength.length - 1]; // can't win, throw lowest
}
