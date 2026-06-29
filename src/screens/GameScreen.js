/**
 * KABOOT – Game Screen
 * Design: Crimson red background, dark navy center table,
 *         player avatars at N/S/W/E, fanned cards at bottom,
 *         bid buttons (حكم / سن / أشكل / بس) above hand.
 *
 * Baloot rules:
 *  - Deal 7 cards each + 1 center card shown
 *  - Bidding: حكم=accept suit as trump | سن=no-trump (شمس أشكل) | أشكل=choose other suit | بس=pass
 *  - After bid winner, each player gets 1 more card (bidder gets center)
 *  - Play 8 tricks; counting rules per Saudi Baloot
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Modal, Dimensions, StatusBar, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import PlayingCard from '../components/PlayingCard';
import { aiBid, aiPlayCard } from '../game/ai';
import {
  deal, distributeAfterBid, sortHand,
  cardPoints, totalDeckPoints, trickWinner,
  getValidCards, POSITIONS, TEAMS,
  SUIT_SYMBOLS, SUIT_NAMES_AR, isRed,
} from '../game/engine';

const { width: SW, height: SH } = Dimensions.get('window');
const RED   = '#C0202A';
const TABLE = '#171b26';

/* ─── Initial state ─────────────────────────────── */
const INIT = () => ({
  phase: 'dealing',
  hands: { south: [], west: [], north: [], east: [] },
  centerCard: null,
  reserve: [],
  mode: null,
  trumpSuit: null,
  declaringTeam: -1,
  leadSuit: null,
  currentPlayer: 0,
  currentTrick: {},
  trickCounts: { south: 0, west: 0, north: 0, east: 0 },
  pointsUs: 0,
  pointsThem: 0,
  selectedCard: null,
  bidPhase: { index: 0, bids: {}, hasBid: false, winner: null },
  matchScoreUs: 0,
  matchScoreThem: 0,
  roundNum: 1,
  roundsWonUs: 0,
  roundsWonThem: 0,
  roundResult: null,
});
const MAX_ROUNDS = 4;

/* ─── Bid labels shown near players ──────────────── */
const BID_LABELS = {
  hokm:   '⬤ حكم',
  sun:    '⬤ سن',
  ashkal: '⬤ أشكل',
  pass:   'بس',
};

