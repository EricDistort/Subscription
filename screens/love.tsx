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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  scale as s,
  verticalScale as vs,
  moderateScale as ms,
} from 'react-native-size-matters';
import ScreenWrapper from '../utils/ScreenWrapper';

const { width } = Dimensions.get('window');

// --- GENERIC POP BUTTON ---
const PopScaleButton = ({ children, onPress, style, disabled }: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() => {
        if (!disabled) {
          Animated.spring(scale, { toValue: 0.9, useNativeDriver: true }).start();
        }
      }}
      onPressOut={() => {
        if (!disabled) {
          Animated.spring(scale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }).start();
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

export default function PlanSimulatorScreen() {
  // Simulator State
  const [strategy, setStrategy] = useState<'hold' | 'withdraw'>('hold');
  const [referrals, setReferrals] = useState(0);
  const [daysElapsed, setDaysElapsed] = useState(0);

  // Constants
  const REF_BONUS_PER_USER = 10; // 10% of $100

  // ----------------------------------------------------
  // SIMULATION ENGINE (Driven entirely by Holding Balance)
  // ----------------------------------------------------
  const totalRefBonus = referrals * REF_BONUS_PER_USER;

  let currentWalletBalance = totalRefBonus;
  let currentPhase = 1;

  if (strategy === 'hold') {
    // Both Ref Bonus and Daily ROI compound into the holding balance
    let simBalance = totalRefBonus;
    
    for (let d = 1; d <= daysElapsed; d++) {
      if (simBalance >= 200) {
        simBalance += 3;
      } else if (simBalance >= 100) {
        simBalance += 2;
      } else {
        simBalance += 1;
      }
    }
    currentWalletBalance = simBalance;
  } else {
    // Withdraw strategy: Daily ROI is gone. ONLY Ref Bonus acts as Holding Balance.
    currentWalletBalance = totalRefBonus;
  }

  // Determine current active phase based solely on the Holding Balance
  if (currentWalletBalance >= 200) {
    currentPhase = 3;
  } else if (currentWalletBalance >= 100) {
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
    if (currentPhase >= 2) return <Text style={{ color: '#00ffaa' }}>UNLOCKED ($2 Daily)</Text>;

    if (strategy === 'withdraw') {
      const refsNeeded = Math.ceil((100 - currentWalletBalance) / REF_BONUS_PER_USER);
      return <Text style={{ color: '#ff4444' }}>Requires {refsNeeded} more Referral{refsNeeded !== 1 ? 's' : ''}</Text>;
    } else {
      const daysNeeded = Math.ceil(100 - currentWalletBalance);
      return <Text style={{ color: '#ffcc00' }}>Unlocks in {daysNeeded} day{daysNeeded !== 1 ? 's' : ''}</Text>;
    }
  };

  const getP3Status = () => {
    if (currentPhase >= 3) return <Text style={{ color: '#00ffaa' }}>MAX SPEED UNLOCKED ($3 Daily)</Text>;

    if (strategy === 'withdraw') {
      const refsNeeded = Math.ceil((200 - currentWalletBalance) / REF_BONUS_PER_USER);
      return <Text style={{ color: '#ff4444' }}>Requires {refsNeeded} more Referral{refsNeeded !== 1 ? 's' : ''}</Text>;
    } else {
      let daysNeeded = 0;
      if (currentWalletBalance < 100) {
        daysNeeded = Math.ceil(100 - currentWalletBalance) + 50;
      } else {
        daysNeeded = Math.ceil((200 - currentWalletBalance) / 2);
      }
      return <Text style={{ color: '#ffcc00' }}>Unlocks in {daysNeeded} day{daysNeeded !== 1 ? 's' : ''}</Text>;
    }
  };

  return (
    <ScreenWrapper>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <LinearGradient colors={['#000000', '#0a000e', '#170020']} style={styles.background}>
          {/* Restored ScrollView for perfect, breathable responsiveness */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* --- HEADER --- */}
            <View style={styles.header}>
              
              <Text style={styles.titleFilled}>Roadmap</Text>
              <Text style={styles.subtitle}>Investment $100 | Fastest path to 3% Daily</Text>
            </View>

            {/* --- CONTROLS --- */}
            <View style={styles.controlsContainer}>
              
              {/* Strategy Toggle */}
              <View style={styles.toggleRow}>
                <Text style={styles.controlLabel}>STRATEGY</Text>
                <Text style={styles.strategyDesc}>
                  {strategy === 'hold' ? "Compound Profits" : "Withdraw ROI"}
                </Text>
              </View>
              
              <View style={styles.toggleContainer}>
                <PopScaleButton
                  style={[styles.toggleBtn, strategy === 'hold' && styles.toggleBtnActive]}
                  onPress={() => { setStrategy('hold'); setDaysElapsed(0); }}
                >
                  <Text style={[styles.toggleText, strategy === 'hold' && styles.toggleTextActive]}>
                    HOLD PROFITS
                  </Text>
                </PopScaleButton>
                <PopScaleButton
                  style={[styles.toggleBtn, strategy === 'withdraw' && styles.toggleBtnActive]}
                  onPress={() => { setStrategy('withdraw'); setDaysElapsed(0); }}
                >
                  <Text style={[styles.toggleText, strategy === 'withdraw' && styles.toggleTextActive]}>
                    WITHDRAW DAILY
                  </Text>
                </PopScaleButton>
              </View>

              {/* Counters Section */}
              <View style={styles.countersWrapper}>
                
                {/* Referral Counter */}
                <View style={styles.actionBox}>
                  <View style={styles.boxLeftText}>
                    <Text style={styles.controlLabel}>DIRECT REFERRALS</Text>
                    <Text style={styles.bonusText}>Bonus: <Text style={{color: '#ff00aa'}}>${totalRefBonus}</Text></Text>
                  </View>
                  <View style={styles.counter}>
                    <PopScaleButton onPress={() => setReferrals(Math.max(0, referrals - 1))} style={styles.counterBtn}>
                      <Text style={styles.counterBtnText}>-</Text>
                    </PopScaleButton>
                    <Text style={styles.counterValue}>{referrals}</Text>
                    <PopScaleButton onPress={() => setReferrals(Math.min(30, referrals + 1))} style={styles.counterBtn}>
                      <Text style={styles.counterBtnText}>+</Text>
                    </PopScaleButton>
                  </View>
                </View>

                {/* Day Counter (Visible ONLY on 'Hold' strategy) */}
                {strategy === 'hold' && (
                  <View style={[styles.actionBox, { marginTop: vs(12), borderColor: 'rgba(0, 229, 255, 0.3)' }]}>
                    <View style={styles.boxLeftText}>
                      <Text style={[styles.controlLabel, { color: '#00e5ff' }]}>DAYS ELAPSED</Text>
                      <Text style={styles.bonusText}>ROI: <Text style={{color: '#00e5ff'}}>${currentWalletBalance - totalRefBonus}</Text></Text>
                    </View>
                    <View style={[styles.counter, { borderColor: 'rgba(0, 229, 255, 0.3)' }]}>
                      <PopScaleButton onPress={() => setDaysElapsed(d => Math.max(0, d - 1))} style={styles.counterBtn}>
                        <Text style={[styles.counterBtnText, { color: '#00e5ff' }]}>-</Text>
                      </PopScaleButton>
                      <Text style={styles.counterValue}>{daysElapsed}</Text>
                      <PopScaleButton onPress={() => setDaysElapsed(d => Math.min(250, d + 1))} style={styles.counterBtn}>
                        <Text style={[styles.counterBtnText, { color: '#00e5ff' }]}>+</Text>
                      </PopScaleButton>
                    </View>
                  </View>
                )}
              </View>

              {/* Centralized Horizontal Holding Balance */}
              <View style={styles.holdingBalanceContainer}>
                <LinearGradient
                  colors={['rgba(255, 0, 170, 0)', 'rgba(0, 0, 0, 0)', 'rgba(0, 229, 255, 0)']}
                  style={styles.holdingBalanceGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  
                  <Text style={styles.holdingBalanceAmount}>
                    $<Text style={{ color: '#fff', alignSelf: 'center' }}>{currentWalletBalance}</Text>
                  </Text>
                </LinearGradient>
              </View>

            </View>

            {/* --- VISUALIZER --- */}
            <View style={styles.visualizerContainer}>
              
              {/* PHASE 1 CARD */}
              <View style={[styles.phaseCard, currentPhase >= 1 && styles.phaseActiveCardP1]}>
                <View style={styles.phaseHeaderRow}>
                  <Text style={[styles.phaseTitle, currentPhase >= 1 && { color: '#ff00aa' }]}>PHASE 1</Text>
                  <Text style={styles.rateText}>1% <Text style={styles.rateSub}>/ DAY</Text></Text>
                </View>
                <Text style={styles.statusText}>
                  Status: <Text style={{ color: '#00ffaa' }}>ACTIVE ($1 Daily)</Text>
                </Text>
              </View>

              <View style={[styles.connector, currentPhase >= 2 && { backgroundColor: '#ff00aa' }]} />

              {/* PHASE 2 CARD */}
              <View style={[styles.phaseCard, currentPhase >= 2 && styles.phaseActiveCardP2]}>
                <View style={styles.phaseHeaderRow}>
                  <Text style={[styles.phaseTitle, currentPhase >= 2 && { color: '#9000ff' }]}>PHASE 2</Text>
                  <Text style={styles.rateText}>2% <Text style={styles.rateSub}>/ DAY</Text></Text>
                </View>
                <Text style={styles.statusText}>
                  Status: {getP2Status()}
                </Text>
              </View>

              <View style={[styles.connector, currentPhase === 3 && { backgroundColor: '#9000ff' }]} />

              {/* PHASE 3 CARD */}
              <View style={[styles.phaseCard, currentPhase === 3 && styles.phaseActiveCardP3]}>
                <View style={styles.phaseHeaderRow}>
                  <Text style={[styles.phaseTitle, currentPhase === 3 && { color: '#00e5ff' }]}>PHASE 3</Text>
                  <Text style={styles.rateText}>3% <Text style={styles.rateSub}>/ DAY</Text></Text>
                </View>
                <Text style={styles.statusText}>
                  Status: {getP3Status()}
                </Text>
              </View>

            </View>

          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  background: { flex: 1 },
  scrollContent: { 
    paddingHorizontal: s(10), 
    paddingTop: vs(20),
    paddingBottom: vs(60), // Ample bottom padding to ensure final card is fully visible
  },

  /* HEADER */
  header: { 
    alignItems: 'center',
    marginBottom: vs(25),
  },
  titleOutline: {
    fontSize: ms(36),
    fontWeight: '300',
    color: 'transparent',
    textShadowColor: 'rgba(255, 0, 170, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    letterSpacing: 4,
    marginBottom: -8,
  },
  titleFilled: {
    fontSize: ms(36),
    fontWeight: '900',
    color: '#ff00aa',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: ms(12),
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: vs(3),
    fontWeight: '700',
    //textTransform: 'uppercase',
  },

  /* CONTROLS */
  controlsContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
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
    color: 'rgba(255,255,255,0.5)',
    fontSize: ms(12),
    fontWeight: '900',
    letterSpacing: 1,
  },
  strategyDesc: {
    color: '#aaa',
    fontSize: ms(11),
    //fontStyle: 'italic',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    backgroundColor: '#f700ff',
    borderWidth: 1,
    borderColor: '#ff00aa',
  },
  toggleText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: ms(12),
    fontWeight: '900',
  },
  toggleTextActive: {
    color: '#000000',
  },

  countersWrapper: {
    marginBottom: vs(10),
  },
  actionBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: s(16),
    paddingVertical: vs(10),
    borderRadius: ms(25),
    //borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  boxLeftText: { flex: 1 },
  bonusText: {
    color: '#fff',
    fontSize: ms(13),
    fontWeight: 'bold',
    marginTop: vs(4),
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
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
    color: '#fff',
    fontSize: ms(18),
    fontWeight: '900',
    minWidth: s(30),
    textAlign: 'center',
  },

  /* Horizontal Holding Balance Display */
  holdingBalanceContainer: {
    borderRadius: ms(15),
    //overflow: 'hidden',
   // borderWidth: 1,
   
   
  },
  holdingBalanceGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(20),
    paddingVertical: vs(5),

  },
  holdingBalanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: ms(12),
    fontWeight: '900',
    letterSpacing: 1,
  },
  holdingBalanceAmount: {
    fontSize: ms(28),
    fontWeight: '900',
    color: '#00e5ff',
    textShadowColor: 'rgba(0, 229, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  /* VISUALIZER */
  visualizerContainer: {
    alignItems: 'center',
  },
  phaseCard: {
    width: '100%',
    backgroundColor: 'rgba(20,20,20,0.8)',
    borderRadius: ms(16),
    paddingHorizontal: s(20),
    paddingVertical: vs(8),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  phaseActiveCardP1: {
    borderColor: '#ff00aa',
    backgroundColor: 'rgba(255, 0, 170, 0.05)',
    shadowColor: '#ff00aa',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 600,
  },
  phaseActiveCardP2: {
    borderColor: '#9000ff',
    backgroundColor: 'rgba(144, 0, 255, 0.05)',
    shadowColor: '#9000ff',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 600,
  },
  phaseActiveCardP3: {
    borderColor: '#00e5ff',
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
    shadowColor: '#00e5ff',
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
    color: 'rgba(255,255,255,0.3)',
    fontSize: ms(16),
    fontWeight: '900',
    letterSpacing: 2,
  },
  rateText: {
    color: '#fff',
    fontSize: ms(22),
    fontWeight: 'bold',
  },
  rateSub: {
    fontSize: ms(12),
    color: 'rgba(255,255,255,0.5)',
  },
  statusText: {
    fontSize: ms(13),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  connector: {
    width: 2,
    height: vs(20),
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});