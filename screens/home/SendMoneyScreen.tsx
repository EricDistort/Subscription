import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Animated,
  Pressable,
  StatusBar,
  ScrollView,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { supabase } from '../../utils/supabaseClient';
import { useUser } from '../../utils/UserContext';
import ScreenWrapper from '../../utils/ScreenWrapper';
import {
  scale as s,
  verticalScale as vs,
  moderateScale as ms,
} from 'react-native-size-matters';
import { useNavigation } from '@react-navigation/native';

const { width: screenWidth } = Dimensions.get('window');

// --- ⚛️ NEW ANIMATION: QUANTUM SMELTER ---
const QuantumSmelter = () => {
  const spin1 = useRef(new Animated.Value(0)).current;
  const spin2 = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Ring 1 Rotation
    Animated.loop(
      Animated.timing(spin1, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Ring 2 Rotation (Counter-clockwise)
    Animated.loop(
      Animated.timing(spin2, {
        toValue: 1,
        duration: 7000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Core Pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.2,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const rotate1 = spin1.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const rotate2 = spin2.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <View style={styles.animContainer}>
      {/* Background Glow */}
      <View style={styles.animGlow} />

      {/* Orbit Ring 1 */}
      <Animated.View
        style={[
          styles.orbitRing,
          { width: s(180), height: s(180), transform: [{ rotate: rotate1 }] },
        ]}
      >
        <View style={styles.orbitDot} />
        <LinearGradient
          colors={['transparent', '#ff00aa', 'transparent']}
          style={styles.ringGradient}
        />
      </Animated.View>

      {/* Orbit Ring 2 */}
      <Animated.View
        style={[
          styles.orbitRing,
          {
            width: s(130),
            height: s(130),
            transform: [{ rotate: rotate2 }, { scaleX: 0.9 }],
          },
        ]}
      >
        <View
          style={[
            styles.orbitDot,
            { bottom: -4, top: undefined, backgroundColor: '#9000ff' },
          ]}
        />
        <LinearGradient
          colors={['transparent', '#9000ff', 'transparent']}
          style={styles.ringGradient}
        />
      </Animated.View>

      {/* Central Core */}
      <Animated.View style={[styles.core, { transform: [{ scale: pulse }] }]}>
        <LinearGradient
          colors={['#ff00aa', '#cb00d4', '#9000ff']}
          style={styles.coreGradient}
        />
        <View style={styles.coreInnerHighlight} />
      </Animated.View>
    </View>
  );
};

// --- 🧪 LIQUID PROGRESS BAR ---
const LiquidProgress = ({ progress }: { progress: number }) => (
  <View style={styles.liquidTrack}>
    <LinearGradient
      colors={['#ff00aa', '#9000ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.liquidFill, { width: `${progress}%` }]}
    />
    {/* Shine on top of liquid */}
    <LinearGradient
      colors={[
        'rgba(255,255,255,0.1)',
        'rgba(255,255,255,0.4)',
        'rgba(255,255,255,0.1)',
      ]}
      style={[styles.liquidShine, { width: `${progress}%` }]}
    />
  </View>
);

// --- 🔘 POP BUTTON ---
const PopButton = ({ onPress, children, style }: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() =>
        Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start()
      }
      onPressOut={() =>
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
      }
      onPress={onPress}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function FoundryMiningScreen() {
  const { user, setUser } = useUser();
  const navigation = useNavigation<any>();
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUserData = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('total_earned, level_income')
      .eq('id', user.id)
      .single();
    if (!error && data) setUser({ ...user, ...data });
  };

  const fetchInvestments = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('deposits')
      .select('id, amount, created_at, trade_status')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .eq('trade_status', 'running')
      .order('created_at', { ascending: false });

    if (!error) {
      const initialized = (data || []).map(t => ({
        ...t,
        currentValue: t.amount,
        progress: Math.random() * 100,
        temp: Math.floor(Math.random() * (100 - 50) + 50),
      }));
      setInvestments(initialized);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUserData();
    fetchInvestments();
  }, [user?.id]);

  // Animation Loop
  const hasActive = investments.length > 0;
  useEffect(() => {
    if (!hasActive) return;
    const interval = setInterval(() => {
      setInvestments(prev =>
        prev.map(t => ({
          ...t,
          currentValue: t.currentValue + 0.002,
          progress: (t.progress + 0.8) % 100,
        })),
      );
    }, 500); // Faster update for smooth liquid look
    return () => clearInterval(interval);
  }, [hasActive]);

  return (
    <ScreenWrapper>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <LinearGradient
        colors={['#ffffff', '#f5f5f5', '#ebebeb']} // Light Theme Gradient
        style={styles.background}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* 1️⃣ TOP CONTAINER: THE FURNACE (New Animation) */}
          <View style={styles.topContainer}>
            <View style={styles.furnaceWindow}>
              {/* 👇 REPLACED ANIMATION HERE 👇 */}
              <QuantumSmelter />
            </View>
          </View>

          {/* 2️⃣ MIDDLE CONTAINER: THE LEDGER (Two Incomes) */}
          <View style={styles.statsRow}>
            {/* Card 1: Profit */}
            <View style={styles.glassCard}>
              <LinearGradient
                colors={['#ff00aa', '#9000ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <Text style={styles.statLabel}>Balance</Text>
                <Text style={styles.statValue}>
                  ${user?.total_earned || '0.00'}
                </Text>
              </LinearGradient>
              {/* Cyan Border Highlight */}
              <View style={styles.cardBorder} />
            </View>

            {/* Card 2: Level Income */}
            <View style={styles.glassCard}>
              <LinearGradient
                colors={['#ff00aa', '#9000ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <Text style={styles.statLabel}>Network</Text>
                <Text style={styles.statValue}>
                  ${user?.level_income || '0.00'}
                </Text>
              </LinearGradient>
              <View style={styles.cardBorder} />
            </View>
          </View>

          {/* 3️⃣ BOTTOM CONTAINER: ACTIVE RIGS (Scrollable) */}
          <View style={styles.bottomContainer}>
            <View style={styles.listHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.listTitle}>RUNNING LIQUIDITY</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{investments.length}</Text>
                </View>
              </View>

              {/* 👇 NEW HISTORY BUTTON 👇 */}
              <PopButton
                onPress={() => navigation.navigate('TransactionListScreen')}
              >
                <LinearGradient
                  colors={['#ff00aa', '#9000ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.historyBtn}
                >
                  <Text style={styles.historyBtnText}>HISTORY</Text>
                </LinearGradient>
              </PopButton>
            </View>

            {loading ? (
              <ActivityIndicator
                size="large"
                color="#ff00aa"
                style={{ marginTop: 50 }}
              />
            ) : !hasActive ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Foundry Inactive</Text>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {investments.map((item, index) => (
                  <View key={item.id} style={styles.rigCard}>
                    {/* Background Glow */}
                    <LinearGradient
                      colors={['#ffffff', '#f9f9f9']}
                      style={styles.rigInner}
                    >
                      {/* Header */}
                      <View style={styles.rigHeader}>
                        <View style={styles.rigIdBox}>
                          <Text style={styles.rigIdText}>{index + 1}</Text>
                        </View>
                        <View style={{ flex: 1, paddingLeft: s(10) }}>
                          <Text style={styles.rigName}>Shreded Diposit</Text>
                          <Text style={styles.rigTemp}>
                            {item.temp}°F • Server Temperature
                          </Text>
                        </View>
                        <Text style={styles.investedAmt}>${item.amount}</Text>
                      </View>

                      {/* Liquid Progress */}
                      <View style={styles.progressSection}>
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            marginBottom: vs(5),
                          }}
                        >
                          <Text style={styles.progressLabel}>
                            Optimal Income Flow
                          </Text>
                          <Text style={styles.progressValue}>
                            {item.progress.toFixed(0)}%
                          </Text>
                        </View>
                        <LiquidProgress progress={item.progress} />
                      </View>

                      {/* Footer */}
                      <View style={styles.rigFooter}>
                        <View>
                          <Text style={styles.yieldLabel}>APPROXIMATE</Text>
                          <Text style={styles.yieldValue}>
                            ${item.currentValue.toFixed(4)}
                          </Text>
                        </View>
                        <PopButton style={styles.actionBtn}>
                          <Text style={styles.actionBtnText}>EXPAND</Text>
                        </PopButton>
                      </View>
                    </LinearGradient>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </ScreenWrapper>
  );
}

/* --------------------------- STYLES --------------------------- */
const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1 },

  /* --- 1️⃣ TOP: THE FURNACE --- */
  topContainer: {
    height: vs(260),
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(10),
  },
  furnaceWindow: {
    width: s(220),
    height: s(220),
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ⚡ NEW ANIMATION STYLES */
  animContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animGlow: {
    position: 'absolute',
    width: s(120),
    height: s(120),
    borderRadius: s(60),
    backgroundColor: '#ff00aa',
    opacity: 0.1,
    transform: [{ scale: 1.8 }],
  },
  orbitRing: {
    position: 'absolute',
    borderRadius: s(100),
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 170, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringGradient: {
    width: '100%',
    height: '100%',
    borderRadius: s(100),
    opacity: 0.5,
  },
  orbitDot: {
    position: 'absolute',
    top: s(-4),
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    backgroundColor: '#ff00aa',
    shadowColor: '#000',
    shadowOpacity: 1,
    shadowRadius: ms(5),
  },
  core: {
    width: s(80),
    height: s(80),
    borderRadius: s(40),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ff00aa',
    shadowColor: '#ff00aa',
    shadowOpacity: 0.8,
    shadowRadius: ms(20),
    elevation: 15,
  },
  coreGradient: {
    flex: 1,
  },
  coreInnerHighlight: {
    position: 'absolute',
    top: s(10),
    left: s(15),
    width: s(20),
    height: s(10),
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: s(10),
    transform: [{ rotate: '-45deg' }],
  },

  /* --- 2️⃣ MIDDLE: STATS --- */
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: ms(20),
    marginBottom: vs(15),
  },
  glassCard: {
    width: '48%',
    height: vs(70),
    borderRadius: ms(30),
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    position: 'relative',
  shadowColor: '#000000',
    shadowOffset: { width: 0, height: vs(4) },
    shadowOpacity: 0.2,
    shadowRadius: ms(10),
    elevation: 10,

  },
  cardGradient: {
    flex: 1,
    padding: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: ms(30),
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 170, 0.3)',
  },
  statLabel: {
    color: '#ffffff',
    fontSize: ms(11),
    fontWeight: '600',
    marginBottom: vs(3),
    opacity: 0.9,
  },
  statValue: {
    color: '#ffffff',
    fontSize: ms(18),
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowRadius: ms(10),
  },

  /* --- 3️⃣ BOTTOM: LIST --- */
  bottomContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderTopLeftRadius: ms(35),
    borderTopRightRadius: ms(35),
    paddingTop: ms(10),
    borderTopWidth: 1,
    borderTopColor: 'rgba(120, 0, 218, 0.1)',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ms(25),
    marginBottom: vs(15),
  },
  listTitle: {
    color: '#030303b2',
    fontSize: ms(14),
    fontWeight: '800',
    letterSpacing: ms(1),
    marginRight: s(10),
     textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowRadius: ms(2),
  },
  badge: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: s(8),
    paddingVertical: vs(2),
    borderRadius: ms(8),
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  badgeText: {
    color: '#000000',
    fontSize: ms(10),
    fontWeight: '700',

  },

  /* NEW: History Button Styles */
  historyBtn: {
    paddingHorizontal: s(12),
    paddingVertical: vs(6),
    borderRadius: ms(15),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0)',
     shadowColor: '#000000',
    shadowOffset: { width: 0, height: vs(4) },
    shadowOpacity: 0.2,
    shadowRadius: ms(10),
    elevation: 10,


  },
  historyBtnText: {
    color: '#ffffff',
    fontSize: ms(12),
    fontWeight: 'bold',
    letterSpacing: ms(0.5),
  },

  /* Rig Card */
  scrollContent: {
    paddingHorizontal: ms(10),
    paddingBottom: vs(200),
  },
  rigCard: {
    borderRadius: ms(30),
    marginBottom: vs(15),
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: vs(4) },
    shadowOpacity: 0.1,
    shadowRadius: ms(8),
    elevation: 3,
    
  },
  rigInner: {
    padding: ms(16),
    borderRadius: ms(30),
    borderWidth: 0,
    borderColor: 'rgba(0, 0, 0, 0.15)',
     backgroundColor: 'rgba(174, 0, 255, 0.71)',
  },
  rigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(12),
  },
  rigIdBox: {
    width: s(30),
    height: s(30),
    borderRadius: s(15),
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff00aa',
  },
  rigIdText: {
    color: '#ff00aa',
    fontWeight: 'bold',
  },
  rigName: {
    color: '#000000',
    fontSize: ms(14),
    fontWeight: '700',
  },
  rigTemp: {
    color: '#FF4500',
    fontSize: ms(10),
  },
  investedAmt: {
    color: '#ff00aa',
    fontSize: ms(16),
    fontWeight: '700',
  },

  /* Liquid Bar */
  progressSection: {
    marginBottom: vs(15),
  },
  progressLabel: {
    color: '#666',
    fontSize: ms(10),
  },
  progressValue: {
    color: '#ff00aa',
    fontSize: ms(10),
    fontWeight: '700',
  },
  liquidTrack: {
    height: vs(10),
    backgroundColor: '#f0f0f0',
    borderRadius: ms(10),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  liquidFill: {
    height: '100%',
    borderRadius: ms(10),
  },
  liquidShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '50%',
    borderRadius: ms(10),
  },

  /* Footer */
  rigFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: vs(12),
  },
  yieldLabel: {
    color: '#666666',
    fontSize: ms(9),
    marginBottom: vs(2),
  },
  yieldValue: {
    color: '#000000',
    fontSize: ms(16),
    fontWeight: '700',
    letterSpacing: ms(0.5),
  },
  actionBtn: {
    backgroundColor: '#00000091',
    paddingVertical: vs(8),
    paddingHorizontal: s(18),
    borderRadius: ms(20),
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: ms(5),
    borderWidth: 0,
    borderColor: '#ff00aa',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: ms(10),
    fontWeight: '800',
  },
  emptyState: { alignItems: 'center', marginTop: vs(30) },
  emptyText: { color: '#555' },
});