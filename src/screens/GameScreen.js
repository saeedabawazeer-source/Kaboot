/**
 * KABOOT – Game Screen
 * Branding: 60% Red (#C0202A) | 30% Purple (#5c23a0) | 10% Black (#0d0d0d)
 *
 * Layout (top → bottom):
 *  ┌─ TOP BAR: [⚙️][🔊]  [لنا 0 | لهم 0]  [😊] ─┐
 *  │  PARTNER avatar + name + face-down hand        │
 *  │  ┌─────────────────────────────────────┐       │
 *  │  │  OPP1   [CENTER / TRICK AREA]  OPP2 │       │
 *  │  └─────────────────────────────────────┘       │
 *  │  Opponent labels row                           │
 *  │  [حكم] [سن] [أشكل] [بس]  ← bid phase only     │
 *  │  ── HAND CARDS (horizontal scroll, XL) ──      │
 *  └─ YOU chip ─────────────────────────────────────┘
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Modal, Dimensions, StatusBar, Alert, Animated,
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
const RED    = '#C0202A';
const PURPLE = '#5c23a0';
const BLACK  = '#0d0d0d';
const TABLE  = '#171b26';

/* ─── Helpers ─────────────────────────────────── */
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

const BID_LABEL = {
  hokm:   'حكم',
  sun:    'سن',
  ashkal: 'أشكل',
  pass:   'بس',
};

