import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  RefreshControl,
  Animated,
  Pressable,
  Modal,
  PanResponder,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import {
  scale as s,
  verticalScale as vs,
  moderateScale as ms,
} from 'react-native-size-matters';
import ScreenWrapper from '../../utils/ScreenWrapper';
import { useUser } from '../../utils/UserContext';
import { supabase } from '../../utils/supabaseClient';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

/*
 * SWIPE BUTTON GEOMETRY
 *
 * These values match the original withdrawal button:
 * height: vs(55)
 * borderRadius: ms(25)
 *
 * Change SWIPE_CORNER_RADIUS to adjust the button radius.
 */
const SWIPE_HEIGHT = vs(55);
const SWIPE_BORDER_WIDTH = s(2);
const SWIPE_THUMB_SIZE = vs(40);
const SWIPE_CORNER_RADIUS = ms(25);

const SWIPE_INNER_RADIUS = Math.max(
  0,
  SWIPE_CORNER_RADIUS - SWIPE_BORDER_WIDTH,
);

const SWIPE_VERTICAL_INSET = Math.max(0, (SWIPE_HEIGHT - SWIPE_THUMB_SIZE) / 2);

const SWIPE_FILL_RADIUS = Math.max(
  0,
  SWIPE_CORNER_RADIUS - SWIPE_VERTICAL_INSET,
);

const SWIPE_TRACK_PADDING = Math.max(
  0,
  (SWIPE_HEIGHT - SWIPE_BORDER_WIDTH * 2 - SWIPE_THUMB_SIZE) / 2,
);