export default function GameScreen({ navigation, route }) {
  const [gs, setGs]                 = useState(INIT());
  const [bidLabels, setBidLabels]   = useState({});
  const [showBid, setShowBid]       = useState(false);
  const [showSuitPick, setShowSuitPick] = useState(false);
  const [showScore, setShowScore]   = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [flashPos, setFlashPos]     = useState(null);

  const trophies = useRef(route.params?.trophies || 0);
  const gsRef    = useRef(gs);
  useEffect(() => { gsRef.current = gs; }, [gs]);

  /* ── Start on mount ── */
  useEffect(() => { startRound(INIT()); }, []);

  /* ─── Deal round ───────────────────────────────── */
  function startRound(base) {
    const d = deal();
    d.south = sortHand(d.south, null, null);
    setBidLabels({});
    setShowBid(false); setShowSuitPick(false);
    setShowScore(false); setShowGameOver(false);
    setGs({
      ...base,
      phase: 'bidding',
      hands: { south: d.south, west: d.west, north: d.north, east: d.east },
      centerCard: d.centerCard,
      reserve: d.reserve,
      mode: null, trumpSuit: null, declaringTeam: -1,
      leadSuit: null, currentPlayer: 0,
      currentTrick: {},
      trickCounts: { south: 0, west: 0, north: 0, east: 0 },
      pointsUs: 0, pointsThem: 0,
      selectedCard: null,
      bidPhase: { index: 0, bids: {}, hasBid: false, winner: null },
      roundResult: null,
    });
  }

  /* ─── Bidding phase ─────────────────────────────── */
  useEffect(() => {
    if (gs.phase !== 'bidding') return;
    const pos = POSITIONS[gs.bidPhase.index];
    if (!pos) {
      // All passed
      setTimeout(() => {
        Alert.alert('بس الكل!', 'لا مزايدة – يُعاد التوزيع', [
          { text: 'حسناً', onPress: () => startRound({ ...gsRef.current }) },
        ]);
      }, 300);
      return;
    }
    if (pos === 'south') {
      setShowBid(true);
    } else {
      const t = setTimeout(() => {
        // AI maps: aiBid returns 'sun'|'baloot'|'pass'
        // Map to our bid types
        const raw = aiBid(gsRef.current.hands[pos], gsRef.current.centerCard, gsRef.current.bidPhase.hasBid);
        const bid = raw === 'sun' ? 'hokm' : raw === 'baloot' ? 'sun' : 'pass';
        processBid(pos, bid);
      }, 700 + Math.random() * 600);
      return () => clearTimeout(t);
    }
  }, [gs.phase, gs.bidPhase.index]);

  function processBid(pos, bid) {
    setBidLabels(p => ({ ...p, [pos]: BID_LABELS[bid] || 'بس' }));

    if (bid === 'pass') {
      setGs(p => ({ ...p, bidPhase: { ...p.bidPhase, index: p.bidPhase.index + 1 } }));
      return;
    }

    if (bid === 'ashkal' && pos === 'south') {
      // Human wants to pick a different trump suit
      setShowBid(false);
      setShowSuitPick(true);
      return;
    }

    // bid is 'hokm' (center card suit) or 'sun' (no trump)
    const mode = bid === 'sun' ? 'baloot' : 'sun';
    const trumpSuit = bid === 'hokm' ? gsRef.current.centerCard.suit : null;
    finalizeBid(pos, mode, trumpSuit);
  }

  function finalizeBid(pos, mode, trumpSuit) {
    setShowBid(false);
    setShowSuitPick(false);
    setGs(p => {
      const newHands = distributeAfterBid(p.hands, p.centerCard, p.reserve, pos);
      newHands.south = sortHand(newHands.south, mode, trumpSuit);
      return {
        ...p,
        bidPhase: { ...p.bidPhase, hasBid: true, winner: pos },
        hands: newHands,
        mode,
        trumpSuit,
        declaringTeam: TEAMS[pos],
        currentPlayer: POSITIONS.indexOf(pos),
        phase: 'playing',
        leadSuit: null,
        currentTrick: {},
      };
    });
  }

  function humanBid(bid) {
    setShowBid(false);
    processBid('south', bid);
  }

  function humanPickSuit(suit) {
    setShowSuitPick(false);
    setBidLabels(p => ({ ...p, south: `⬤ ${SUIT_SYMBOLS[suit]}` }));
    finalizeBid('south', 'sun', suit);
  }

  /* ─── Playing phase ─────────────────────────────── */
  useEffect(() => {
    if (gs.phase !== 'playing') return;
    const pos = POSITIONS[gs.currentPlayer];
    if (pos === 'south') return;
    const t = setTimeout(() => {
      const cur = gsRef.current;
      const card = aiPlayCard(pos, cur.hands[pos], cur.leadSuit, cur.trumpSuit, cur.mode, cur.currentTrick);
      if (card) playCard(pos, card);
    }, 750 + Math.random() * 550);
    return () => clearTimeout(t);
  }, [gs.phase, gs.currentPlayer]);

  function playCard(pos, card) {
    setGs(p => {
      if (p.phase !== 'playing') return p;
      const newHand  = p.hands[pos].filter(c => c.id !== card.id);
      const newTrick = { ...p.currentTrick, [pos]: card };
      const leadSuit = Object.keys(p.currentTrick).length === 0 ? card.suit : p.leadSuit;
      const next = { ...p, hands: { ...p.hands, [pos]: newHand }, currentTrick: newTrick, leadSuit, selectedCard: null };
      if (Object.keys(newTrick).length === 4) return { ...next, phase: 'trickResolve' };
      return { ...next, currentPlayer: (POSITIONS.indexOf(pos) + 1) % 4 };
    });
  }

  /* ─── Trick resolution ──────────────────────────── */
  useEffect(() => {
    if (gs.phase !== 'trickResolve') return;
    const t = setTimeout(resolveTrick, 950);
    return () => clearTimeout(t);
  }, [gs.phase]);

  function resolveTrick() {
    setGs(p => {
      const { currentTrick, leadSuit, trumpSuit, mode, trickCounts, hands } = p;
      const winner     = trickWinner(currentTrick, leadSuit, trumpSuit, mode);
      const winnerTeam = TEAMS[winner];
      let pts = Object.values(currentTrick).reduce((s, c) => s + cardPoints(c, mode, trumpSuit), 0);
      const allEmpty = Object.values(hands).every(h => h.length === 0);
      if (allEmpty) pts += 10;

      const newTC = { ...trickCounts, [winner]: trickCounts[winner] + 1 };
      const newUs   = winnerTeam === 0 ? p.pointsUs + pts   : p.pointsUs;
      const newThem = winnerTeam === 1 ? p.pointsThem + pts : p.pointsThem;

      setFlashPos(winner);
      setTimeout(() => setFlashPos(null), 700);

      if (allEmpty) {
        return { ...p, trickCounts: newTC, pointsUs: newUs, pointsThem: newThem, currentTrick: {}, phase: 'roundEnd' };
      }
      return { ...p, trickCounts: newTC, pointsUs: newUs, pointsThem: newThem, currentTrick: {}, leadSuit: null, currentPlayer: POSITIONS.indexOf(winner), phase: 'playing' };
    });
  }

  /* ─── Round end ─────────────────────────────────── */
  useEffect(() => {
    if (gs.phase !== 'roundEnd') return;
    const { pointsUs, pointsThem, mode, trumpSuit, declaringTeam, trickCounts,
            matchScoreUs, matchScoreThem, roundNum, roundsWonUs, roundsWonThem } = gs;

    const deckPts = totalDeckPoints(mode, trumpSuit);
    const half    = Math.floor(deckPts / 2);
    const total   = pointsUs + pointsThem;
    const tricksUs   = trickCounts.south + trickCounts.north;
    const tricksThem = trickCounts.west  + trickCounts.east;
    const kabootUs   = tricksUs   === 8;
    const kabootThem = tricksThem === 8;

    let newUs = matchScoreUs, newThem = matchScoreThem, weWon = false;

    if (declaringTeam === 0) {
      if (pointsUs > half || kabootUs) {
        weWon = true;
        newUs   += pointsUs   + (kabootUs   ? 100 : 0);
        newThem += pointsThem;
      } else {
        newThem += total + (kabootThem ? 100 : 0);
      }
    } else {
      if (pointsThem > half || kabootThem) {
        newThem += pointsThem + (kabootThem ? 100 : 0);
        newUs   += pointsUs;
      } else {
        weWon = true;
        newUs += total + (kabootUs ? 100 : 0);
      }
    }

    const newRWUs   = weWon  ? roundsWonUs   + 1 : roundsWonUs;
    const newRWThem = !weWon ? roundsWonThem + 1 : roundsWonThem;

    let td = weWon ? 30 : -20;
    if (kabootUs   && weWon)  td = 60;
    if (kabootThem && !weWon) td = -40;
    const newTrophies = Math.max(0, trophies.current + td);
    trophies.current = newTrophies;
    AsyncStorage.setItem('kaboot_trophies', String(newTrophies));

    const isGameOver = roundNum >= MAX_ROUNDS || newUs >= 500 || newThem >= 500;

    const rr = { weWon, kabootUs, kabootThem, pointsUs, pointsThem,
                 deckPts, trophyDelta: td, newTrophies, mode, trumpSuit,
                 isGameOver, newScoreUs: newUs, newScoreThem: newThem,
                 newRoundsWonUs: newRWUs, newRoundsWonThem: newRWThem };

    setGs(p => ({ ...p, matchScoreUs: newUs, matchScoreThem: newThem,
                         roundsWonUs: newRWUs, roundsWonThem: newRWThem, roundResult: rr }));
    setTimeout(() => { if (isGameOver) setShowGameOver(true); else setShowScore(true); }, 500);
  }, [gs.phase]);

  /* ─── Human card tap ─────────────────────────────── */
  function tapCard(card) {
    if (gs.phase !== 'playing' || POSITIONS[gs.currentPlayer] !== 'south') return;
    const valid = getValidCards(gs.hands.south, gs.leadSuit, gs.trumpSuit, gs.mode, gs.currentTrick);
    if (!valid.some(c => c.id === card.id)) return;

    if (gs.selectedCard?.id === card.id) {
      playCard('south', card);
    } else {
      setGs(p => ({ ...p, selectedCard: card }));
    }
  }

  function nextRound() {
    const rr = gs.roundResult;
    setShowScore(false);
    startRound({
      ...INIT(),
      matchScoreUs:   rr.newScoreUs,
      matchScoreThem: rr.newScoreThem,
      roundsWonUs:    rr.newRoundsWonUs,
      roundsWonThem:  rr.newRoundsWonThem,
      roundNum: gs.roundNum + 1,
    });
  }

  /* ─── Derived values ─────────────────────────────── */
  const isMyTurn  = gs.phase === 'playing' && POSITIONS[gs.currentPlayer] === 'south';
  const validIds  = new Set(
    isMyTurn ? getValidCards(gs.hands.south, gs.leadSuit, gs.trumpSuit, gs.mode, gs.currentTrick).map(c=>c.id) : []
  );

  /* ─── Avatar component ──────────────────────────── */
  const Avatar = ({ label, score, small, color='#5c23a0' }) => (
    <View style={[styles.avatar, small && styles.avatarSm, { backgroundColor: color }]}>
      <Text style={[styles.avatarIcon, small && { fontSize: 14 }]}>👤</Text>
      {!small && <Text style={styles.avatarName}>{label}</Text>}
      {!small && (
        <View style={styles.trophyChip}>
          <Text style={styles.trophyChipText}>🏆 {score ?? 0}</Text>
        </View>
      )}
    </View>
  );

  /* ─── Score card / table indicator ─────────────────── */
  const scoreBar = (
    <View style={styles.scoreBar}>
      <View style={styles.scoreBlock}>
        <Text style={styles.scoreTeam}>لنا</Text>
        <Text style={styles.scoreNum}>{gs.matchScoreUs}</Text>
      </View>
      <View style={styles.scoreDivider} />
      <View style={styles.scoreBlock}>
        <Text style={styles.scoreTeam}>لهم</Text>
        <Text style={styles.scoreNum}>{gs.matchScoreThem}</Text>
      </View>
    </View>
  );

  /* ═════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════ */
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      {/* ── TOP HEADER ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.quitBtn}
          onPress={() => Alert.alert('خروج', 'هل تريد الخروج؟', [
            { text: 'لا', style: 'cancel' },
            { text: 'نعم', style: 'destructive', onPress: () => navigation.replace('Home') },
          ])}
        >
          <Text style={styles.quitIcon}>✕</Text>
        </TouchableOpacity>

        {scoreBar}

        <Text style={styles.roundBadge}>يد {gs.roundNum}</Text>
      </View>

      {/* ── PARTNER (NORTH) ── */}
      <View style={styles.northArea}>
        <Avatar label="الشريك" score={gs.trickCounts.north} color="#5c23a0" />
        <View style={styles.partnerBadge}>
          <Text style={styles.partnerBadgeTxt}>
            الشريك {gs.trickCounts.north > 0 ? `· ${gs.trickCounts.north}✓` : ''}
          </Text>
        </View>
      </View>

      {/* ── CENTER TABLE ── */}
      <View style={styles.tableWrap}>
        {/* West cards stacked */}
        <View style={styles.sideWest}>
          <View style={styles.sideAvatar}>
            <Avatar label="م١" score={gs.trickCounts.west} small color="#5c23a0" />
            {bidLabels.west && <View style={styles.bidPop}><Text style={styles.bidPopTxt}>{bidLabels.west}</Text></View>}
          </View>
          <View style={styles.sideCards}>
            {gs.hands.west.map((_, i) => (
              <View key={i} style={[styles.sideCard, { top: i * 4, left: i * 2 }]} />
            ))}
          </View>
        </View>

        {/* Table felt */}
        <View style={styles.table}>
          {/* Bid phase: show center card prominently */}
          {gs.phase === 'bidding' && gs.centerCard && (
            <View style={styles.centerCardArea}>
              <Text style={styles.centerCardHint}>الورقة المقترحة</Text>
              <PlayingCard card={gs.centerCard} size="lg" />
              <Text style={[styles.centerSuitLabel, { color: isRed(gs.centerCard.suit) ? '#ff4444' : '#fff' }]}>
                {SUIT_SYMBOLS[gs.centerCard.suit]}  {SUIT_NAMES_AR[gs.centerCard.suit]}
              </Text>
              {/* Show who bid what above the card */}
              {Object.entries(bidLabels).map(([pos, label]) => (
                <View key={pos} style={styles.bidFloatLabel}>
                  <Text style={styles.bidFloatTxt}>{label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Play phase: trick cards placed N/W/E/S */}
          {(gs.phase === 'playing' || gs.phase === 'trickResolve') && (
            <View style={styles.trickArea}>
              <View style={styles.trickNorth}>
                {gs.currentTrick.north && <PlayingCard card={gs.currentTrick.north} size="md" />}
              </View>
              <View style={styles.trickMiddleRow}>
                <View style={styles.trickSide}>
                  {gs.currentTrick.west && <PlayingCard card={gs.currentTrick.west} size="md" />}
                </View>
                <View style={styles.trickCenter}>
                  {/* Trump pill */}
                  {gs.mode && (
                    <View style={styles.trumpPill}>
                      <Text style={[styles.trumpPillTxt, { color: gs.trumpSuit && isRed(gs.trumpSuit) ? '#ff6b6b' : '#ffd700' }]}>
                        {gs.mode === 'sun' ? `${SUIT_SYMBOLS[gs.trumpSuit]}` : '⭐'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.trickSide}>
                  {gs.currentTrick.east && <PlayingCard card={gs.currentTrick.east} size="md" />}
                </View>
              </View>
              <View style={styles.trickSouth}>
                {gs.currentTrick.south && <PlayingCard card={gs.currentTrick.south} size="md" />}
              </View>
            </View>
          )}

          {/* Flash overlay when trick won */}
          {flashPos && (
            <View style={[styles.flashOverlay, { backgroundColor: TEAMS[flashPos] === 0 ? 'rgba(76,175,80,0.3)' : 'rgba(244,67,54,0.3)' }]}>
              <Text style={styles.flashTxt}>
                {TEAMS[flashPos] === 0 ? '✅ نقطة لنا!' : '❌ نقطة لهم'}
              </Text>
            </View>
          )}

          {/* Partner cards top of table */}
          <View style={styles.partnerHandOnTable}>
            {gs.hands.north.map((_, i) => (
              <View key={i} style={[styles.tableCardBack, { marginLeft: i > 0 ? -18 : 0 }]} />
            ))}
          </View>
        </View>

        {/* East cards stacked */}
        <View style={styles.sideEast}>
          <View style={styles.sideAvatar}>
            <Avatar label="م٢" score={gs.trickCounts.east} small color="#5c23a0" />
            {bidLabels.east && <View style={styles.bidPop}><Text style={styles.bidPopTxt}>{bidLabels.east}</Text></View>}
          </View>
          <View style={styles.sideCards}>
            {gs.hands.east.map((_, i) => (
              <View key={i} style={[styles.sideCard, { top: i * 4, right: i * 2 }]} />
            ))}
          </View>
        </View>
      </View>

      {/* ── OPPONENT LABELS (below table) ── */}
      <View style={styles.opponentRow}>
        <View style={styles.oppChip}>
          <Text style={styles.oppChipP}>P1</Text>
          <Text style={styles.oppChipName}>خصم ١</Text>
          {bidLabels.west && (
            <View style={styles.bidBubbleInline}>
              <Text style={styles.bidBubbleInlineTxt}>{bidLabels.west}</Text>
            </View>
          )}
        </View>
        <View style={styles.oppChip}>
          <Text style={styles.oppChipP}>P3</Text>
          <Text style={styles.oppChipName}>خصم ٢</Text>
          {bidLabels.east && (
            <View style={styles.bidBubbleInline}>
              <Text style={styles.bidBubbleInlineTxt}>{bidLabels.east}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── BID BUTTONS (shown during bidding phase) ── */}
      {gs.phase === 'bidding' && POSITIONS[gs.bidPhase.index] === 'south' && (
        <View style={styles.bidRow}>
          <TouchableOpacity style={[styles.bidBtn, { backgroundColor: '#d4810a' }]} onPress={() => humanBid('hokm')}>
            <Text style={styles.bidBtnTxt}>حكم</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bidBtn, { backgroundColor: '#1a7a3a' }]} onPress={() => humanBid('sun')}>
            <Text style={styles.bidBtnTxt}>سن</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bidBtn, { backgroundColor: '#5c23a0' }]} onPress={() => humanBid('ashkal')}>
            <Text style={styles.bidBtnTxt}>أشكل</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bidBtn, { backgroundColor: '#444' }]} onPress={() => humanBid('pass')}>
            <Text style={styles.bidBtnTxt}>بس</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── HUMAN HAND (fanned at bottom) ── */}
      <View style={styles.humanArea}>
        <View style={styles.youChip}>
          <Text style={styles.youChipLabel}>YOU</Text>
          <Text style={styles.youChipName}>أنت</Text>
          <View style={styles.youTrophyChip}>
            <Text style={styles.youTrophyTxt}>{trophies.current}</Text>
          </View>
        </View>

        {bidLabels.south && (
          <View style={[styles.bidPop, { alignSelf: 'center', marginBottom: 4 }]}>
            <Text style={styles.bidPopTxt}>{bidLabels.south}</Text>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.handRow}
        >
          {gs.hands.south.map((card, i) => {
            const isValid = isMyTurn && validIds.has(card.id);
            const isDimmed = isMyTurn && !isValid;
            const isSel = gs.selectedCard?.id === card.id;
            const isTrump = gs.mode === 'sun' && card.suit === gs.trumpSuit;
            return (
              <TouchableOpacity
                key={card.id}
                onPress={() => tapCard(card)}
                activeOpacity={0.8}
                style={[styles.cardWrap, isSel && styles.cardWrapSel]}
              >
                <PlayingCard card={card} size="md" selected={isSel} dimmed={isDimmed} isTrump={isTrump} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {isMyTurn && (
          <Text style={styles.turnHint}>اضغط مرتين للعب الورقة</Text>
        )}
      </View>

      {/* ══════ SUIT PICK MODAL (أشكل) ══════ */}
      <Modal visible={showSuitPick} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>اختر لون الحكم</Text>
            <View style={styles.suitGrid}>
              {[['hearts','♥',true],['diamonds','♦',true],['clubs','♣',false],['spades','♠',false]].map(([s,sym,red])=>(
                <TouchableOpacity key={s} style={styles.suitBtn} onPress={() => humanPickSuit(s)}>
                  <Text style={[styles.suitSym, { color: red ? '#d32f2f' : '#111' }]}>{sym}</Text>
                  <Text style={styles.suitName}>{SUIT_NAMES_AR[s]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════ SCORE MODAL ══════ */}
      {gs.roundResult && (
        <Modal visible={showScore} transparent animationType="slide">
          <View style={styles.overlay}>
            <View style={[styles.modalBox, { paddingBottom: 28 }]}>
              <Text style={[styles.resultTitle, { color: gs.roundResult.weWon ? '#4caf50' : '#ef5350' }]}>
                {gs.roundResult.kabootUs ? '🏆 كابوت! كل الأوراق!' :
                 gs.roundResult.kabootThem ? '💀 كابوت عليكم' :
                 gs.roundResult.weWon ? '✅ فاز فريقك!' : '❌ خسر فريقك'}
              </Text>

              <Text style={styles.modePill}>
                {gs.roundResult.mode === 'sun'
                  ? `حكم ${SUIT_SYMBOLS[gs.roundResult.trumpSuit]}`
                  : 'سن (بدون حكم)'}
              </Text>

              <View style={styles.ptsRow}>
                <View style={styles.ptsBox}>
                  <Text style={styles.ptsLabel}>نقاطنا</Text>
                  <Text style={[styles.ptsVal, { color: '#ffd700' }]}>{gs.roundResult.pointsUs}</Text>
                </View>
                <Text style={styles.ptsVs}>vs</Text>
                <View style={styles.ptsBox}>
                  <Text style={styles.ptsLabel}>نقاطهم</Text>
                  <Text style={[styles.ptsVal, { color: '#fff' }]}>{gs.roundResult.pointsThem}</Text>
                </View>
              </View>

              {(gs.roundResult.kabootUs || gs.roundResult.kabootThem) && (
                <View style={styles.bonusChip}>
                  <Text style={styles.bonusChipTxt}>🌟 بونص كابوت +100</Text>
                </View>
              )}

              <Text style={[styles.trophyDelta, { color: gs.roundResult.trophyDelta >= 0 ? '#ffd700' : '#ef5350' }]}>
                {gs.roundResult.trophyDelta >= 0 ? '+' : ''}{gs.roundResult.trophyDelta} 🏆
              </Text>

              <View style={styles.totalLine}>
                <Text style={styles.totalItem}>إجمالي لنا: <Text style={{ color: '#ffd700', fontWeight: '800' }}>{gs.roundResult.newScoreUs}</Text></Text>
                <Text style={styles.totalItem}>إجمالي لهم: <Text style={{ color: '#fff', fontWeight: '800' }}>{gs.roundResult.newScoreThem}</Text></Text>
              </View>

              <TouchableOpacity style={styles.nextBtn} onPress={nextRound}>
                <Text style={styles.nextBtnTxt}>الجولة التالية ▶</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ══════ GAME OVER MODAL ══════ */}
      {gs.roundResult && (
        <Modal visible={showGameOver} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={[styles.modalBox, { paddingBottom: 28 }]}>
              <Text style={{ fontSize: 60, textAlign: 'center' }}>
                {gs.roundResult.newScoreUs >= gs.roundResult.newScoreThem ? '🏆' : '😢'}
              </Text>
              <Text style={[styles.resultTitle, {
                color: gs.roundResult.newScoreUs >= gs.roundResult.newScoreThem ? '#ffd700' : '#ef5350',
                fontSize: 28,
              }]}>
                {gs.roundResult.newScoreUs > gs.roundResult.newScoreThem ? 'فاز فريقك!'
                 : gs.roundResult.newScoreUs === gs.roundResult.newScoreThem ? 'تعادل!'
                 : 'خسر فريقك'}
              </Text>
              <View style={styles.ptsRow}>
                <View style={styles.ptsBox}>
                  <Text style={styles.ptsLabel}>أنتم</Text>
                  <Text style={[styles.ptsVal, { color: '#ffd700', fontSize: 40 }]}>{gs.roundResult.newScoreUs}</Text>
                </View>
                <Text style={styles.ptsVs}>vs</Text>
                <View style={styles.ptsBox}>
                  <Text style={styles.ptsLabel}>الخصوم</Text>
                  <Text style={[styles.ptsVal, { color: '#fff', fontSize: 40 }]}>{gs.roundResult.newScoreThem}</Text>
                </View>
              </View>
              <View style={styles.bonusChip}>
                <Text style={styles.bonusChipTxt}>رصيد الكؤوس: {gs.roundResult.newTrophies} 🏆</Text>
              </View>
              <TouchableOpacity style={styles.nextBtn} onPress={() => { setShowGameOver(false); navigation.replace('Home'); }}>
                <Text style={styles.nextBtnTxt}>🏠 العودة للقائمة</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

/* ─── Styles ──────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: RED },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 14,
  },
  quitBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  quitIcon: { color: '#fff', fontSize: 14, fontWeight: '700' },
  scoreBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  scoreBlock: { paddingHorizontal: 18, paddingVertical: 6, alignItems: 'center' },
  scoreTeam: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  scoreNum:  { color: '#ffd700', fontSize: 22, fontWeight: '900', lineHeight: 26 },
  scoreDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },
  roundBadge: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '600' },

  /* North (partner) */
  northArea: { alignItems: 'center', marginBottom: 4, gap: 4 },
  partnerBadge: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  partnerBadgeTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },

  /* Avatar */
  avatar: {
    width: 62, height: 62, borderRadius: 31,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  avatarSm: { width: 38, height: 38, borderRadius: 19 },
  avatarIcon: { fontSize: 22, color: 'rgba(255,255,255,0.8)' },
  avatarName: { color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 1 },
  trophyChip: {
    backgroundColor: '#d4810a',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 2,
  },
  trophyChipText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  /* Table + sides */
  tableWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    flex: 1,
  },
  sideWest: { width: 56, alignItems: 'center', gap: 6, zIndex: 2 },
  sideEast: { width: 56, alignItems: 'center', gap: 6, zIndex: 2 },
  sideAvatar: { alignItems: 'center', gap: 3 },
  sideCards: { position: 'relative', width: 34, height: 80 },
  sideCard: {
    position: 'absolute',
    width: 28, height: 40,
    backgroundColor: '#e8e8e8',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },

  /* Table felt */
  table: {
    flex: 1,
    backgroundColor: TABLE,
    borderRadius: 20,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },

  /* Partner cards on table */
  partnerHandOnTable: {
    position: 'absolute',
    top: 8,
    flexDirection: 'row',
  },
  tableCardBack: {
    width: 32, height: 48,
    backgroundColor: '#e8e8e8',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    marginLeft: -18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },

  /* Center card during bidding */
  centerCardArea: { alignItems: 'center', gap: 6 },
  centerCardHint: { color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1 },
  centerSuitLabel: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  bidFloatLabel: {
    backgroundColor: '#5c23a0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  bidFloatTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  /* Trick area */
  trickArea: { alignItems: 'center', gap: 2, paddingVertical: 4 },
  trickNorth: { minHeight: 68, alignItems: 'center' },
  trickMiddleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trickSide: { width: 50, alignItems: 'center' },
  trickCenter: { width: 40, alignItems: 'center' },
  trickSouth: { minHeight: 68, alignItems: 'center' },
  trumpPill: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trumpPillTxt: { fontSize: 18, fontWeight: '800' },

  /* Flash overlay */
  flashOverlay: {
    position: 'absolute',
    inset: 0,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

  /* Bid pop */
  bidPop: {
    backgroundColor: '#5c23a0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bidPopTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },

  /* Opponent row */
  opponentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 6,
    gap: 8,
  },
  oppChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  oppChipP: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  oppChipName: { color: 'rgba(255,255,255,0.7)', fontSize: 12, flex: 1 },
  bidBubbleInline: { backgroundColor: '#5c23a0', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  bidBubbleInlineTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },

  /* Bid buttons */
  bidRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  bidBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  bidBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '900' },

  /* Human hand */
  humanArea: {
    paddingBottom: 20,
    paddingTop: 8,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    gap: 4,
  },
  youChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#5c23a0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 2,
  },
  youChipLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  youChipName: { color: '#fff', fontSize: 13, fontWeight: '700' },
  youTrophyChip: {
    backgroundColor: '#d4810a',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  youTrophyTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  handRow: { paddingHorizontal: 10, gap: 6 },
  cardWrap: { marginVertical: 4 },
  cardWrapSel: { marginBottom: 18 },
  turnHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },

  /* Modals */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 22,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },

  /* Suit picker */
  suitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  suitBtn: {
    width: '45%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 4,
  },
  suitSym: { fontSize: 36, fontWeight: '800' },
  suitName: { fontSize: 13, fontWeight: '600', color: '#333' },

  /* Score modal */
  resultTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  modePill: { color: 'rgba(255,255,255,0.55)', fontSize: 13, textAlign: 'center' },
  ptsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 16, gap: 10 },
  ptsBox: { flex: 1, alignItems: 'center' },
  ptsLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  ptsVal: { fontSize: 36, fontWeight: '900', lineHeight: 42 },
  ptsVs: { color: 'rgba(255,255,255,0.3)', fontSize: 18 },
  bonusChip: { backgroundColor: 'rgba(255,215,0,0.12)', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  bonusChipTxt: { color: '#ffd700', fontWeight: '700', fontSize: 13 },
  trophyDelta: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between' },
  totalItem: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  nextBtn: {
    backgroundColor: '#ffd700',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  nextBtnTxt: { color: '#0d0618', fontSize: 18, fontWeight: '900' },
});
