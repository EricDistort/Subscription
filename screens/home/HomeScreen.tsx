import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Pressable,
} from 'react-native';
import {
  scale as s,
  verticalScale as vs,
  moderateScale as ms,
} from 'react-native-size-matters';
import { useUser } from '../../utils/UserContext';
import ScreenWrapper from '../../utils/ScreenWrapper';
import { supabase } from '../../utils/supabaseClient';
import LinearGradient from 'react-native-linear-gradient';

// --- POP BUTTON COMPONENT ---
const PopScaleButton = ({ children, onPress, style }: any) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };
  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={style}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleValue }],
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function HomeScreen({ navigation }: any) {
  const { user, setUser } = useUser();
  const [refreshing, setRefreshing] = useState(false);

  // ⛏️ Mining Rigs State
  const [miningRigs, setMiningRigs] = useState<any[]>([]);
  const [loadingRigs, setLoadingRigs] = useState(false);

  const [partnerData, setPartnerData] = useState({
    name: 'SantrX',
    url: 'https://santrx.com/login',
  });

  // 1. CALCULATE HOLD-TO-EARN LOGIC
  const totalEarned = Math.floor(parseFloat(user?.total_earned || 0)); // Keep this for display
  const withdrawalAmount = parseFloat(user?.withdrawal_amount || 0);
  const totalDeposits = parseFloat(user?.deposits || 0);

  // Determine current tier and progress
  let currentDaily = 0;
  let targetDaily = 0;
  let isMaxed = false;
  let progressPercent = 0;

  if (totalDeposits > 0) {
    if (withdrawalAmount >= totalDeposits * 2) {
      currentDaily = totalDeposits * 0.03;
      isMaxed = true;
      progressPercent = 100;
    } else if (withdrawalAmount >= totalDeposits) {
      currentDaily = totalDeposits * 0.02;
      targetDaily = totalDeposits * 0.03;
      // Calculate progress from 1X to 2X
      progressPercent =
        ((withdrawalAmount - totalDeposits) / totalDeposits) * 100;
    } else {
      currentDaily = totalDeposits * 0.01;
      targetDaily = totalDeposits * 0.02;
      progressPercent = (withdrawalAmount / totalDeposits) * 100;
    }

    // Ensure it stays between 0 and 100
    progressPercent = Math.max(0, Math.min(progressPercent, 100));
  }

  const fetchUserData = async () => {
    if (!user?.id) return;
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select(
          'balance, profileImage, username, account_number, direct_business, total_earned, deposits, withdrawal_amount, renewal_date',
        )
        .eq('id', user.id)
        .single();

      if (!error && userData) {
        setUser((prev: any) => ({ ...prev, ...userData }));
      }
    } catch (error) {
      console.log('User fetch error:', error);
    }
  };

  // 🏭 Generate Fake Mining Data
  const generateMiningData = () => {
    setLoadingRigs(true);
    const rigs = Array.from({ length: 11 }).map((_, index) => ({
      id: index + 1,
      name: `SER-${100 + index}`,
      hashRate: (Math.random() * (150 - 80) + 80).toFixed(1),
      temp: Math.floor(Math.random() * (85 - 60) + 60),
      yield: (Math.random() * (0.05 - 0.01) + 0.01).toFixed(4),
      status: 'ONSITE',
    }));
    setMiningRigs(rigs);
    setLoadingRigs(false);
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchUserData();
    generateMiningData();

    const interval = setInterval(() => {
      setMiningRigs(prev =>
        prev.map(rig => ({
          ...rig,
          hashRate: (
            parseFloat(rig.hashRate) +
            (Math.random() * 2 - 1)
          ).toFixed(1),
          yield: (parseFloat(rig.yield) + 0.0001).toFixed(4),
          temp: Math.max(
            60,
            Math.min(90, rig.temp + Math.floor(Math.random() * 3 - 1)),
          ),
        })),
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserData();
    generateMiningData();
    setRefreshing(false);
  }, [user?.id]);

  const handleProfilePress = () => {
    navigation.navigate('ProfileScreen');
  };

  // --- SUBSCRIPTION CHECKER ---
  const checkSubscriptionAndNavigate = (targetScreen: string) => {
    const renewalDateStr = user?.renewal_date;

    if (!renewalDateStr) {
      // No date found in database
      navigation.navigate('SubscriptionScreen');
      return;
    }

    // Parse DD/MM/YYYY format
    const parts = renewalDateStr.split('/');
    let renewalDate;
    if (parts.length === 3) {
      renewalDate = new Date(
        parseInt(parts[2]),
        parseInt(parts[1]) - 1,
        parseInt(parts[0]),
      );
    } else {
      // Fallback just in case it's another standard format
      renewalDate = new Date(renewalDateStr);
    }

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Reset time to midnight for an accurate day comparison

    if (renewalDate < currentDate) {
      // Date has crossed
      navigation.navigate('SubscriptionScreen');
    } else {
      // Valid subscription
      navigation.navigate(targetScreen);
    }
  };

  return (
    <ScreenWrapper>
      <LinearGradient
        colors={['#ffffff', '#fafafa', '#f0f0f0']}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ff00aa"
              colors={['#ff00aa', '#9000ff']}
              progressBackgroundColor="#fff"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Profile Section */}
            <View style={styles.firstContainer}>
              <PopScaleButton onPress={handleProfilePress}>
                <View style={styles.avatarContainer}>
                  <Image
                    source={
                      user?.profileImage
                        ? { uri: user.profileImage }
                        : require('../homeMedia/Avatar.png')
                    }
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                </View>
              </PopScaleButton>

              <View style={styles.userInfo}>
                <Text style={styles.name}>
                  {user?.username || 'Guest User'}
                </Text>
                <Text style={styles.accountNumber}>
                  Account No {user?.account_number || '0000000000'}
                </Text>
              </View>

              <PopScaleButton
                style={styles.editButton}
                onPress={() => navigation.navigate('Help')}
              >
                <Image
                  source={require('../homeMedia/support.webp')}
                  style={styles.editImage}
                  resizeMode="contain"
                />
              </PopScaleButton>
            </View>

            {/* BALANCE SECTION */}
            <View style={styles.secondContainerWrapper}>
              <LinearGradient
                colors={['#ff00aa', '#9000ff']}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientCard}
              >
                <View style={styles.balanceOverlay}>
                  {/* 1. Round Amount (No Label) */}
                  <Text style={styles.balanceAmount}>${withdrawalAmount}</Text>

                  {/* 2. Hold-to-Earn Progress Bar */}
                  <View style={styles.progressContainer}>
                    {/* The Track */}
                    <View style={styles.progressBarTrack}>
                      {/* The Glowing Fill */}
                      <LinearGradient
                        colors={['rgba(255,255,255,0.5)', '#ffffff']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          width: `${progressPercent}%`,
                          height: '100%',
                          borderRadius: ms(10),
                        }}
                      />
                    </View>

                    {/* Tier Text below bar (Matching old styling) */}
                    <View style={styles.limitTextRow}>
                      <Text style={styles.limitText}>
                        Earning Now{' '}
                        <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>
                          ${currentDaily.toFixed(2)}
                        </Text>
                      </Text>
                      {!isMaxed && (
                        <Text style={styles.limitText}>
                          Unlock{' '}
                          <Text
                            style={{ color: '#ffffff', fontWeight: 'bold' }}
                          >
                            ${targetDaily.toFixed(2)}
                          </Text>
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* 3. Original Button Row (Exact Position Preserved) */}
                  <View style={styles.fourButtonRow}>
                    {[
                      {
                        name: 'Deposit',
                        icon: require('../homeMedia/deposit.webp'),
                        onPress: () =>
                          checkSubscriptionAndNavigate('DepositMoney'),
                      },
                      {
                        name: 'Rewards',
                        icon: require('../homeMedia/send.webp'),
                        onPress: () =>
                          checkSubscriptionAndNavigate('StoreMain'),
                      },
                      {
                        name: 'Social',
                        icon: require('../homeMedia/recieve.webp'),
                        onPress: () =>
                          checkSubscriptionAndNavigate('RecieveMoney'),
                      },
                      {
                        name: 'Withdraw',
                        icon: require('../homeMedia/withdraw.webp'),
                        onPress: () =>
                          checkSubscriptionAndNavigate('WithdrawalMoney'),
                      },
                    ].map((btn, index) => (
                      <PopScaleButton
                        key={index}
                        style={styles.imageButton}
                        onPress={btn.onPress}
                      >
                        <Image source={btn.icon} style={styles.buttonIcon} />
                        <Text style={styles.buttonLabel}>{btn.name}</Text>
                      </PopScaleButton>
                    ))}
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Direct Business & Partner Section */}
            <View style={{ flexDirection: 'row', gap: s(8) }}>
              <PopScaleButton onPress={() => navigation.navigate('Plan')}>
                <Text style={styles.withdrawabledText}>
                  <Text style={styles.boldedAmount}>3 Step Roadmap</Text>
                </Text>
              </PopScaleButton>

              <PopScaleButton onPress={() => navigation.navigate('Map')}>
                <Text style={styles.withdrawabledText}>
                  <Text style={styles.boldedAmount}>Show</Text>
                </Text>
              </PopScaleButton>
            </View>

            {/* Live Mining Operations Section */}
            <View style={styles.thirdContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.transactionsTitle}>Running Nodes</Text>
                <LinearGradient
                  colors={['#030303b2', '#ff00aa00']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.slickLine}
                />
              </View>

              {loadingRigs ? (
                <ActivityIndicator size="small" color="#ff00aa" />
              ) : (
                <View style={{ width: '100%', height: vs(320) }}>
                  <ScrollView
                    contentContainerStyle={{
                      alignItems: 'center',
                      paddingBottom: vs(20),
                    }}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                    indicatorStyle="black"
                  >
                    {miningRigs.map(rig => (
                      <PopScaleButton
                        key={rig.id}
                        style={styles.miningCard}
                        onPress={() =>
                          checkSubscriptionAndNavigate('SendMoney')
                        }
                      >
                        <LinearGradient
                          colors={[
                            'rgba(250, 250, 250, 0.9)',
                            'rgba(240, 240, 240, 0.95)',
                          ]}
                          style={styles.miningCardInner}
                        >
                          {/* Rig Info */}
                          <View style={styles.rigInfoLeft}>
                            <View style={styles.rigIconBox}>
                              <Text style={{ fontSize: ms(20) }}>🔵</Text>
                            </View>
                            <View>
                              <Text style={styles.rigName}>SERVER</Text>
                              <Text style={styles.rigStatus}>
                                ● {rig.status}
                              </Text>
                            </View>
                          </View>
                          {/* Tech Stats */}
                          <View style={styles.rigStats}>
                            <Text style={styles.statLabel}>THERMAL</Text>
                            <Text style={styles.statValue}>
                              {rig.hashRate} TH/s
                            </Text>
                            <View
                              style={{
                                height: vs(4),
                              }}
                            />
                            <Text
                              style={[
                                styles.statValue,
                                {
                                  color: rig.temp > 80 ? '#FF4500' : '#ff00aa',
                                },
                              ]}
                            >
                              {rig.temp}°C
                            </Text>
                          </View>
                          {/* Yield */}
                          <View style={styles.rigYieldBox}>
                            <Text style={styles.yieldLabel}>Cerculate</Text>
                            <Text style={styles.yieldValue}>{rig.yield}</Text>
                          </View>
                        </LinearGradient>
                        <View style={styles.progressBarBg}>
                          <LinearGradient
                            colors={['#ff00aa', '#9000ff']}
                            style={{
                              width: `${(rig.temp / 100) * 100}%`,
                              height: '100%',
                            }}
                          />
                        </View>
                      </PopScaleButton>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingVertical: vs(5) },
  firstContainer: {
    width: '95%',
    height: '11%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(10),
    marginTop: vs(25),
  },
  userInfo: { flex: 1 },
  name: { fontSize: ms(18), fontWeight: 'bold', color: '#030303c0' },
  accountNumber: {
    fontSize: ms(14),
    color: 'rgba(0,0,0,0.4)',
    marginTop: vs(2),
  },
  editButton: { padding: ms(8) },
  editImage: {
    width: s(30),
    height: s(30),
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: vs(4) },
    shadowOpacity: 0.2,
    shadowRadius: ms(10),
    elevation: 10,
  },

  // Avatar Styles
  avatarContainer: {
    width: s(70),
    height: s(70),

    marginRight: s(6),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  avatarImage: { width: '100%', height: '100%' },

  secondContainerWrapper: {
    width: '92%',
    height: '30%',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: vs(10),
    borderRadius: ms(50),
    backgroundColor: '#fff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: vs(4) },
    shadowOpacity: 0.2,
    shadowRadius: ms(10),
    elevation: 10,
    borderColor: '#ff82d3',
    borderWidth: 1,
  },
  gradientCard: {
    width: '100%',
    height: '100%',
    borderRadius: ms(20),
    alignSelf: 'center',
  },
  balanceOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: s(20),
  },

  // Adjusted Amount Style
  balanceAmount: {
    fontSize: ms(52),
    fontWeight: 'bold',
    color: '#ffe6f9',
    marginBottom: vs(5),
    textShadowColor: 'rgba(255, 0, 170, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: ms(10),
  },

  progressContainer: {
    width: '97%',
    marginBottom: vs(15),
    alignItems: 'center',
  },
  progressBarTrack: {
    width: '100%',
    height: vs(8),
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: ms(10),
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 170, 0.31)',
    overflow: 'hidden',
    marginBottom: vs(4),
  },
  limitTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: s(2),
  },
  limitText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: ms(10),
    fontWeight: '600',
  },

  // PRESERVED BUTTON ROW STYLE
  fourButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: vs(-10),
  },
  imageButton: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'transparent',
  },
  buttonIcon: {
    width: s(50),
    height: s(50),
    resizeMode: 'contain',
    backgroundColor: '#fff',
    borderRadius: ms(100),
    borderWidth: 2,
    borderColor: 'rgba(255, 0, 170, 0.32)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: vs(4) },
    shadowOpacity: 0.2,
    shadowRadius: ms(10),
    elevation: 10,
  },
  buttonLabel: { fontSize: ms(12), color: '#ffe6f9', textAlign: 'center' },

  withdrawableText: {
    marginTop: vs(10),
    marginBottom: vs(3),
    fontSize: ms(13),
    color: 'rgba(255, 38, 219, 0.85)',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 0, 212, 0.07)',
    paddingHorizontal: s(10),
    paddingVertical: vs(2),
    borderRadius: ms(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 212, 0.89)',
  },
  withdrawabledText: {
    marginTop: vs(10),
    marginBottom: vs(3),
    fontSize: ms(13),
    color: '#000000',
    textAlign: 'center',
    backgroundColor: 'rgba(221, 0, 184, 0.89)',
    paddingHorizontal: s(10),
    paddingVertical: vs(2),
    borderRadius: ms(20),
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: vs(4) },
    shadowOpacity: 0.2,
    shadowRadius: ms(10),
    elevation: 10,
  },
  boldAmount: {
    fontWeight: 'bold',
    fontSize: ms(16),
    color: 'rgb(255, 0, 212)',
  },
  boldedAmount: { fontWeight: '500', fontSize: ms(14), color: '#ffffff' },

  thirdContainer: {
    width: '98%',
    borderRadius: ms(12),
    padding: s(8),
    marginBottom: vs(30),
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(10),
  },
  transactionsTitle: {
    fontSize: ms(18),
    fontWeight: 'bold',
    color: '#030303b2',
  },
  slickLine: {
    flex: 1,
    height: vs(0.5),
    marginLeft: s(12),
    borderRadius: ms(2),
    opacity: 0.8,
  },

  /* ⚒️ Mining Card Styles */
  miningCard: {
    borderRadius: ms(25),
    marginBottom: vs(10),
    width: '100%',
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: 'rgba(255, 0, 170, 0)',
  },
  miningCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: s(12),
    width: '100%',
    backgroundColor: 'rgba(174, 0, 255, 0.71)',
  },
  rigInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '35%',
  },
  rigIconBox: {
    width: s(36),
    height: s(36),
    borderRadius: ms(10),
    backgroundColor: 'rgba(255, 0, 170, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: s(8),
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 170, 0.2)',
  },
  rigName: {
    color: '#030303b2',
    fontWeight: '700',
    fontSize: ms(12),
  },
  rigStatus: {
    color: '#ff00aa',
    fontSize: ms(9),
    fontWeight: '600',
    marginTop: vs(2),
  },
  rigStats: {
    width: '30%',
    alignItems: 'flex-start',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.1)',
    paddingLeft: s(12),
  },
  statLabel: {
    color: '#666',
    fontSize: ms(8),
    fontWeight: '700',
  },
  statValue: {
    color: '#333',
    fontSize: ms(11),
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  rigYieldBox: {
    width: '30%',
    alignItems: 'flex-end',
  },
  yieldLabel: {
    color: '#333',
    fontSize: ms(9),
    fontWeight: '800',
    marginBottom: vs(2),
  },
  yieldValue: {
    color: '#ff00aa',
    fontSize: ms(16),
    fontWeight: '700',
    textShadowColor: 'rgba(255, 0, 170, 0.2)',
    textShadowRadius: 5,
  },
  progressBarBg: {
    height: vs(3),
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
});
