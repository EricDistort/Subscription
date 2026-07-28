import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Animated,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  scale as s,
  verticalScale as vs,
  moderateScale as ms,
} from 'react-native-size-matters';
import ScreenWrapper from '../../utils/ScreenWrapper';
import { supabase } from '../../utils/supabaseClient';
import { useUser } from '../../utils/UserContext';

const { width } = Dimensions.get('window');

// --- GENERIC POP BUTTON ---
const PopScaleButton = ({ children, onPress, style, disabled }: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() => {
        if (!disabled) {
          Animated.spring(scale, {
            toValue: 0.9,
            useNativeDriver: true,
          }).start();
        }
      }}
      onPressOut={() => {
        if (!disabled) {
          Animated.spring(scale, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      }}
      onPress={!disabled ? onPress : undefined}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function PersonalizedSimulatorScreen() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);

  // User Data State
  const [userDeposits, setUserDeposits] = useState(0);
  const [userHoldings, setUserHoldings] = useState(0);

  // Simulator State (Starts at 0 for projection)
  const [strategy, setStrategy] = useState<'hold' | 'withdraw'>('hold');
  const [referrals, setReferrals] = useState(0);
  const [daysElapsed, setDaysElapsed] = useState(0);

  // Fetch User Data on Mount
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('deposits, withdrawal_amount')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setUserDeposits(data.deposits || 0);
          setUserHoldings(data.withdrawal_amount || 0);
        }
      } catch (err) {
        console.error('Error fetching user stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // ----------------------------------------------------
  // DYNAMIC SIMULATION ENGINE
  // ----------------------------------------------------
  // Prevent division by zero if user has 0 deposits
  const BASE_INV = userDeposits > 0 ? userDeposits : 100;
  const REF_BONUS_PER_USER = BASE_INV * 0.1; // 10% of their actual deposit
  const P2_TARGET = BASE_INV; // 1x Deposit
  const P3_TARGET = BASE_INV * 2; // 2x Deposit

  const addedRefBonus = referrals * REF_BONUS_PER_USER;

  let currentWalletBalance = userHoldings + addedRefBonus;
  let currentPhase = 1;

  if (strategy === 'hold') {
    let simBalance = currentWalletBalance;

    for (let d = 1; d <= daysElapsed; d++) {
      if (simBalance >= P3_TARGET) {
        simBalance += BASE_INV * 0.03;
      } else if (simBalance >= P2_TARGET) {
        simBalance += BASE_INV * 0.02;
      } else {
        simBalance += BASE_INV * 0.01;
      }
    }
    currentWalletBalance = simBalance;
  } else {
    // Withdraw strategy: Only starting holdings + new referrals count
    currentWalletBalance = userHoldings + addedRefBonus;
  }

  // Determine current active phase
  if (currentWalletBalance >= P3_TARGET) {
    currentPhase = 3;
  } else if (currentWalletBalance >= P2_TARGET) {
    currentPhase = 2;
  } else {
    currentPhase = 1;
  }

  // Animation for phase shifts
  const glowAnim = useRef(new Animated.Value(currentPhase)).current;
  useEffect(() => {
    Animated.timing(glowAnim, {
      toValue: currentPhase,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [currentPhase]);

  // Dynamic Status Resolvers
  const getP2Status = () => {
    if (currentPhase >= 2)
      return (
        <Text style={{ color: '#00ffaa' }}>
          UNLOCKED (${(BASE_INV * 0.02).toFixed(2)} Daily)
        </Text>
      );

    if (strategy === 'withdraw') {
      const refsNeeded = Math.ceil(
        (P2_TARGET - currentWalletBalance) / REF_BONUS_PER_USER,
      );
      return (
        <Text style={{ color: '#ff4444' }}>
          Requires {refsNeeded} more Referral{refsNeeded !== 1 ? 's' : ''}
        </Text>
      );
    } else {
      const daysNeeded = Math.ceil(
        (P2_TARGET - currentWalletBalance) / (BASE_INV * 0.01),
      );
      return (
        <Text style={{ color: '#ffcc00' }}>
          Unlocks in {daysNeeded} day{daysNeeded !== 1 ? 's' : ''}
        </Text>
      );
    }
  };

  const getP3Status = () => {
    if (currentPhase >= 3)
      return (
        <Text style={{ color: '#00ffaa' }}>
          MAX SPEED UNLOCKED (${(BASE_INV * 0.03).toFixed(2)} Daily)
        </Text>
      );

    if (strategy === 'withdraw') {
      const refsNeeded = Math.ceil(
        (P3_TARGET - currentWalletBalance) / REF_BONUS_PER_USER,
      );
      return (
        <Text style={{ color: '#ff4444' }}>
          Requires {refsNeeded} more Referral{refsNeeded !== 1 ? 's' : ''}
        </Text>
      );
    } else {
      let daysNeeded = 0;
      if (currentWalletBalance < P2_TARGET) {
        // Days to hit P2 + Days to hit P3 (which is always 50 days at 2%)
        daysNeeded =
          Math.ceil((P2_TARGET - currentWalletBalance) / (BASE_INV * 0.01)) +
          50;
      } else {
        // Already in P2, just calculate remaining days at 2%
        daysNeeded = Math.ceil(
          (P3_TARGET - currentWalletBalance) / (BASE_INV * 0.02),
        );
      }
      return (
        <Text style={{ color: '#ffcc00' }}>
          Unlocks in {daysNeeded} day{daysNeeded !== 1 ? 's' : ''}
        </Text>
      );
    }
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <LinearGradient
          colors={['#ffffff', '#fafafa', '#f0f0f0']}
          style={[
            styles.background,
            { justifyContent: 'center', alignItems: 'center' },
          ]}
        >
          <ActivityIndicator size="large" color="#ff00aa" />
          <Text
            style={{
              color: '#ff00aa',
              marginTop: vs(10),
              fontWeight: 'bold',
              letterSpacing: 2,
            }}
          >
            SYNCING VAULT...
          </Text>
        </LinearGradient>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <LinearGradient
          colors={['#ffffff', '#fafafa', '#f0f0f0']}
          style={styles.background}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* --- HEADER --- */}
            <View style={styles.header}>
              <Text style={styles.titleFilled}>Roadmap</Text>
              <Text style={styles.subtitle}>
                Base Vault: ${BASE_INV} | Plan your path to 3%
              </Text>
            </View>

            {/* --- CONTROLS --- */}
            <View style={styles.controlsContainer}>
              {/* Strategy Toggle */}
              <View style={styles.toggleRow}>
                <Text style={styles.controlLabel}>STRATEGY PROJECTION:</Text>
                <Text style={styles.strategyDesc}>
                  {strategy === 'hold' ? 'Compound Profits' : 'Withdraw ROI'}
                </Text>
              </View>

              <View style={styles.toggleContainer}>
                <PopScaleButton
                  style={[
                    styles.toggleBtn,
                    strategy === 'hold' && styles.toggleBtnActive,
                  ]}
                  onPress={() => {
                    setStrategy('hold');
                    setDaysElapsed(0);
                  }}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      strategy === 'hold' && styles.toggleTextActive,
                    ]}
                  >
                    HOLD PROFITS
                  </Text>
                </PopScaleButton>
                <PopScaleButton
                  style={[
                    styles.toggleBtn,
                    strategy === 'withdraw' && styles.toggleBtnActive,
                  ]}
                  onPress={() => {
                    setStrategy('withdraw');
                    setDaysElapsed(0);
                  }}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      strategy === 'withdraw' && styles.toggleTextActive,
                    ]}
                  >
                    WITHDRAW DAILY
                  </Text>
                </PopScaleButton>
              </View>

              {/* Counters Section */}
              <View style={styles.countersWrapper}>
                {/* Referral Counter */}
                <View style={styles.actionBox}>
                  <View style={styles.boxLeftText}>
                    <Text style={styles.controlLabel}>
                      ADDITIONAL REFERRALS
                    </Text>
                    <Text style={styles.bonusText}>
                      New Bonus:{' '}
                      <Text style={{ color: '#ff00aa' }}>
                        ${addedRefBonus.toFixed(2)}
                      </Text>
                    </Text>
                  </View>
                  <View style={styles.counter}>
                    <PopScaleButton
                      onPress={() => setReferrals(Math.max(0, referrals - 1))}
                      style={styles.counterBtn}
                    >
                      <Text style={styles.counterBtnText}>-</Text>
                    </PopScaleButton>
                    <Text style={styles.counterValue}>{referrals}</Text>
                    <PopScaleButton
                      onPress={() => setReferrals(Math.min(50, referrals + 1))}
                      style={styles.counterBtn}
                    >
                      <Text style={styles.counterBtnText}>+</Text>
                    </PopScaleButton>
                  </View>
                </View>

                {/* Day Counter (Visible ONLY on 'Hold' strategy) */}
                {strategy === 'hold' && (
                  <View
                    style={[
                      styles.actionBox,
                      {
                        marginTop: vs(12),
                        borderColor: 'rgba(0, 150, 200, 0.3)',
                      },
                    ]}
                  >
                    <View style={styles.boxLeftText}>
                      <Text style={[styles.controlLabel, { color: '#0088cc' }]}>
                        FUTURE DAYS HELD
                      </Text>
                      <Text style={[styles.bonusText, { color: '#333' }]}>
                        Est. ROI:{' '}
                        <Text style={{ color: '#0088cc' }}>
                          $
                          {(
                            currentWalletBalance -
                            userHoldings -
                            addedRefBonus
                        ).toFixed(2)}
                        </Text>
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.counter,
                        { borderColor: 'rgba(0, 150, 200, 0.3)' },
                      ]}
                    >
                      <PopScaleButton
                        onPress={() => setDaysElapsed(d => Math.max(0, d - 1))}
                        style={styles.counterBtn}
                      >
                        <Text
                          style={[styles.counterBtnText, { color: '#0088cc' }]}
                        >
                          -
                        </Text>
                      </PopScaleButton>
                      <Text style={[styles.counterValue, { color: '#333' }]}>{daysElapsed}</Text>
                      <PopScaleButton
                        onPress={() =>
                          setDaysElapsed(d => Math.min(365, d + 1))
                        }
                        style={styles.counterBtn}
                      >
                        <Text
                          style={[styles.counterBtnText, { color: '#0088cc' }]}
                        >
                          +
                        </Text>
                      </PopScaleButton>
                    </View>
                  </View>
                )}
              </View>

              {/* Centralized Horizontal Holding Balance */}
              <View style={styles.holdingBalanceContainer}>
                <LinearGradient
                  colors={[
                    'rgba(255, 0, 170, 0)',
                    'rgba(0, 0, 0, 0)',
                    'rgba(0, 150, 200, 0)',
                  ]}
                  style={styles.holdingBalanceGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.holdingBalanceAmount}>
                    $
                    <Text style={{ color: '#000', alignSelf: 'center' }}>
                      {currentWalletBalance.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </Text>
                </LinearGradient>
              </View>
            </View>

            {/* --- VISUALIZER --- */}
            <View style={styles.visualizerContainer}>
              {/* PHASE 1 CARD */}
              <View
                style={[
                  styles.phaseCard,
                  currentPhase >= 1 && styles.phaseActiveCardP1,
                ]}
              >
                <View style={styles.phaseHeaderRow}>
                  <Text
                    style={[
                      styles.phaseTitle,
                      currentPhase >= 1 && { color: '#ff00aa' },
                    ]}
                  >
                    PHASE 1
                  </Text>
                  <Text style={styles.rateText}>
                    1% <Text style={styles.rateSub}>/ DAY</Text>
                  </Text>
                </View>
                <Text style={styles.statusText}>
                  Status:{' '}
                  <Text style={{ color: '#00aa66' }}>
                    ACTIVE (${(BASE_INV * 0.01).toFixed(2)} Daily)
                  </Text>
                </Text>
              </View>

              <View
                style={[
                  styles.connector,
                  currentPhase >= 2 && { backgroundColor: '#ff00aa' },
                ]}
              />

              {/* PHASE 2 CARD */}
              <View
                style={[
                  styles.phaseCard,
                  currentPhase >= 2 && styles.phaseActiveCardP2,
                ]}
              >
                <View style={styles.phaseHeaderRow}>
                  <Text
                    style={[
                      styles.phaseTitle,
                      currentPhase >= 2 && { color: '#9000ff' },
                    ]}
                  >
                    PHASE 2
                  </Text>
                  <Text style={styles.rateText}>
                    2% <Text style={styles.rateSub}>/ DAY</Text>
                  </Text>
                </View>
                <Text style={styles.statusText}>Status: {getP2Status()}</Text>
              </View>

              <View
                style={[
                  styles.connector,
                  currentPhase === 3 && { backgroundColor: '#9000ff' },
                ]}
              />

              {/* PHASE 3 CARD */}
              <View
                style={[
                  styles.phaseCard,
                  currentPhase === 3 && styles.phaseActiveCardP3,
                ]}
              >
                <View style={styles.phaseHeaderRow}>
                  <Text
                    style={[
                      styles.phaseTitle,
                      currentPhase === 3 && { color: '#0088cc' },
                    ]}
                  >
                    PHASE 3
                  </Text>
                  <Text style={styles.rateText}>
                    3% <Text style={styles.rateSub}>/ DAY</Text>
                  </Text>
                </View>
                <Text style={styles.statusText}>Status: {getP3Status()}</Text>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  background: { flex: 1 },
  scrollContent: {
    paddingHorizontal: s(10),
    paddingTop: vs(20),
    paddingBottom: vs(60),
  },

  /* HEADER */
  header: {
    alignItems: 'center',
    marginBottom: vs(25),
  },
  titleFilled: {
    fontSize: ms(36),
    fontWeight: '900',
    color: '#ff00aa',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: ms(12),
    color: 'rgba(0, 0, 0, 0.6)',
    marginTop: vs(3),
    fontWeight: '700',
  },

  /* CONTROLS */
  controlsContainer: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: ms(20),
    padding: s(15),
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 170, 0.1)',
    marginBottom: vs(20),
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(5),
  },
  controlLabel: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: ms(12),
    fontWeight: '900',
    letterSpacing: 1,
  },
  strategyDesc: {
    color: '#666',
    fontSize: ms(11),
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: ms(20),
    padding: s(4),
    marginBottom: vs(10),
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: vs(12),
    alignItems: 'center',
    borderRadius: ms(20),
  },
  toggleBtnActive: {
    backgroundColor: '#ff00aa',
    borderWidth: 1,
    borderColor: '#ff00aa',
  },
  toggleText: {
    color: 'rgba(0,0,0,0.4)',
    fontSize: ms(12),
    fontWeight: '900',
  },
  toggleTextActive: {
    color: '#ffffff',
  },

  countersWrapper: {
    marginBottom: vs(10),
  },
  actionBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: s(16),
    paddingVertical: vs(10),
    borderRadius: ms(25),
    borderColor: 'rgba(0,0,0,0.05)',
  },
  boxLeftText: { flex: 1 },
  bonusText: {
    color: '#333',
    fontSize: ms(13),
    fontWeight: 'bold',
    marginTop: vs(4),
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: ms(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 170, 0.2)',
  },
  counterBtn: {
    paddingHorizontal: s(16),
    paddingVertical: vs(5),
  },
  counterBtnText: {
    color: '#ff00aa',
    fontSize: ms(20),
    fontWeight: 'bold',
  },
  counterValue: {
    color: '#000',
    fontSize: ms(18),
    fontWeight: '900',
    minWidth: s(30),
    textAlign: 'center',
  },

  /* Horizontal Holding Balance Display */
  holdingBalanceContainer: {
    borderRadius: ms(15),
  },
  holdingBalanceGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(20),
    paddingVertical: vs(5),
  },
  holdingBalanceAmount: {
    fontSize: ms(28),
    fontWeight: '900',
    color: '#0088cc',
    textShadowColor: 'rgba(0, 150, 200, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  /* VISUALIZER */
  visualizerContainer: {
    alignItems: 'center',
  },
  phaseCard: {
    width: '100%',
    backgroundColor: 'rgba(240,240,240,0.8)',
    borderRadius: ms(16),
    paddingHorizontal: s(20),
    paddingVertical: vs(8),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  phaseActiveCardP1: {
    borderColor: '#ff00aa',
    backgroundColor: 'rgba(255, 0, 170, 0.05)',
    shadowColor: '#ff00aa',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 600,
  },
  phaseActiveCardP2: {
    borderColor: '#9000ff',
    backgroundColor: 'rgba(144, 0, 255, 0.05)',
    shadowColor: '#9000ff',
      shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 600,
  },
  phaseActiveCardP3: {
    borderColor: '#0088cc',
    backgroundColor: 'rgba(0, 150, 200, 0.05)',
    shadowColor: '#0088cc',
      shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 600,
  },
  phaseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(2),
  },
  phaseTitle: {
    color: 'rgba(0,0,0,0.3)',
    fontSize: ms(16),
    fontWeight: '900',
    letterSpacing: 2,
  },
  rateText: {
    color: '#000',
    fontSize: ms(22),
    fontWeight: 'bold',
  },
  rateSub: {
    fontSize: ms(12),
    color: 'rgba(0,0,0,0.5)',
  },
  statusText: {
    fontSize: ms(13),
    fontWeight: '700',
  
    color: 'rgba(0,0,0,0.5)',
  },
  connector: {
    width: 2,
    height: vs(20),
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
});