// --- POP BUTTON COMPONENT ---
const PopButton = ({
  onPress,
  children,
  style,
  disabled,
  contentStyle,
}: any) => {
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
      disabled={disabled}
      style={style}
    >
      <Animated.View
        style={[
          {
            transform: [{ scale: scaleValue }],
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
          },
          contentStyle,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

type SwipeButtonProps = {
  onSwipeSuccess: () => Promise<boolean>;
  loading: boolean;
  colors: string[];
  text: string;
};

// --- SWIPE BUTTON COMPONENT ---
const SwipeButton = ({
  onSwipeSuccess,
  loading,
  colors,
  text,
}: SwipeButtonProps) => {
  const dragProgress = useRef(new Animated.Value(0)).current;

  const maxDragRef = useRef(0);
  const loadingRef = useRef(loading);

  const onSwipeSuccessRef = useRef(onSwipeSuccess);

  const isCompletingRef = useRef(false);

  const SUCCESS_THRESHOLD = 0.75;

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    onSwipeSuccessRef.current = onSwipeSuccess;
  }, [onSwipeSuccess]);

  const resetSlider = () => {
    isCompletingRef.current = false;

    Animated.spring(dragProgress, {
      toValue: 0,
      friction: 7,
      tension: 85,
      useNativeDriver: false,
    }).start();
  };

  const completeSwipe = () => {
    if (
      loadingRef.current ||
      isCompletingRef.current ||
      maxDragRef.current <= 0
    ) {
      return;
    }

    isCompletingRef.current = true;

    Animated.timing(dragProgress, {
      toValue: maxDragRef.current,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(async ({ finished }) => {
      if (!finished) {
        resetSlider();
        return;
      }

      try {
        const withdrawalSucceeded = await onSwipeSuccessRef.current();

        if (!withdrawalSucceeded) {
          resetSlider();
        }
      } catch {
        resetSlider();
      }
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        return !loadingRef.current && !isCompletingRef.current;
      },

      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (loadingRef.current || isCompletingRef.current) {
          return false;
        }

        const horizontalMovement = Math.abs(gestureState.dx);

        const verticalMovement = Math.abs(gestureState.dy);

        return (
          horizontalMovement > s(3) && horizontalMovement > verticalMovement
        );
      },

      onPanResponderGrant: () => {
        dragProgress.stopAnimation();
      },

      onPanResponderMove: (_, gestureState) => {
        if (
          loadingRef.current ||
          isCompletingRef.current ||
          maxDragRef.current <= 0
        ) {
          return;
        }

        const nextProgress = Math.max(
          0,
          Math.min(gestureState.dx, maxDragRef.current),
        );

        dragProgress.setValue(nextProgress);
      },

      onPanResponderRelease: (_, gestureState) => {
        if (
          loadingRef.current ||
          isCompletingRef.current ||
          maxDragRef.current <= 0
        ) {
          resetSlider();
          return;
        }

        const releasedPosition = Math.max(
          0,
          Math.min(gestureState.dx, maxDragRef.current),
        );

        const completionPoint = maxDragRef.current * SUCCESS_THRESHOLD;

        if (releasedPosition >= completionPoint) {
          completeSwipe();
        } else {
          resetSlider();
        }
      },

      onPanResponderTerminate: () => {
        if (!isCompletingRef.current) {
          resetSlider();
        }
      },

      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  const animatedSliderWidth = Animated.add(dragProgress, SWIPE_THUMB_SIZE);

  return (
    <View
      style={[styles.swipeContainer, loading && styles.swipeDisabled]}
      onLayout={event => {
        const measuredWidth = event.nativeEvent.layout.width;

        maxDragRef.current = Math.max(
          0,
          measuredWidth -
            SWIPE_THUMB_SIZE -
            SWIPE_TRACK_PADDING * 2 -
            SWIPE_BORDER_WIDTH * 2,
        );
      }}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.swipeBorderGradient}
      >
        <View style={styles.swipeInnerTrack}>
          <Text pointerEvents="none" style={styles.swipeText}>
            {text}
          </Text>

          <AnimatedLinearGradient
            {...panResponder.panHandlers}
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.swipeExpandingFill,
              {
                left: SWIPE_TRACK_PADDING,
                width: animatedSliderWidth,
                height: SWIPE_THUMB_SIZE,
                borderRadius: SWIPE_FILL_RADIUS,
              },
            ]}
          >
            <View
              style={[
                styles.swipeArrowContainer,
                {
                  width: SWIPE_THUMB_SIZE,
                  height: SWIPE_THUMB_SIZE,
                  borderRadius: SWIPE_FILL_RADIUS,
                },
              ]}
            >
              {!loading && <Text style={styles.swipeThumbArrow}>»</Text>}
            </View>
          </AnimatedLinearGradient>

          {loading && (
            <ActivityIndicator
              color="#ffffff"
              size="small"
              style={styles.swipeLoadingIndicator}
            />
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

export default function WithdrawalScreen() {
  const { user, setUser } = useUser();

  const [wallet, setWallet] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);

  // 🎨 CHANGED: Cyan/Magenta Gradient
  const THEME_GRADIENT = ['#ff00aa', '#9000ff'];

  const fetchUserBalance = async () => {
    if (!user?.id) return;

    // 🚨 UPDATED: Fetch sender_wallet_address too
    const { data, error } = await supabase
      .from('users')
      .select('withdrawal_amount, sender_wallet_address')
      .eq('id', user.id)
      .single();

    if (data && !error) {
      setUser({
        ...user,
        withdrawal_amount: data.withdrawal_amount,
      });

      // 🚨 UPDATED: Auto-fill the wallet state
      if (data.sender_wallet_address) {
        setWallet(data.sender_wallet_address);
      }
    }
  };

  const fetchWithdrawals = async () => {
    if (!user?.id) return;

    if (!refreshing) {
      setLoadingWithdrawals(true);
    }

    const { data, error } = await supabase
      .from('withdrawals')
      .select('id, receiving_wallet, amount, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', {
        ascending: false,
      })
      .limit(20);

    if (!error) {
      setWithdrawals(data || []);
    }

    setLoadingWithdrawals(false);
  };

  useEffect(() => {
    fetchWithdrawals();
    fetchUserBalance();
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    await Promise.all([fetchUserBalance(), fetchWithdrawals()]);

    setRefreshing(false);
  }, [user?.id]);

  const handleMaxAmount = () => {
    setAmount(user?.withdrawal_amount?.toString() || '0');
  };

  const submitWithdrawal = async (): Promise<boolean> => {
    Keyboard.dismiss();

    // 🚨 FIX: Strict Validation Checks
    if (!amount || amount.trim() === '') {
      Alert.alert('Invalid Amount', 'Please enter an amount to withdraw.');

      return false;
    }

    const withdrawalAmount = parseFloat(amount);

    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      Alert.alert(
        'Invalid Amount',
        'Please enter a valid number greater than 0.',
      );

      return false;
    }

    if (withdrawalAmount > (user?.withdrawal_amount || 0)) {
      Alert.alert(
        'Insufficient Balance',
        'You cannot withdraw more than your available balance.',
      );

      return false;
    }

    if (!wallet || wallet.trim() === '') {
      Alert.alert(
        'Wallet Error',
        'No linked wallet address found. Please link a wallet first.',
      );

      return false;
    }

    setLoading(true);

    try {
      // 🚨 NEW: We pass the User ID manually now
      const { error } = await supabase.rpc('request_withdrawal', {
        user_id_arg: user.id,
        amount_req: withdrawalAmount,
        wallet_addr: wallet.trim(),
      });

      if (error) {
        throw error;
      }

      setShowSuccess(true);
      setAmount('');
      onRefresh();

      return true;
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.message || 'Something went wrong processing your withdrawal.',
      );

      return false;
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#00aa5b';
      case 'pending':
        return '#ad9300';
      case 'rejected':
        return '#b63000';
      default:
        return '#aaa';
    }
  };

  const renderHistoryItem = ({ item }: { item: any }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyRow}>
        <View>
          <Text style={styles.historyAmount}>${item.amount}</Text>

          <Text style={styles.historyDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        <View
          style={{
            alignItems: 'flex-end',
          }}
        >
          <View
            style={[
              styles.statusBadge,
              {
                borderColor: getStatusColor(item.status),
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: getStatusColor(item.status),
                },
              ]}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>

          <Text
            style={styles.walletTruncated}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {item.receiving_wallet}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.pageTitle}>Withdraw</Text>

      {/* Balance Card */}
      <LinearGradient
        colors={THEME_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCard}
      >
        <View style={styles.cardContent}>
          <View>
            <Text style={styles.balanceLabel}>Total Balance</Text>

            <Text style={styles.balanceValue}>
              {user?.withdrawal_amount?.toFixed(2) || '0.00'}
            </Text>
          </View>

          <View style={styles.iconContainer}>
            <Text style={styles.currencyIcon}>$</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Input Forms */}
      <View style={styles.formContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.input,
              {
                opacity: 0.8,
                backgroundColor: '#f8ebff',
              },
            ]}
            placeholder="Linked Wallet Address"
            placeholderTextColor="rgba(0,0,0,0.4)"
            value={wallet}
            editable={false}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputWrapper}>
          <View style={styles.amountInputContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  flex: 1,
                  borderWidth: 0,
                },
              ]}
              placeholder="Enter Amount"
              placeholderTextColor="rgba(0,0,0,0.4)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            {/* MAX Button with Pop Effect */}
            <PopButton
              onPress={handleMaxAmount}
              style={{
                marginRight: s(15),
              }}
              contentStyle={{
                width: 'auto',
              }}
            >
              <Text style={styles.maxText}>MAX</Text>
            </PopButton>
          </View>
        </View>

        {/* Submit Swipe Button */}
        <View style={styles.submitBtnContainer}>
          <SwipeButton
            onSwipeSuccess={submitWithdrawal}
            loading={loading}
            colors={THEME_GRADIENT}
            text="CONFIRM WITHDRAWAL"
          />
        </View>
      </View>

      <View style={styles.historyHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>

        <View style={styles.line} />
      </View>
    </View>
  );

  return (
    <ScreenWrapper>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* 🌑 Background: Light Theme Gradient */}
      <LinearGradient
        colors={['#ffffff', '#f5f5f5', '#ebebeb']}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <Modal
            visible={showSuccess}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
          >
            <View style={styles.successOverlay}>
              <LottieView
                source={require('../homeMedia/Latesuccess.json')}
                autoPlay
                loop={false}
                onAnimationFinish={() => setShowSuccess(false)}
                style={styles.successLottie}
                resizeMode="contain"
              />
            </View>
          </Modal>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
          >
            {renderHeader()}

            <View style={styles.historyContainer}>
              <FlatList
                data={withdrawals}
                keyExtractor={item => item.id.toString()}
                renderItem={renderHistoryItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#ff00aa"
                    colors={['#ff00aa', '#9000ff']}
                    progressBackgroundColor="#ffffff"
                  />
                }
                ListEmptyComponent={
                  !loadingWithdrawals ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>
                        No transactions found
                      </Text>
                    </View>
                  ) : (
                    <ActivityIndicator
                      color="#ff00aa"
                      style={{
                        marginTop: 20,
                      }}
                    />
                  )
                }
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
  },

  historyContainer: {
    flex: 1,
  },

  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 1)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },

  successLottie: {
    width: s(400),
    height: s(400),
  },

  headerContainer: {
    paddingHorizontal: s(20),
    marginBottom: vs(10),
    paddingTop: vs(10),
  },

  pageTitle: {
    fontSize: ms(24),
    fontWeight: '900',
    color: '#ff00aa',
    marginBottom: vs(15),
    letterSpacing: ms(0.5),
    marginTop: vs(15),
  },

  balanceCard: {
    borderRadius: ms(35),
    padding: s(20),
    marginBottom: vs(20),
    shadowColor: '#ff00aa',
    shadowOffset: {
      width: 0,
      height: vs(8),
    },
    shadowOpacity: 0.3,
    shadowRadius: ms(12),
    elevation: 8,
  },

  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  balanceLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: ms(12),
    fontWeight: '700',
    marginBottom: vs(4),
    textTransform: 'uppercase',
  },

  balanceValue: {
    color: '#fff',
    fontSize: ms(32),
    fontWeight: '800',
  },

  iconContainer: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  currencyIcon: {
    color: '#fff',
    fontSize: ms(20),
    fontWeight: 'bold',
  },

  formContainer: {
    gap: vs(12),
    marginBottom: vs(25),
  },

  inputWrapper: {
    width: '100%',
  },

  input: {
    backgroundColor: '#ffffff',
    borderRadius: ms(20),
    height: vs(50),
    paddingHorizontal: s(15),
    color: '#000000',
    fontSize: ms(15),
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 170, 0.2)',
  },

  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: ms(20),
    height: vs(50),
    paddingRight: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 170, 0.2)',
  },

  maxText: {
    color: '#ff00aa',
    fontWeight: '800',
    fontSize: ms(12),
    backgroundColor: 'rgba(255, 0, 170, 0.1)',
    paddingHorizontal: s(10),
    paddingVertical: vs(5),
    borderRadius: ms(14),
    borderWidth: 0.5,
    borderColor: '#ff00aa',
  },

  /*
   * Original submit button container styling
   * remains unchanged.
   */
  submitBtnContainer: {
    marginTop: vs(5),
    shadowColor: '#ff00aa',
    shadowOffset: {
      width: 0,
      height: vs(4),
    },
    shadowOpacity: 0.3,
    shadowRadius: ms(5),
    elevation: 5,
    width: '100%',
  },

  /*
   * Original submit button style retained.
   */
  submitBtn: {
    height: vs(50),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },

  btnText: {
    color: '#ffffff',
    fontSize: ms(14),
    fontWeight: '900',
    letterSpacing: ms(1),
  },

  /*
   * Swipe button uses the exact original
   * height and corner radius.
   */
  swipeContainer: {
    width: '100%',
    height: SWIPE_HEIGHT,
    borderRadius: SWIPE_CORNER_RADIUS,
    backgroundColor: 'transparent',
  },

  swipeDisabled: {
    opacity: 0.8,
  },

  swipeBorderGradient: {
    flex: 1,
    padding: SWIPE_BORDER_WIDTH,
    borderRadius: SWIPE_CORNER_RADIUS,
  },

  swipeInnerTrack: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: SWIPE_INNER_RADIUS,
    backgroundColor: '#ffffff',
  },

  swipeText: {
    position: 'absolute',
    width: '100%',
    zIndex: 1,
    textAlign: 'center',
    color: '#9000ff',
    fontSize: ms(14),
    fontWeight: '900',
    letterSpacing: ms(1),
  },

  swipeLoadingIndicator: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 4,
  },

  swipeExpandingFill: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'flex-end',
    overflow: 'hidden',
    zIndex: 2,
  },

  swipeArrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  swipeThumbArrow: {
    marginLeft: s(2),
    marginBottom: vs(3),
    color: '#ffffff',
    fontSize: ms(24),
    fontWeight: '900',
  },

  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(10),
  },

  sectionTitle: {
    fontSize: ms(16),
    fontWeight: '700',
    color: '#030303b2',
    marginRight: s(10),
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },

  listContent: {
    paddingBottom: vs(200),
  },

  historyCard: {
    marginBottom: vs(12),
    marginHorizontal: s(20),
    backgroundColor: 'rgba(106, 0, 155, 0.1)',

    borderRadius: ms(20),
    padding: s(12),
    borderWidth: 0,
    borderColor: 'rgba(255, 0, 170, 0.1)',
  },

  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  historyAmount: {
    color: '#ff00aa',
    fontSize: ms(16),
    fontWeight: '700',
    marginBottom: vs(2),
  },

  historyDate: {
    color: 'rgba(0, 0, 0, 0.4)',
    fontSize: ms(11),
  },

  statusBadge: {
    paddingHorizontal: s(8),
    paddingVertical: vs(2),
    borderRadius: ms(10),
    borderWidth: 1,
    marginBottom: vs(4),
  },

  statusText: {
    fontSize: ms(10),
    fontWeight: '800',
  },

  walletTruncated: {
    color: 'rgba(0,0,0,0.4)',
    fontSize: ms(11),
    maxWidth: s(100),
    textAlign: 'right',
  },

  emptyState: {
    marginTop: vs(20),
    alignItems: 'center',
  },

  emptyText: {
    color: 'rgba(0,0,0,0.4)',
    fontSize: ms(14),
  },
});
