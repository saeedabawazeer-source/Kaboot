/**
 * KABOOT – Game Screen
 * Branding: 60% Red | 30% Purple | 10% Black
 *
 * Layout (top → bottom):
 *  [⚙️][🔊]  Score Widget  [😊]
 *  Partner avatar + face-down cards
 *  ─────────────────────────────────────
 *  [OPP1] │  DARK TABLE (bid/play)  │ [OPP2]
 *  ─────────────────────────────────────
 *  You avatar + info
 *  Fanned player hand (rotated cards)
 *  [حكم][سن][أشكل][بس]  ← bid phase only
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

const { width: SW } = Dimensions.get('window');

const RED    = '#C0202A';
const PURPLE = '#5c23a0';
const BLACK  = '#0d0d0d';
const TABLE  = '#13172a';

/* ─── Initial state factory ─────────────────── */
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
  bidPhase: { index: 0, hasBid: false, winner: null },
  matchScoreUs: 0,
  matchScoreThem: 0,
  roundNum: 1,
  roundsWonUs: 0,
  roundsWonThem: 0,
  roundResult: null,
});

const MAX_ROUNDS = 4;

/* ─────────────────────────────────────────────
   PURPLE AVATAR
───────────────────────────────────────────── */
function PurpleAvatar({ size = 56, isActive = false }) {
  return (
    <View style={[
      {
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: PURPLE,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: isActive ? 2.5 : 1.5,
        borderColor: isActive ? '#ffd700' : 'rgba(255,255,255,0.2)',
        shadowColor: isActive ? '#ffd700' : '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: isActive ? 0.7 : 0.4,
        shadowRadius: isActive ? 8 : 5,
        elevation: isActive ? 10 : 5,
      }
    ]}>
      <Text style={{ fontSize: size * 0.45, color: 'rgba(255,255,255,0.9)' }}>👤</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────
   FACE-DOWN CARD STACK (for opponents)
───────────────────────────────────────────── */
function FaceDownStack({ count, rotate = false }) {
  const n = Math.min(count, 6);
  if (n === 0) return null;
  return (
    <View style={{ position: 'relative', width: 32 + n * 4, height: 48 }}>
      {Array.from({ length: n }).map((_, i) => (
        <View key={i} style={{
          position: 'absolute',
          left: i * 4,
          top: 0,
          width: 32, height: 48,
          backgroundColor: PURPLE,
          borderRadius: 5,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.25)',
        }} />
      ))}
    </View>
  );
}

/* ─────────────────────────────────────────────
   BID SPEECH BUBBLE
───────────────────────────────────────────── */
function BidBubble({ label, color = PURPLE }) {
  if (!label) return null;
  const bg = label === 'بس' ? '#555' : color;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>{label}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────
   EMPTY TRICK SLOT
───────────────────────────────────────────── */
function TrickSlot() {
  return (
    <View style={{
      width: 46, height: 66, borderRadius: 7,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
      borderStyle: 'dashed',
    }} />
  );
}

/* ══════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════ */
export default function GameScreen({ navigation, route }) {
  const [gs, setGs]               = useState(INIT());
  const [bidLabels, setBidLabels] = useState({});
  const [showSuitPick, setShowSuitPick] = useState(false);
  const [showScore, setShowScore]       = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [flashMsg, setFlashMsg]         = useState(null);

  const trophies = useRef(route.params?.trophies ?? 0);
  const gsRef    = useRef(gs);
  useEffect(() => { gsRef.current = gs; }, [gs]);

  /* ── Mount: start first round ── */
  useEffect(() => { startRound(INIT()); }, []);

  /* ═══ DEAL ═══════════════════════════════ */
  function startRound(base) {
    const d = deal();
    d.south = sortHand(d.south, null, null);
    setBidLabels({});
    setShowSuitPick(false);
    setShowScore(false);
    setShowGameOver(false);
    setFlashMsg(null);
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
      bidPhase: { index: 0, hasBid: false, winner: null },
      roundResult: null,
    });
  }

  /* ═══ BIDDING ════════════════════════════ */
  useEffect(() => {
    if (gs.phase !== 'bidding') return;
    const pos = POSITIONS[gs.bidPhase.index];

    // All 4 players passed → re-deal
    if (!pos) {
      setTimeout(() => {
        Alert.alert('بس الكل!', 'لا مزايدة – يُعاد التوزيع', [
          { text: 'حسناً', onPress: () => startRound({ ...gsRef.current }) },
        ]);
      }, 400);
      return;
    }

    // Human's turn → bid buttons shown in render, no setTimeout needed
    if (pos === 'south') return;

    // AI turn
    const timer = setTimeout(() => {
      const cur = gsRef.current;
      const raw = aiBid(cur.hands[pos], cur.centerCard, cur.bidPhase.hasBid);
      // aiBid: 'sun'=accept trump, 'baloot'=no-trump, 'pass'=pass
      const bid = raw === 'sun' ? 'hokm' : raw === 'baloot' ? 'sun' : 'pass';
      applyBid(pos, bid);
    }, 800 + Math.random() * 400);

    return () => clearTimeout(timer);
  }, [gs.phase, gs.bidPhase.index]);

  const BID_DISPLAY = { hokm: 'حكم', sun: 'سن', ashkal: 'أشكل', pass: 'بس' };

  function applyBid(pos, bid) {
    setBidLabels(prev => ({ ...prev, [pos]: BID_DISPLAY[bid] }));

    if (bid === 'pass') {
      setGs(p => ({ ...p, bidPhase: { ...p.bidPhase, index: p.bidPhase.index + 1 } }));
      return;
    }
    if (bid === 'ashkal' && pos === 'south') {
      // Human picks a different trump suit
      setShowSuitPick(true);
      return;
    }
    // Bid accepted
    const mode      = bid === 'sun' ? 'baloot' : 'sun';
    const trumpSuit = bid === 'hokm' ? gsRef.current.centerCard.suit : null;
    commitBid(pos, mode, trumpSuit);
  }

  function commitBid(pos, mode, trumpSuit) {
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
        phase: 'playing',
        leadSuit: null,
        currentTrick: {},
      };
    });
  }

  function humanBid(bid)     { applyBid('south', bid); }
  function humanPickSuit(s)  {
    setBidLabels(p => ({ ...p, south: SUIT_SYMBOLS[s] }));
    commitBid('south', 'sun', s);
  }

  /* ═══ PLAYING – AI turns ═════════════════ */
  useEffect(() => {
    if (gs.phase !== 'playing') return;
    const pos = POSITIONS[gs.currentPlayer];
    if (pos === 'south') return; // human's turn

    const timer = setTimeout(() => {
      const c = gsRef.current;
      const card = aiPlayCard(pos, c.hands[pos], c.leadSuit, c.trumpSuit, c.mode, c.currentTrick);
      if (card) doPlayCard(pos, card);
    }, 800 + Math.random() * 500);

    return () => clearTimeout(timer);
  }, [gs.phase, gs.currentPlayer]);

  function doPlayCard(pos, card) {
    setGs(p => {
      if (p.phase !== 'playing') return p;
      const newHand  = p.hands[pos].filter(c => c.id !== card.id);
      const newTrick = { ...p.currentTrick, [pos]: card };
      const leadSuit = Object.keys(p.currentTrick).length === 0 ? card.suit : p.leadSuit;
      const updated  = { ...p, hands: { ...p.hands, [pos]: newHand }, currentTrick: newTrick, leadSuit, selectedCard: null };
      if (Object.keys(newTrick).length === 4) {
        return { ...updated, phase: 'trickResolve' };
      }
      return { ...updated, currentPlayer: (POSITIONS.indexOf(pos) + 1) % 4 };
    });
  }

  /* ═══ TRICK RESOLUTION ═══════════════════ */
  useEffect(() => {
    if (gs.phase !== 'trickResolve') return;
    const timer = setTimeout(resolveTrick, 1100);
    return () => clearTimeout(timer);
  }, [gs.phase]);

  function resolveTrick() {
    setGs(p => {
      const { currentTrick, leadSuit, trumpSuit, mode, trickCounts, hands } = p;
      const winner     = trickWinner(currentTrick, leadSuit, trumpSuit, mode);
      const winTeam    = TEAMS[winner];
      let pts = Object.values(currentTrick).reduce((s, c) => s + cardPoints(c, mode, trumpSuit), 0);
      const allDone = Object.values(hands).every(h => h.length === 0);
      if (allDone) pts += 10; // last-trick bonus

      const newTC   = { ...trickCounts, [winner]: trickCounts[winner] + 1 };
      const newUs   = winTeam === 0 ? p.pointsUs   + pts : p.pointsUs;
      const newThem = winTeam === 1 ? p.pointsThem + pts : p.pointsThem;

      setFlashMsg(winTeam === 0 ? '✅ لنا!' : '❌ لهم');
      setTimeout(() => setFlashMsg(null), 800);

      if (allDone) {
        return { ...p, trickCounts: newTC, pointsUs: newUs, pointsThem: newThem, currentTrick: {}, phase: 'roundEnd' };
      }
      return { ...p, trickCounts: newTC, pointsUs: newUs, pointsThem: newThem, currentTrick: {}, leadSuit: null, currentPlayer: POSITIONS.indexOf(winner), phase: 'playing' };
    });
  }

  /* ═══ ROUND END ══════════════════════════ */
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

    const newRWUs   = weWon  ? roundsWonUs + 1   : roundsWonUs;
    const newRWThem = !weWon ? roundsWonThem + 1 : roundsWonThem;

    let td = weWon ? 30 : -20;
    if (kabootUs && weWon)   td =  60;
    if (kabootThem && !weWon) td = -40;
    const newTrophies = Math.max(0, trophies.current + td);
    trophies.current  = newTrophies;
    AsyncStorage.setItem('kaboot_trophies', String(newTrophies));

    const isGameOver = roundNum >= MAX_ROUNDS || newUs >= 500 || newThem >= 500;
    const rr = {
      weWon, kabootUs, kabootThem, pointsUs, pointsThem,
      trophyDelta: td, newTrophies, mode, trumpSuit, isGameOver,
      newScoreUs: newUs, newScoreThem: newThem,
      newRoundsWonUs: newRWUs, newRoundsWonThem: newRWThem,
    };

    setGs(p => ({ ...p, matchScoreUs: newUs, matchScoreThem: newThem,
                         roundsWonUs: newRWUs, roundsWonThem: newRWThem, roundResult: rr }));
    setTimeout(() => { isGameOver ? setShowGameOver(true) : setShowScore(true); }, 700);
  }, [gs.phase]);

  /* ═══ HUMAN CARD TAP ═════════════════════ */
  function tapCard(card) {
    if (gs.phase !== 'playing' || POSITIONS[gs.currentPlayer] !== 'south') return;
    const valid = getValidCards(gs.hands.south, gs.leadSuit, gs.trumpSuit, gs.mode, gs.currentTrick);
    if (!valid.some(c => c.id === card.id)) return;

    if (gs.selectedCard?.id === card.id) {
      doPlayCard('south', card);       // 2nd tap → play
    } else {
      setGs(p => ({ ...p, selectedCard: card })); // 1st tap → select
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

  /* ─── Derived values ─────────────────────── */
  const isMyTurn       = gs.phase === 'playing' && POSITIONS[gs.currentPlayer] === 'south';
  const isBidding      = gs.phase === 'bidding';
  const isHumanBidTurn = isBidding && POSITIONS[gs.bidPhase.index] === 'south';
  const curPos         = POSITIONS[gs.currentPlayer];
  const validIds       = new Set(
    isMyTurn ? getValidCards(gs.hands.south, gs.leadSuit, gs.trumpSuit, gs.mode, gs.currentTrick).map(c => c.id) : []
  );

  /* ════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════ */
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      {/* ╔══════════════════════════════╗
          ║       TOP BAR               ║
          ╚══════════════════════════════╝ */}
      <View style={s.topBar}>
        {/* Left: Settings + Sound */}
        <View style={s.topLeftBtns}>
          <TouchableOpacity style={s.iconBtn} onPress={() =>
            Alert.alert('خروج', 'هل تريد الخروج؟', [
              { text: 'لا', style: 'cancel' },
              { text: 'نعم', style: 'destructive', onPress: () => navigation.replace('Home') },
            ])
          }>
            <Text style={s.iconTxt}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn}>
            <Text style={s.iconTxt}>🔊</Text>
          </TouchableOpacity>
        </View>

        {/* Center: Score */}
        <View style={s.scoreWidget}>
          <View style={s.scoreTeam}>
            <Text style={s.scoreTeamLbl}>لنا</Text>
            <Text style={s.scoreTeamNum}>{gs.matchScoreUs}</Text>
          </View>
          <View style={s.scoreDivider} />
          <View style={s.scoreCenter}>
            <Text style={s.scoreRoundTxt}>يد {gs.roundNum}</Text>
            {gs.mode && (
              <Text style={s.scoreModeTag}>
                {gs.mode === 'sun' && gs.trumpSuit
                  ? `${SUIT_SYMBOLS[gs.trumpSuit]} حكم`
                  : 'سن'}
              </Text>
            )}
          </View>
          <View style={s.scoreDivider} />
          <View style={s.scoreTeam}>
            <Text style={s.scoreTeamLbl}>لهم</Text>
            <Text style={s.scoreTeamNum}>{gs.matchScoreThem}</Text>
          </View>
        </View>

        {/* Right: Emoji */}
        <TouchableOpacity style={s.iconBtn}>
          <Text style={s.iconTxt}>😊</Text>
        </TouchableOpacity>
      </View>

      {/* ╔══════════════════════════════╗
          ║     PARTNER (NORTH)         ║
          ╚══════════════════════════════╝ */}
      <View style={s.partnerArea}>
        <View style={s.partnerChip}>
          <Text style={s.partnerChipTxt}>P2  شريكي</Text>
          <View style={s.partnerTrophyBadge}>
            <Text style={s.partnerTrophyTxt}>🏆 {gs.trickCounts.north}</Text>
          </View>
        </View>
        <PurpleAvatar size={52} isActive={gs.phase === 'playing' && curPos === 'north'} />
        {bidLabels.north && <BidBubble label={bidLabels.north} />}
        {/* Partner's face-down cards */}
        {gs.hands.north.length > 0 && (
          <View style={s.partnerCards}>
            {Array.from({ length: Math.min(gs.hands.north.length, 8) }).map((_, i) => (
              <View key={i} style={[s.partnerCard, { marginLeft: i > 0 ? -16 : 0, zIndex: i }]} />
            ))}
          </View>
        )}
      </View>

      {/* ╔══════════════════════════════╗
          ║  TABLE + SIDE OPPONENTS     ║
          ╚══════════════════════════════╝ */}
      <View style={s.tableRow}>

        {/* West / Opponent 1 */}
        <View style={s.sideOpp}>
          <PurpleAvatar size={44} isActive={gs.phase === 'playing' && curPos === 'west'} />
          <View style={s.oppNameChip}>
            <Text style={s.oppNameTxt}>خصم ١</Text>
          </View>
          <Text style={s.oppTricks}>{gs.trickCounts.west}✓</Text>
          {bidLabels.west ? <BidBubble label={bidLabels.west} /> : (
            <FaceDownStack count={gs.hands.west.length} />
          )}
        </View>

        {/* ── THE TABLE ── */}
        <View style={s.table}>

          {/* ── BIDDING: show center card ── */}
          {isBidding && gs.centerCard && (
            <View style={s.bidTableContent}>
              <Text style={s.centerCardLabel}>الورقة المقترحة</Text>
              <View style={s.centerCardGlow}>
                <PlayingCard card={gs.centerCard} size="lg" />
              </View>
              <View style={[
                s.suitPill,
                { backgroundColor: isRed(gs.centerCard.suit) ? 'rgba(211,47,47,0.3)' : 'rgba(255,255,255,0.1)' }
              ]}>
                <Text style={[s.suitPillTxt, { color: isRed(gs.centerCard.suit) ? '#ff7070' : '#fff' }]}>
                  {SUIT_SYMBOLS[gs.centerCard.suit]}  {SUIT_NAMES_AR[gs.centerCard.suit]}
                </Text>
              </View>
              {/* Bid callouts from players */}
              {Object.keys(bidLabels).length > 0 && (
                <View style={s.bidCallouts}>
                  {Object.entries(bidLabels).map(([pos, lbl]) => (
                    <View key={pos} style={s.bidCallout}>
                      <Text style={s.bidCalloutPos}>{
                        pos === 'north' ? 'شريكي' : pos === 'west' ? 'خصم١' : pos === 'east' ? 'خصم٢' : 'أنت'
                      }</Text>
                      <Text style={s.bidCalloutLbl}>{lbl}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── PLAYING: trick card grid ── */}
          {(gs.phase === 'playing' || gs.phase === 'trickResolve') && (
            <View style={s.trickGrid}>
              {/* North slot */}
              <View style={s.trickRowCenter}>
                {gs.currentTrick.north
                  ? <PlayingCard card={gs.currentTrick.north} size="md" />
                  : <TrickSlot />}
              </View>

              {/* Middle row: West | trump badge | East */}
              <View style={s.trickRowMid}>
                <View style={s.trickSlotWrap}>
                  {gs.currentTrick.west
                    ? <PlayingCard card={gs.currentTrick.west} size="md" />
                    : <TrickSlot />}
                </View>

                {/* Trump badge */}
                <View style={s.trumpBadge}>
                  {gs.mode === 'sun' && gs.trumpSuit ? (
                    <>
                      <Text style={[s.trumpBadgeMain, { color: isRed(gs.trumpSuit) ? '#ff7070' : '#e8e8e8' }]}>
                        {SUIT_SYMBOLS[gs.trumpSuit]}
                      </Text>
                      <Text style={s.trumpBadgeLabel}>حكم</Text>
                    </>
                  ) : gs.mode === 'baloot' ? (
                    <>
                      <Text style={s.trumpBadgeMain}>⭐</Text>
                      <Text style={s.trumpBadgeLabel}>سن</Text>
                    </>
                  ) : null}
                </View>

                <View style={s.trickSlotWrap}>
                  {gs.currentTrick.east
                    ? <PlayingCard card={gs.currentTrick.east} size="md" />
                    : <TrickSlot />}
                </View>
              </View>

              {/* South slot */}
              <View style={s.trickRowCenter}>
                {gs.currentTrick.south
                  ? <PlayingCard card={gs.currentTrick.south} size="md" />
                  : <TrickSlot />}
              </View>
            </View>
          )}

          {/* Flash overlay */}
          {flashMsg && (
            <View style={[s.flashOverlay, {
              backgroundColor: flashMsg.startsWith('✅') ? 'rgba(76,175,80,0.28)' : 'rgba(244,67,54,0.28)',
            }]}>
              <Text style={s.flashTxt}>{flashMsg}</Text>
            </View>
          )}
        </View>

        {/* East / Opponent 2 */}
        <View style={s.sideOpp}>
          <PurpleAvatar size={44} isActive={gs.phase === 'playing' && curPos === 'east'} />
          <View style={s.oppNameChip}>
            <Text style={s.oppNameTxt}>خصم ٢</Text>
          </View>
          <Text style={s.oppTricks}>{gs.trickCounts.east}✓</Text>
          {bidLabels.east ? <BidBubble label={bidLabels.east} /> : (
            <FaceDownStack count={gs.hands.east.length} />
          )}
        </View>
      </View>

      {/* ╔══════════════════════════════╗
          ║     YOU (SOUTH) SECTION     ║
          ╚══════════════════════════════╝ */}
      <View style={s.youSection}>
        <View style={s.youChipRow}>
          <View style={s.youBadge}><Text style={s.youBadgeTxt}>YOU</Text></View>
          <Text style={s.youName}>أنت</Text>
          {bidLabels.south && <BidBubble label={bidLabels.south} />}
          <View style={s.youTrophyBadge}>
            <Text style={s.youTrophyTxt}>🏆 {trophies.current}</Text>
          </View>
        </View>
        <PurpleAvatar size={52} isActive={isMyTurn} />
        <Text style={s.youTricksCount}>{gs.trickCounts.south} ✓  نقاطي: {gs.pointsUs}</Text>
        {isMyTurn && <Text style={s.turnHint}>اضغط مرة للاختيار · مرتين للعب</Text>}
      </View>

      {/* ╔══════════════════════════════╗
          ║   PLAYER HAND (fanned)      ║
          ╚══════════════════════════════╝ */}
      <View style={s.handOuter}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.handScroll}
          centerContent
        >
          {gs.hands.south.map((card, i) => {
            const n      = gs.hands.south.length;
            const mid    = (n - 1) / 2;
            const deg    = (i - mid) * 4;
            const isValid  = isMyTurn && validIds.has(card.id);
            const isDimmed = isMyTurn && !isValid;
            const isSel    = gs.selectedCard?.id === card.id;
            const isTrump  = gs.mode === 'sun' && card.suit === gs.trumpSuit;
            return (
              <TouchableOpacity
                key={card.id}
                onPress={() => tapCard(card)}
                activeOpacity={0.8}
                style={[
                  s.handCardWrap,
                  { transform: [{ rotate: `${deg}deg` }] },
                  isSel && s.handCardSelected,
                  i > 0 && s.handCardOverlap,
                ]}
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

      {/* ╔══════════════════════════════╗
          ║   BID BUTTONS (bid phase)   ║
          ╚══════════════════════════════╝ */}
      {isHumanBidTurn && (
        <View style={s.bidRow}>
          <TouchableOpacity style={[s.bidBtn, { backgroundColor: '#c47a0a' }]} onPress={() => humanBid('hokm')}>
            <Text style={s.bidBtnTxt}>حكم</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.bidBtn, { backgroundColor: '#1a7a3a' }]} onPress={() => humanBid('sun')}>
            <Text style={s.bidBtnTxt}>سن</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.bidBtn, { backgroundColor: PURPLE }]} onPress={() => humanBid('ashkal')}>
            <Text style={s.bidBtnTxt}>أشكل</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.bidBtn, { backgroundColor: '#404040' }]} onPress={() => humanBid('pass')}>
            <Text style={s.bidBtnTxt}>بس</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 10 }} />

      {/* ══════ SUIT PICKER MODAL ══════ */}
      <Modal visible={showSuitPick} transparent animationType="fade">
        <View style={m.overlay}>
          <View style={m.box}>
            <Text style={m.title}>اختر لون الحكم</Text>
            <View style={m.suitGrid}>
              {[['hearts','♥',true],['diamonds','♦',true],['clubs','♣',false],['spades','♠',false]].map(([suit,sym,red]) => (
                <TouchableOpacity key={suit} style={m.suitBtn} onPress={() => humanPickSuit(suit)}>
                  <Text style={[m.suitSym, { color: red ? '#d32f2f' : '#111' }]}>{sym}</Text>
                  <Text style={m.suitName}>{SUIT_NAMES_AR[suit]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════ ROUND SCORE MODAL ══════ */}
      {gs.roundResult && (
        <Modal visible={showScore} transparent animationType="slide">
          <View style={m.overlay}>
            <View style={m.box}>
              <Text style={[m.headline, { color: gs.roundResult.weWon ? '#4caf50' : '#ef5350' }]}>
                {gs.roundResult.kabootUs   ? '🏆 كابوت! فزتم بكل الأوراق!'
                : gs.roundResult.kabootThem ? '💀 كابوت عليكم!'
                : gs.roundResult.weWon      ? '✅ فاز فريقك!'
                : '❌ خسر فريقك'}
              </Text>
              <Text style={m.modeLine}>
                {gs.roundResult.mode === 'sun'
                  ? `حكم ${SUIT_SYMBOLS[gs.roundResult.trumpSuit]}`
                  : 'سن — بدون حكم'}
              </Text>
              <View style={m.ptsRow}>
                <View style={m.ptsCol}>
                  <Text style={m.ptsLbl}>نقاطنا</Text>
                  <Text style={[m.ptsVal, { color: '#ffd700' }]}>{gs.roundResult.pointsUs}</Text>
                </View>
                <Text style={m.vs}>vs</Text>
                <View style={m.ptsCol}>
                  <Text style={m.ptsLbl}>نقاطهم</Text>
                  <Text style={[m.ptsVal, { color: '#fff' }]}>{gs.roundResult.pointsThem}</Text>
                </View>
              </View>
              {(gs.roundResult.kabootUs || gs.roundResult.kabootThem) && (
                <View style={m.bonus}><Text style={m.bonusTxt}>🌟 بونص كابوت +100</Text></View>
              )}
              <Text style={[m.trophyDelta, { color: gs.roundResult.trophyDelta >= 0 ? '#ffd700' : '#ef5350' }]}>
                {gs.roundResult.trophyDelta >= 0 ? '+' : ''}{gs.roundResult.trophyDelta} 🏆
              </Text>
              <View style={m.totals}>
                <Text style={m.totalTxt}>إجمالي لنا: <Text style={{ color:'#ffd700', fontWeight:'800' }}>{gs.roundResult.newScoreUs}</Text></Text>
                <Text style={m.totalTxt}>إجمالي لهم: <Text style={{ color:'#fff', fontWeight:'800' }}>{gs.roundResult.newScoreThem}</Text></Text>
              </View>
              <TouchableOpacity style={m.nextBtn} onPress={nextRound}>
                <Text style={m.nextBtnTxt}>الجولة التالية ▶</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ══════ GAME OVER MODAL ══════ */}
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
                  <Text style={m.ptsLbl}>أنتم</Text>
                  <Text style={[m.ptsVal, { color:'#ffd700', fontSize:44 }]}>{gs.roundResult.newScoreUs}</Text>
                </View>
                <Text style={m.vs}>vs</Text>
                <View style={m.ptsCol}>
                  <Text style={m.ptsLbl}>الخصوم</Text>
                  <Text style={[m.ptsVal, { color:'#fff', fontSize:44 }]}>{gs.roundResult.newScoreThem}</Text>
                </View>
              </View>
              <View style={m.bonus}>
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

  /* ── Top bar ── */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 6,
    paddingHorizontal: 10,
  },
  topLeftBtns: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
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
    paddingVertical: 5,
    paddingHorizontal: 2,
    gap: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  scoreTeam: { paddingHorizontal: 12, alignItems: 'center' },
  scoreTeamLbl: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  scoreTeamNum: { color: '#ffd700', fontSize: 22, fontWeight: '900', lineHeight: 26 },
  scoreDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.12)' },
  scoreCenter: { paddingHorizontal: 10, alignItems: 'center' },
  scoreRoundTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600' },
  scoreModeTag: { color: '#ffd700', fontSize: 10, fontWeight: '700' },

  /* ── Partner section ── */
  partnerArea: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  partnerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BLACK,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  partnerChipTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  partnerTrophyBadge: { backgroundColor: '#c47a0a', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  partnerTrophyTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  partnerCards: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  partnerCard: {
    width: 32, height: 48,
    backgroundColor: PURPLE,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  /* ── Table row ── */
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minHeight: 180,
    maxHeight: 240,
    paddingHorizontal: 4,
  },

  /* Side opponents */
  sideOpp: {
    width: 64,
    alignItems: 'center',
    gap: 4,
  },
  oppNameChip: {
    backgroundColor: BLACK,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  oppNameTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  oppTricks: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },

  /* Table */
  table: {
    flex: 1,
    backgroundColor: TABLE,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 14,
    overflow: 'hidden',
  },

  /* Bidding table content */
  bidTableContent: {
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  centerCardLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '600',
  },
  centerCardGlow: {
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  suitPill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  suitPillTxt: { fontSize: 15, fontWeight: '800' },
  bidCallouts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
    marginTop: 4,
  },
  bidCallout: {
    backgroundColor: 'rgba(92,35,160,0.8)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
  },
  bidCalloutPos: { color: 'rgba(255,255,255,0.55)', fontSize: 9 },
  bidCalloutLbl: { color: '#fff', fontSize: 12, fontWeight: '800' },

  /* Trick grid */
  trickGrid: {
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  trickRowCenter: { alignItems: 'center', minHeight: 70 },
  trickRowMid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  trickSlotWrap: { width: 54, alignItems: 'center' },
  trumpBadge: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  trumpBadgeMain: { fontSize: 22, fontWeight: '900' },
  trumpBadgeLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700' },

  /* Flash */
  flashOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashTxt: { color: '#fff', fontSize: 20, fontWeight: '900' },

  /* ── You section ── */
  youSection: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  youChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PURPLE,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  youBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  youBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  youName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  youTrophyBadge: { backgroundColor: '#c47a0a', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  youTrophyTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  youTricksCount: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  turnHint: { color: '#ffd700', fontSize: 11, fontWeight: '600' },

  /* ── Hand ── */
  handOuter: {
    height: 100,
    justifyContent: 'center',
  },
  handScroll: {
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  handCardWrap: {
    marginBottom: 0,
  },
  handCardOverlap: {
    marginLeft: -22,
  },
  handCardSelected: {
    marginBottom: 18,
    zIndex: 999,
  },

  /* ── Bid buttons ── */
  bidRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  bidBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  bidBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '900' },
});

/* Modal styles */
const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  box: {
    backgroundColor: '#150e2a',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  headline: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  modeLine: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' },
  suitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  suitBtn: {
    width: '45%', backgroundColor: '#fff', borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', gap: 4,
  },
  suitSym: { fontSize: 38, fontWeight: '800' },
  suitName: { fontSize: 14, fontWeight: '600', color: '#333' },
  ptsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14, gap: 8,
  },
  ptsCol: { flex: 1, alignItems: 'center' },
  ptsLbl: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 2 },
  ptsVal: { fontSize: 36, fontWeight: '900', lineHeight: 42 },
  vs: { color: 'rgba(255,255,255,0.3)', fontSize: 18 },
  bonus: {
    backgroundColor: 'rgba(255,215,0,0.12)', borderRadius: 10, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
  },
  bonusTxt: { color: '#ffd700', fontWeight: '700', fontSize: 13 },
  trophyDelta: { fontSize: 24, fontWeight: '900', textAlign: 'center' },
  totals: { flexDirection: 'row', justifyContent: 'space-between' },
  totalTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  nextBtn: {
    backgroundColor: '#ffd700', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  nextBtnTxt: { color: '#0d0618', fontSize: 18, fontWeight: '900' },
});