/* ─── Avatar (purple circle) ─────────────────── */
function Avatar({ size = 56, label, trophy, isActive, dealerBadge }) {
  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <View style={[
        av.circle,
        { width: size, height: size, borderRadius: size / 2 },
        isActive && av.activeCircle,
      ]}>
        <Text style={[av.icon, { fontSize: size * 0.42 }]}>👤</Text>
      </View>
      {label && <Text style={av.name}>{label}</Text>}
      {dealerBadge && (
        <View style={av.dealerBadge}><Text style={av.dealerTxt}>الموزع</Text></View>
      )}
      {trophy !== undefined && (
        <View style={av.trophyRow}>
          <Text style={av.trophyTxt}>🏆 {trophy}</Text>
        </View>
      )}
    </View>
  );
}
const av = StyleSheet.create({
  circle: {
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  activeCircle: {
    borderColor: '#ffd700',
    borderWidth: 2.5,
    shadowColor: '#ffd700',
    shadowOpacity: 0.6,
  },
  icon: { color: 'rgba(255,255,255,0.85)' },
  name: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  trophyRow: {
    backgroundColor: '#d4810a',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  trophyTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  dealerBadge: {
    backgroundColor: BLACK,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 1,
  },
  dealerTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
});

/* ─── Face-down card stack ────────────────────── */
function CardStack({ count = 0, horizontal = false }) {
  if (count === 0) return <View style={{ width: 36, height: 54 }} />;
  const shown = Math.min(count, 5);
  return (
    <View style={{ position: 'relative', width: horizontal ? 36 + shown * 5 : 40, height: horizontal ? 54 : 54 + shown * 4 }}>
      {Array.from({ length: shown }).map((_, i) => (
        <View key={i} style={[
          fdS.card,
          horizontal
            ? { left: i * 5, top: 0 }
            : { top: i * 4, left: 0 },
        ]} />
      ))}
    </View>
  );
}
const fdS = StyleSheet.create({
  card: {
    position: 'absolute',
    width: 36, height: 54,
    backgroundColor: '#4a1480',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
});

/* ─── Bid bubble ─────────────────────────────── */
function BidBubble({ label }) {
  if (!label) return null;
  const isPurple = label !== 'بس';
  return (
    <View style={[bb.wrap, isPurple ? bb.purple : bb.gray]}>
      <Text style={bb.txt}>{label}</Text>
    </View>
  );
}
const bb = StyleSheet.create({
  wrap: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  purple: { backgroundColor: PURPLE },
  gray: { backgroundColor: '#555' },
  txt: { color: '#fff', fontSize: 13, fontWeight: '800' },
});

/* ══════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════ */
export default function GameScreen({ navigation, route }) {
  const [gs, setGs] = useState(INIT());
  const [bidLabels, setBidLabels] = useState({});
  const [showSuitPick, setShowSuitPick] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [flashWinner, setFlashWinner] = useState(null);  // 'us' | 'them'

  const trophies = useRef(route.params?.trophies ?? 0);
  const gsRef = useRef(gs);
  useEffect(() => { gsRef.current = gs; }, [gs]);

  /* Mount */
  useEffect(() => { startRound(INIT()); }, []);

  /* ── Deal ── */
  function startRound(base) {
    const d = deal();
    d.south = sortHand(d.south, null, null);
    setBidLabels({});
    setShowSuitPick(false);
    setShowScore(false);
    setShowGameOver(false);
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

  /* ── Bidding phase controller ── */
  useEffect(() => {
    if (gs.phase !== 'bidding') return;
    const pos = POSITIONS[gs.bidPhase.index];
    if (!pos) {
      // All passed → re-deal
      setTimeout(() => {
        Alert.alert('بس الكل!', 'لا مزايدة — يُعاد التوزيع', [
          { text: 'حسناً', onPress: () => startRound({ ...gsRef.current }) },
        ]);
      }, 400);
      return;
    }
    if (pos !== 'south') {
      const t = setTimeout(() => {
        const cur = gsRef.current;
        const raw = aiBid(cur.hands[pos], cur.centerCard, cur.bidPhase.hasBid);
        // aiBid returns 'sun'(=accept trump) | 'baloot'(=no trump) | 'pass'
        const bid = raw === 'sun' ? 'hokm' : raw === 'baloot' ? 'sun' : 'pass';
        processBid(pos, bid);
      }, 700 + Math.random() * 500);
      return () => clearTimeout(t);
    }
    // South = human, bid buttons shown in render
  }, [gs.phase, gs.bidPhase.index]);

  function processBid(pos, bid) {
    setBidLabels(p => ({ ...p, [pos]: BID_LABEL[bid] || 'بس' }));
    if (bid === 'pass') {
      setGs(p => ({ ...p, bidPhase: { ...p.bidPhase, index: p.bidPhase.index + 1 } }));
      return;
    }
    if (bid === 'ashkal' && pos === 'south') {
      setShowSuitPick(true);
      return;
    }
    const mode      = bid === 'sun' ? 'baloot' : 'sun';
    const trumpSuit = bid === 'hokm' ? gsRef.current.centerCard.suit : null;
    finalizeBid(pos, mode, trumpSuit);
  }

  function finalizeBid(pos, mode, trumpSuit) {
    setShowSuitPick(false);
    setGs(p => {
      const nh = distributeAfterBid(p.hands, p.centerCard, p.reserve, pos);
      nh.south = sortHand(nh.south, mode, trumpSuit);
      return {
        ...p,
        bidPhase: { ...p.bidPhase, hasBid: true, winner: pos },
        hands: nh, mode, trumpSuit,
        declaringTeam: TEAMS[pos],
        currentPlayer: POSITIONS.indexOf(pos),
        phase: 'playing', leadSuit: null, currentTrick: {},
      };
    });
  }

  function humanBid(bid) { processBid('south', bid); }
  function humanPickSuit(suit) {
    setBidLabels(p => ({ ...p, south: SUIT_SYMBOLS[suit] }));
    finalizeBid('south', 'sun', suit);
  }

  /* ── Playing phase: AI turns ── */
  useEffect(() => {
    if (gs.phase !== 'playing') return;
    const pos = POSITIONS[gs.currentPlayer];
    if (pos === 'south') return;
    const t = setTimeout(() => {
      const c = gsRef.current;
      const card = aiPlayCard(pos, c.hands[pos], c.leadSuit, c.trumpSuit, c.mode, c.currentTrick);
      if (card) playCard(pos, card);
    }, 800 + Math.random() * 500);
    return () => clearTimeout(t);
  }, [gs.phase, gs.currentPlayer]);

  function playCard(pos, card) {
    setGs(p => {
      if (p.phase !== 'playing') return p;
      const newHand  = p.hands[pos].filter(c => c.id !== card.id);
      const newTrick = { ...p.currentTrick, [pos]: card };
      const leadSuit = Object.keys(p.currentTrick).length === 0 ? card.suit : p.leadSuit;
      const next     = { ...p, hands: { ...p.hands, [pos]: newHand }, currentTrick: newTrick, leadSuit, selectedCard: null };
      if (Object.keys(newTrick).length === 4) return { ...next, phase: 'trickResolve' };
      return { ...next, currentPlayer: (POSITIONS.indexOf(pos) + 1) % 4 };
    });
  }

  /* ── Trick resolution ── */
  useEffect(() => {
    if (gs.phase !== 'trickResolve') return;
    const t = setTimeout(resolveTrick, 1000);
    return () => clearTimeout(t);
  }, [gs.phase]);

  function resolveTrick() {
    setGs(p => {
      const { currentTrick, leadSuit, trumpSuit, mode, trickCounts, hands } = p;
      const winner     = trickWinner(currentTrick, leadSuit, trumpSuit, mode);
      const winnerTeam = TEAMS[winner];
      let pts = Object.values(currentTrick).reduce((s, c) => s + cardPoints(c, mode, trumpSuit), 0);
      const allEmpty = Object.values(hands).every(h => h.length === 0);
      if (allEmpty) pts += 10; // last trick bonus

      const newTC   = { ...trickCounts, [winner]: trickCounts[winner] + 1 };
      const newUs   = winnerTeam === 0 ? p.pointsUs   + pts : p.pointsUs;
      const newThem = winnerTeam === 1 ? p.pointsThem + pts : p.pointsThem;

      setFlashWinner(winnerTeam === 0 ? 'us' : 'them');
      setTimeout(() => setFlashWinner(null), 700);

      if (allEmpty) {
        return { ...p, trickCounts: newTC, pointsUs: newUs, pointsThem: newThem, currentTrick: {}, phase: 'roundEnd' };
      }
      return { ...p, trickCounts: newTC, pointsUs: newUs, pointsThem: newThem, currentTrick: {}, leadSuit: null, currentPlayer: POSITIONS.indexOf(winner), phase: 'playing' };
    });
  }

  /* ── Round end ── */
  useEffect(() => {
    if (gs.phase !== 'roundEnd') return;
    const { pointsUs, pointsThem, mode, trumpSuit, declaringTeam, trickCounts,
            matchScoreUs, matchScoreThem, roundNum, roundsWonUs, roundsWonThem } = gs;

    const deckPts    = totalDeckPoints(mode, trumpSuit);
    const half       = Math.floor(deckPts / 2);
    const total      = pointsUs + pointsThem;
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
    if (kabootUs   && weWon)  td =  60;
    if (kabootThem && !weWon) td = -40;
    const newTrophies = Math.max(0, trophies.current + td);
    trophies.current  = newTrophies;
    AsyncStorage.setItem('kaboot_trophies', String(newTrophies));

    const isGameOver = roundNum >= MAX_ROUNDS || newUs >= 500 || newThem >= 500;
    const rr = {
      weWon, kabootUs, kabootThem, pointsUs, pointsThem, deckPts,
      trophyDelta: td, newTrophies, mode, trumpSuit, isGameOver,
      newScoreUs: newUs, newScoreThem: newThem,
      newRoundsWonUs: newRWUs, newRoundsWonThem: newRWThem,
    };

    setGs(p => ({ ...p, matchScoreUs: newUs, matchScoreThem: newThem,
                         roundsWonUs: newRWUs, roundsWonThem: newRWThem, roundResult: rr }));
    setTimeout(() => { isGameOver ? setShowGameOver(true) : setShowScore(true); }, 600);
  }, [gs.phase]);

  /* ── Human card tap ── */
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

  /* ── Derived ── */
  const isMyTurn = gs.phase === 'playing' && POSITIONS[gs.currentPlayer] === 'south';
  const validIds = new Set(
    isMyTurn ? getValidCards(gs.hands.south, gs.leadSuit, gs.trumpSuit, gs.mode, gs.currentTrick).map(c => c.id) : []
  );
  const isBidding        = gs.phase === 'bidding';
  const isHumanBidTurn   = isBidding && POSITIONS[gs.bidPhase.index] === 'south';
  const currentPlayerPos = POSITIONS[gs.currentPlayer];

  /* ══ RENDER ══════════════════════════════════ */
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      {/* ────── TOP BAR ────── */}
      <View style={s.topBar}>
        <View style={s.topLeft}>
          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => Alert.alert('خروج', 'هل تريد الخروج؟', [
              { text: 'لا', style: 'cancel' },
              { text: 'نعم', style: 'destructive', onPress: () => navigation.replace('Home') },
            ])}
          >
            <Text style={s.iconTxt}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn}>
            <Text style={s.iconTxt}>🔊</Text>
          </TouchableOpacity>
        </View>

        <View style={s.scoreWidget}>
          <View style={s.scoreCol}>
            <Text style={s.scoreLabelTxt}>لنا</Text>
            <Text style={s.scoreNumTxt}>{gs.matchScoreUs}</Text>
          </View>
          <View style={s.scoreSep} />
          <View style={s.scoreCenter}>
            <Text style={s.scoreHandTxt}>يد {gs.roundNum}</Text>
          </View>
          <View style={s.scoreSep} />
          <View style={s.scoreCol}>
            <Text style={s.scoreLabelTxt}>لهم</Text>
            <Text style={s.scoreNumTxt}>{gs.matchScoreThem}</Text>
          </View>
        </View>

        <TouchableOpacity style={s.iconBtn}>
          <Text style={s.iconTxt}>😊</Text>
        </TouchableOpacity>
      </View>

      {/* ────── PARTNER (NORTH) ────── */}
      <View style={s.partnerArea}>
        <Avatar
          size={50}
          label="شريكي"
          trophy={gs.trickCounts.north}
          isActive={gs.phase === 'playing' && currentPlayerPos === 'north'}
        />
        {bidLabels.north && <BidBubble label={bidLabels.north} />}
        <CardStack count={gs.hands.north.length} horizontal />
      </View>

      {/* ────── TABLE ROW (opp left + table + opp right) ────── */}
      <View style={s.tableRow}>
        {/* WEST / Opponent 1 */}
        <View style={s.sideOpp}>
          <Avatar
            size={44}
            isActive={gs.phase === 'playing' && currentPlayerPos === 'west'}
          />
          {bidLabels.west && <BidBubble label={bidLabels.west} />}
          <CardStack count={gs.hands.west.length} />
        </View>

        {/* TABLE */}
        <View style={s.table}>
          {/* ── BIDDING PHASE ── */}
          {isBidding && gs.centerCard && (
            <View style={s.bidTable}>
              <Text style={s.centerHint}>الورقة المقترحة</Text>
              <View style={s.centerCardWrap}>
                <PlayingCard card={gs.centerCard} size="lg" />
              </View>
              <View style={[s.centerSuitPill, { backgroundColor: isRed(gs.centerCard.suit) ? 'rgba(211,47,47,0.25)' : 'rgba(255,255,255,0.1)' }]}>
                <Text style={[s.centerSuitTxt, { color: isRed(gs.centerCard.suit) ? '#ff6b6b' : '#fff' }]}>
                  {SUIT_SYMBOLS[gs.centerCard.suit]}  {SUIT_NAMES_AR[gs.centerCard.suit]}
                </Text>
              </View>
            </View>
          )}

          {/* ── PLAYING PHASE ── */}
          {(gs.phase === 'playing' || gs.phase === 'trickResolve') && (
            <View style={s.trickLayout}>
              {/* North card */}
              <View style={s.trickN}>
                {gs.currentTrick.north
                  ? <PlayingCard card={gs.currentTrick.north} size="md" />
                  : <View style={s.trickSlot} />}
              </View>
              {/* Middle row */}
              <View style={s.trickMid}>
                <View style={s.trickSide}>
                  {gs.currentTrick.west
                    ? <PlayingCard card={gs.currentTrick.west} size="md" />
                    : <View style={s.trickSlot} />}
                </View>
                {/* Center trump indicator */}
                {gs.mode === 'sun' && gs.trumpSuit && (
                  <View style={s.trumpBadge}>
                    <Text style={[s.trumpBadgeTxt, { color: isRed(gs.trumpSuit) ? '#ff6b6b' : '#fff' }]}>
                      {SUIT_SYMBOLS[gs.trumpSuit]}
                    </Text>
                    <Text style={s.trumpBadgeLabel}>حكم</Text>
                  </View>
                )}
                {gs.mode === 'baloot' && (
                  <View style={s.trumpBadge}>
                    <Text style={s.trumpBadgeTxt}>⭐</Text>
                    <Text style={s.trumpBadgeLabel}>سن</Text>
                  </View>
                )}
                <View style={s.trickSide}>
                  {gs.currentTrick.east
                    ? <PlayingCard card={gs.currentTrick.east} size="md" />
                    : <View style={s.trickSlot} />}
                </View>
              </View>
              {/* South card */}
              <View style={s.trickS}>
                {gs.currentTrick.south
                  ? <PlayingCard card={gs.currentTrick.south} size="md" />
                  : <View style={s.trickSlot} />}
              </View>
            </View>
          )}

          {/* Flash overlay */}
          {flashWinner && (
            <View style={[s.flash, { backgroundColor: flashWinner === 'us' ? 'rgba(76,175,80,0.25)' : 'rgba(244,67,54,0.25)' }]}>
              <Text style={s.flashTxt}>{flashWinner === 'us' ? '✅ لنا!' : '❌ لهم'}</Text>
            </View>
          )}
        </View>

        {/* EAST / Opponent 2 */}
        <View style={s.sideOpp}>
          <Avatar
            size={44}
            isActive={gs.phase === 'playing' && currentPlayerPos === 'east'}
          />
          {bidLabels.east && <BidBubble label={bidLabels.east} />}
          <CardStack count={gs.hands.east.length} />
        </View>
      </View>

      {/* ────── OPPONENT LABELS ────── */}
      <View style={s.oppLabelRow}>
        <View style={s.oppChip}>
          <View style={s.oppBadge}><Text style={s.oppBadgeTxt}>P1</Text></View>
          <Text style={s.oppName}>خصم ١</Text>
          <Text style={s.oppScore}>{gs.trickCounts.west}✓</Text>
        </View>
        <View style={s.oppChip}>
          <View style={s.oppBadge}><Text style={s.oppBadgeTxt}>P3</Text></View>
          <Text style={s.oppName}>خصم ٢</Text>
          <Text style={s.oppScore}>{gs.trickCounts.east}✓</Text>
        </View>
      </View>

      {/* ────── BID BUTTONS ────── */}
      {isHumanBidTurn && (
        <View style={s.bidRow}>
          <TouchableOpacity style={[s.bidBtn, { backgroundColor: '#d4810a' }]} onPress={() => humanBid('hokm')}>
            <Text style={s.bidBtnTxt}>حكم</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.bidBtn, { backgroundColor: '#1a7a3a' }]} onPress={() => humanBid('sun')}>
            <Text style={s.bidBtnTxt}>سن</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.bidBtn, { backgroundColor: PURPLE }]} onPress={() => humanBid('ashkal')}>
            <Text style={s.bidBtnTxt}>أشكل</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.bidBtn, { backgroundColor: '#444' }]} onPress={() => humanBid('pass')}>
            <Text style={s.bidBtnTxt}>بس</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ────── HUMAN HAND ────── */}
      <View style={s.handArea}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.handScroll}
        >
          {gs.hands.south.map((card) => {
            const isValid  = isMyTurn && validIds.has(card.id);
            const isDimmed = isMyTurn && !isValid;
            const isSel    = gs.selectedCard?.id === card.id;
            const isTrump  = gs.mode === 'sun' && card.suit === gs.trumpSuit;
            return (
              <TouchableOpacity
                key={card.id}
                onPress={() => tapCard(card)}
                activeOpacity={0.8}
                style={[s.cardTouchable, isSel && s.cardSelected]}
              >
                <PlayingCard
                  card={card}
                  size="lg"
                  selected={isSel}
                  dimmed={isDimmed}
                  isTrump={isTrump}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ────── YOU CHIP ────── */}
      <View style={s.youBar}>
        <View style={s.youLeft}>
          <View style={s.youBadge}><Text style={s.youBadgeTxt}>YOU</Text></View>
          <Text style={s.youName}>أنت</Text>
          {bidLabels.south && <BidBubble label={bidLabels.south} />}
        </View>
        <View style={s.youRight}>
          <Text style={s.youTricks}>{gs.trickCounts.south} ✓</Text>
          <View style={s.trophyPill}>
            <Text style={s.trophyPillTxt}>🏆 {trophies.current}</Text>
          </View>
        </View>
      </View>

      {isMyTurn && !isBidding && (
        <Text style={s.turnHint}>اضغط مرتين للعب — اضغط مرة للاختيار</Text>
      )}

      {/* ══ SUIT PICK MODAL ══ */}
      <Modal visible={showSuitPick} transparent animationType="fade">
        <View style={m.overlay}>
          <View style={m.box}>
            <Text style={m.title}>اختر لون الحكم</Text>
            <View style={m.suitGrid}>
              {[['hearts','♥',true],['diamonds','♦',true],['clubs','♣',false],['spades','♠',false]].map(([suit, sym, red]) => (
                <TouchableOpacity key={suit} style={m.suitBtn} onPress={() => humanPickSuit(suit)}>
                  <Text style={[m.suitSym, { color: red ? '#d32f2f' : '#111' }]}>{sym}</Text>
                  <Text style={m.suitName}>{SUIT_NAMES_AR[suit]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ══ ROUND SCORE MODAL ══ */}
      {gs.roundResult && (
        <Modal visible={showScore} transparent animationType="slide">
          <View style={m.overlay}>
            <View style={m.box}>
              <Text style={[m.headline, { color: gs.roundResult.weWon ? '#4caf50' : '#ef5350' }]}>
                {gs.roundResult.kabootUs   ? '🏆 كابوت! فزتم بكل الأوراق!'
                : gs.roundResult.kabootThem ? '💀 كابوت عليكم'
                : gs.roundResult.weWon      ? '✅ فاز فريقك!'
                : '❌ خسر فريقك'}
              </Text>

              <Text style={m.modeLine}>
                {gs.roundResult.mode === 'sun'
                  ? `حكم ${SUIT_SYMBOLS[gs.roundResult.trumpSuit]}`
                  : 'سن – بدون حكم'}
              </Text>

              <View style={m.ptsRow}>
                <View style={m.ptsCol}>
                  <Text style={m.ptsLabel}>نقاطنا</Text>
                  <Text style={[m.ptsVal, { color: '#ffd700' }]}>{gs.roundResult.pointsUs}</Text>
                </View>
                <Text style={m.vs}>vs</Text>
                <View style={m.ptsCol}>
                  <Text style={m.ptsLabel}>نقاطهم</Text>
                  <Text style={[m.ptsVal, { color: '#fff' }]}>{gs.roundResult.pointsThem}</Text>
                </View>
              </View>

              {(gs.roundResult.kabootUs || gs.roundResult.kabootThem) && (
                <View style={m.bonusBadge}>
                  <Text style={m.bonusTxt}>🌟 بونص كابوت +100</Text>
                </View>
              )}

              <Text style={[m.trophyDelta, { color: gs.roundResult.trophyDelta >= 0 ? '#ffd700' : '#ef5350' }]}>
                {gs.roundResult.trophyDelta >= 0 ? '+' : ''}{gs.roundResult.trophyDelta} 🏆
              </Text>

              <View style={m.totalRow}>
                <Text style={m.totalTxt}>إجمالي لنا: <Text style={{ color: '#ffd700', fontWeight: '800' }}>{gs.roundResult.newScoreUs}</Text></Text>
                <Text style={m.totalTxt}>إجمالي لهم: <Text style={{ color: '#fff', fontWeight: '800' }}>{gs.roundResult.newScoreThem}</Text></Text>
              </View>

              <TouchableOpacity style={m.nextBtn} onPress={nextRound}>
                <Text style={m.nextBtnTxt}>الجولة التالية ▶</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ══ GAME OVER MODAL ══ */}
      {gs.roundResult && (
        <Modal visible={showGameOver} transparent animationType="fade">
          <View style={m.overlay}>
            <View style={m.box}>
              <Text style={{ fontSize: 64, textAlign: 'center' }}>
                {gs.roundResult.newScoreUs >= gs.roundResult.newScoreThem ? '🏆' : '😢'}
              </Text>
              <Text style={[m.headline, {
                color: gs.roundResult.newScoreUs > gs.roundResult.newScoreThem ? '#ffd700' : '#ef5350',
                fontSize: 28,
              }]}>
                {gs.roundResult.newScoreUs > gs.roundResult.newScoreThem ? 'فاز فريقك!'
                : gs.roundResult.newScoreUs === gs.roundResult.newScoreThem ? 'تعادل!'
                : 'خسر فريقك'}
              </Text>
              <View style={m.ptsRow}>
                <View style={m.ptsCol}>
                  <Text style={m.ptsLabel}>أنتم</Text>
                  <Text style={[m.ptsVal, { color: '#ffd700', fontSize: 44 }]}>{gs.roundResult.newScoreUs}</Text>
                </View>
                <Text style={m.vs}>vs</Text>
                <View style={m.ptsCol}>
                  <Text style={m.ptsLabel}>الخصوم</Text>
                  <Text style={[m.ptsVal, { color: '#fff', fontSize: 44 }]}>{gs.roundResult.newScoreThem}</Text>
                </View>
              </View>
              <View style={m.bonusBadge}>
                <Text style={m.bonusTxt}>رصيد الكؤوس: {gs.roundResult.newTrophies} 🏆</Text>
              </View>
              <TouchableOpacity style={m.nextBtn} onPress={() => { setShowGameOver(false); navigation.replace('Home'); }}>
                <Text style={m.nextBtnTxt}>🏠 العودة للقائمة</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

/* ════════════════════════════════════════════
   STYLES
════════════════════════════════════════════ */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: RED },

  /* TOP BAR */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  topLeft: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40, height: 40,
    borderRadius: 12,
    backgroundColor: BLACK,
    alignItems: 'center', justifyContent: 'center',
  },
  iconTxt: { fontSize: 18 },

  /* Score widget */
  scoreWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  scoreCol: { paddingHorizontal: 14, alignItems: 'center' },
  scoreLabelTxt: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  scoreNumTxt: { color: '#ffd700', fontSize: 24, fontWeight: '900', lineHeight: 28 },
  scoreSep: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.12)' },
  scoreCenter: { paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  scoreHandTxt: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '600' },

  /* Partner area */
  partnerArea: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },

  /* Table row */
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    flex: 1,
    minHeight: 200,
    maxHeight: 260,
  },

  /* Side opponents */
  sideOpp: {
    width: 62,
    alignItems: 'center',
    gap: 5,
    zIndex: 2,
  },

  /* Table felt */
  table: {
    flex: 1,
    backgroundColor: TABLE,
    borderRadius: 22,
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 14,
    overflow: 'hidden',
  },

  /* Bidding table */
  bidTable: {
    alignItems: 'center',
    gap: 6,
  },
  centerHint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  centerCardWrap: {
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  centerSuitPill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  centerSuitTxt: { fontSize: 15, fontWeight: '800', textAlign: 'center' },

  /* Trick layout */
  trickLayout: {
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  trickN: { minHeight: 72, alignItems: 'center', justifyContent: 'flex-end' },
  trickMid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    gap: 4,
  },
  trickSide: { width: 54, alignItems: 'center' },
  trickS: { minHeight: 72, alignItems: 'center', justifyContent: 'flex-start' },
  trickSlot: { width: 50, height: 70, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed' },

  /* Trump badge */
  trumpBadge: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
  },
  trumpBadgeTxt: { fontSize: 20, fontWeight: '900' },
  trumpBadgeLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '600' },

  /* Flash */
  flash: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  flashTxt: { color: '#fff', fontSize: 18, fontWeight: '900' },

  /* Opp label row */
  oppLabelRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    marginTop: 6,
    marginBottom: 2,
  },
  oppChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  oppBadge: { backgroundColor: '#fff', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  oppBadgeTxt: { color: BLACK, fontSize: 10, fontWeight: '800' },
  oppName: { color: 'rgba(255,255,255,0.75)', fontSize: 13, flex: 1, fontWeight: '600' },
  oppScore: { color: 'rgba(255,255,255,0.45)', fontSize: 11 },

  /* Bid buttons */
  bidRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  bidBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  bidBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '900' },

  /* Hand area */
  handArea: {
    marginTop: 8,
    paddingBottom: 4,
    minHeight: 110,
  },
  handScroll: {
    paddingHorizontal: 10,
    gap: 6,
    alignItems: 'flex-end',
  },
  cardTouchable: { marginBottom: 0 },
  cardSelected: { marginBottom: 16 },

  /* You bar */
  youBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PURPLE,
    marginHorizontal: 10,
    marginBottom: 14,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  youLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  youBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  youBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  youName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  youRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  youTricks: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  trophyPill: { backgroundColor: '#d4810a', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  trophyPillTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },

  turnHint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
  },
});

/* Modal styles */
const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  box: {
    backgroundColor: '#1a1030',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  headline: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  modeLine: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' },

  /* Suit picker */
  suitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  suitBtn: {
    width: '45%',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 4,
  },
  suitSym: { fontSize: 38, fontWeight: '800' },
  suitName: { fontSize: 14, fontWeight: '600', color: '#333' },

  /* Score */
  ptsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  ptsCol: { flex: 1, alignItems: 'center' },
  ptsLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 2 },
  ptsVal: { fontSize: 38, fontWeight: '900', lineHeight: 44 },
  vs: { color: 'rgba(255,255,255,0.3)', fontSize: 18 },
  bonusBadge: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  bonusTxt: { color: '#ffd700', fontWeight: '700', fontSize: 13 },
  trophyDelta: { fontSize: 24, fontWeight: '900', textAlign: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  nextBtn: {
    backgroundColor: '#ffd700',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  nextBtnTxt: { color: '#0d0618', fontSize: 18, fontWeight: '900' },
});
