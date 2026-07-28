import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  Image,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Animated,
  Pressable,
  Keyboard,
  Modal,
  Easing,
  PanResponder,
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
import Clipboard from '@react-native-clipboard/clipboard';

const AnimatedLinearGradient =
  Animated.createAnimatedComponent(LinearGradient);

/*
 * SWIPE BUTTON GEOMETRY
 *
 * These values match the original Confirm Deposit button:
 * height: vs(48)
 * borderRadius: ms(25)
 *
 * Change SWIPE_CORNER_RADIUS only to adjust its radius.
 */
const SWIPE_HEIGHT = vs(55);
const SWIPE_BORDER_WIDTH = s(2);
const SWIPE_THUMB_SIZE = vs(38);
const SWIPE_CORNER_RADIUS = ms(25);

const SWIPE_INNER_RADIUS = Math.max(
  0,
  SWIPE_CORNER_RADIUS - SWIPE_BORDER_WIDTH,
);

const SWIPE_VERTICAL_INSET = Math.max(
  0,
  (SWIPE_HEIGHT - SWIPE_THUMB_SIZE) / 2,
);

const SWIPE_FILL_RADIUS = Math.max(
  0,
  SWIPE_CORNER_RADIUS - SWIPE_VERTICAL_INSET,
);

const SWIPE_TRACK_PADDING = Math.max(
  0,
  (SWIPE_HEIGHT -
    SWIPE_BORDER_WIDTH * 2 -
    SWIPE_THUMB_SIZE) /
    2,
);

// --- POP BUTTON COMPONENT ---
const PopButton = ({ onPress, children, style, disabled }: any) => {
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

type SwipeButtonProps = {
  onSwipeSuccess: () => Promise<boolean>;
  loading: boolean;
  disabled: boolean;
  colors: string[];
  disabledColors: string[];
  activeText: string;
  disabledText: string;
};

// --- SWIPE BUTTON COMPONENT ---
const SwipeButton = ({
  onSwipeSuccess,
  loading,
  disabled,
  colors,
  disabledColors,
  activeText,
  disabledText,
}: SwipeButtonProps) => {
  const dragProgress = useRef(new Animated.Value(0)).current;

  const maxDragRef = useRef(0);
  const loadingRef = useRef(loading);
  const disabledRef = useRef(disabled);
  const onSwipeSuccessRef = useRef(onSwipeSuccess);
  const isCompletingRef = useRef(false);

  const SUCCESS_THRESHOLD = 0.75;

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    disabledRef.current = disabled;

    if (disabled) {
      isCompletingRef.current = false;
      dragProgress.setValue(0);
    }
  }, [disabled, dragProgress]);

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
      disabledRef.current ||
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
        const depositSucceeded =
          await onSwipeSuccessRef.current();

        if (!depositSucceeded) {
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
        return (
          !loadingRef.current &&
          !disabledRef.current &&
          !isCompletingRef.current
        );
      },

      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (
          loadingRef.current ||
          disabledRef.current ||
          isCompletingRef.current
        ) {
          return false;
        }

        const horizontalMovement = Math.abs(gestureState.dx);
        const verticalMovement = Math.abs(gestureState.dy);

        return (
          horizontalMovement > s(3) &&
          horizontalMovement > verticalMovement
        );
      },

      onPanResponderGrant: () => {
        dragProgress.stopAnimation();
      },

      onPanResponderMove: (_, gestureState) => {
        if (
          loadingRef.current ||
          disabledRef.current ||
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
          disabledRef.current ||
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

        const completionPoint =
          maxDragRef.current * SUCCESS_THRESHOLD;

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

  const animatedSliderWidth = Animated.add(
    dragProgress,
    SWIPE_THUMB_SIZE,
  );

  /*
   * Preserve the original disabled appearance:
   * solid grey gradient and grey text.
   */
  if (disabled) {
    return (
      <LinearGradient
        colors={disabledColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.submitBtn}
      >
        <Text
          style={[
            styles.submitBtnText,
            { color: '#888' },
          ]}
        >
          {disabledText}
        </Text>
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.swipeContainer,
        loading && styles.swipeDisabled,
      ]}
      onLayout={event => {
        const measuredWidth =
          event.nativeEvent.layout.width;

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
          {loading ? (
            <ActivityIndicator
              color="#fff"
              size="small"
              style={styles.swipeLoadingIndicator}
            />
          ) : (
            <Text
              pointerEvents="none"
              style={styles.swipeText}
            >
              {activeText}
            </Text>
          )}

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
              {!loading && (
                <Text style={styles.swipeThumbArrow}>
                  »
                </Text>
              )}
            </View>
          </AnimatedLinearGradient>
        </View>
      </LinearGradient>
    </View>
  );
};

// --- ⚛️ ANIMATED STATUS BADGE COMPONENT ---
const AnimatedStatusBadge = ({
  status,
  color,
}: {
  status: string;
  color: string;
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === 'pending') {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    }
  }, [status, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (status !== 'pending') {
    return (
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor: `${color}20`,
            borderColor: `${color}50`,
          },
        ]}
      >
        <Text style={[styles.statusText, { color }]}>
          {status.toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.statusBadge,
        {
          borderWidth: 0,
          paddingHorizontal: 0,
          paddingVertical: 0,
          overflow: 'hidden',
          backgroundColor: 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          width: 150,
          height: 150,
          transform: [{ rotate: spin }],
        }}
      >
        <LinearGradient
          colors={['transparent', color, 'transparent']}
          style={{ flex: 1 }}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 0 }}
        />
      </Animated.View>

      <View
        style={{
          margin: 1,
          backgroundColor: '#fff',
          borderRadius: ms(9),
          paddingHorizontal: s(8),
          paddingVertical: vs(3),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={[styles.statusText, { color }]}>
          {status.toUpperCase()}
        </Text>
      </View>
    </View>
  );
};

export default function DepositScreen() {
  const { user } = useUser();

  // App Logic States
  const [walletAddress, setWalletAddress] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // Input States
  const [txHash, setTxHash] = useState('');

  // User Data States
  const [fixedSenderAddress, setFixedSenderAddress] =
    useState<string | null>(null);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [hasPending, setHasPending] = useState(false);

  // UI States
  const [loading, setLoading] = useState(false);
  const [loadingDeposits, setLoadingDeposits] =
    useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [warningMessage, setWarningMessage] = useState(
    'Loading instructions...',
  );

  // --- 🎨 CYAN/MAGENTA THEME ---
  const THEME_GRADIENT = ['#ff00aa', '#9000ff'];
  const DISABLED_GRADIENT = ['#e0e0e0', '#cccccc'];

  // 1. Fetch Company Wallet & User's Fixed Address
  const fetchInitialData = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select(
          `
          sender_wallet_address,
          deposit_info (
            wallet_address,
            qr_code_url
          )
        `,
        )
        .eq('id', user.id)
        .single();

      if (!error && data) {
        const info: any = Array.isArray(data.deposit_info)
          ? data.deposit_info[0]
          : data.deposit_info;

        if (info) {
          setWalletAddress(info.wallet_address);
          setQrCodeUrl(info.qr_code_url);
        }

        if (data.sender_wallet_address) {
          setFixedSenderAddress(data.sender_wallet_address);
          setTxHash(data.sender_wallet_address);
        }
      }
    } catch (err) {
      console.log('Error fetching initial data', err);
    }
  };

  const fetchWarningText = async () => {
    try {
      const { data } = await supabase
        .from('fake_traders')
        .select('name')
        .eq('id', 11)
        .single();

      if (data?.name) {
        setWarningMessage(data.name);
      } else {
        setWarningMessage(
          'Copy address & send exact amount.',
        );
      }
    } catch (err) {
      console.log('Error fetching warning text', err);
    }
  };

  const fetchDeposits = async () => {
    if (!user?.id) return;

    setLoadingDeposits(true);

    const { data, error } = await supabase
      .from('deposits')
      .select('id, amount, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDeposits(data);

      const pendingExists = data.some(
        (d: any) => d.status === 'pending',
      );

      setHasPending(pendingExists);
    }

    setLoadingDeposits(false);
  };

  useEffect(() => {
    fetchInitialData();
    fetchDeposits();
    fetchWarningText();
  }, [user?.id]);

  const copyToClipboard = () => {
    if (walletAddress) {
      Clipboard.setString(walletAddress);

      Alert.alert(
        'Copied',
        'Wallet address copied to clipboard!',
      );
    }
  };

  const submitDeposit =
    async (): Promise<boolean> => {
      Keyboard.dismiss();

      const addressToSubmit =
        fixedSenderAddress || txHash.trim();

      if (!addressToSubmit) {
        Alert.alert(
          'Error',
          'Please enter your sender wallet address',
        );

        return false;
      }

      setLoading(true);

      try {
        if (!fixedSenderAddress) {
          const { data: existingUser } =
            await supabase
              .from('users')
              .select('id')
              .eq(
                'sender_wallet_address',
                addressToSubmit,
              )
              .maybeSingle();

          if (
            existingUser &&
            existingUser.id !== user.id
          ) {
            Alert.alert(
              'Failed',
              'This wallet address is already linked to another account.',
            );

            setLoading(false);

            return false;
          }
        }

        const { error: depositError } =
          await supabase
            .from('deposits')
            .insert([
              {
                user_id: user.id,
                sender_wallet_address:
                  addressToSubmit,
                tx_hash: addressToSubmit,
                wallet_address: walletAddress,
                status: 'pending',
              },
            ]);

        if (depositError) {
          throw depositError;
        }

        if (!fixedSenderAddress) {
          setFixedSenderAddress(
            addressToSubmit,
          );
        }

        setShowSuccess(true);
        fetchDeposits();

        return true;
      } catch (err: any) {
        Alert.alert('Error', err.message);

        return false;
      } finally {
        setLoading(false);
      }
    };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#009952';
      case 'pending':
        return '#b39800';
      case 'rejected':
        return '#a50000';
      default:
        return '#aaa';
    }
  };

  const renderHistoryItem = ({
    item,
  }: {
    item: any;
  }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyLeft}>
        <Text style={styles.historyAmount}>
          {item.status === 'pending'
            ? '$Amount'
            : `$${item.amount || 0}`}
        </Text>

        <Text style={styles.historyDate}>
          {new Date(
            item.created_at,
          ).toLocaleDateString()}{' '}
          •{' '}
          {new Date(
            item.created_at,
          ).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      <AnimatedStatusBadge
        status={item.status}
        color={getStatusColor(item.status)}
      />
    </View>
  );

  return (
    <ScreenWrapper>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#fff"
      />

      <LinearGradient
        colors={['#ffffff', '#fafafa', '#f0f0f0']}
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
                onAnimationFinish={() =>
                  setShowSuccess(false)
                }
                style={styles.successLottie}
                resizeMode="contain"
              />
            </View>
          </Modal>

          <KeyboardAvoidingView
            behavior={
              Platform.OS === 'ios'
                ? 'padding'
                : undefined
            }
            style={styles.container}
          >
            <View style={styles.topSection}>
              <Text style={styles.screenTitle}>
                Deposit Funds
              </Text>

              <LinearGradient
                colors={['#ff00aa', '#9000ff']}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientCard}
              >
                <View style={styles.qrRow}>
                  {qrCodeUrl ? (
                    <View style={styles.qrWrapper}>
                      <Image
                        source={{ uri: qrCodeUrl }}
                        style={styles.qrImage}
                        resizeMode="contain"
                      />
                    </View>
                  ) : null}

                  <View style={styles.warningBox}>
                    <Text
                      style={styles.warningText}
                    >
                      ⚠️ IMPORTANT
                    </Text>

                    <Text
                      style={styles.warningDesc}
                    >
                      {warningMessage}
                    </Text>
                  </View>
                </View>

                <View
                  style={styles.inputWrapper}
                >
                  <View style={styles.walletBox}>
                    <Text
                      style={styles.walletText}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                    >
                      {walletAddress ||
                        'Loading...'}
                    </Text>

                    <PopButton
                      onPress={copyToClipboard}
                      style={{ width: 'auto' }}
                    >
                      <Text
                        style={styles.copyText}
                      >
                        COPY
                      </Text>
                    </PopButton>
                  </View>
                </View>

                <View
                  style={styles.inputWrapper}
                >
                  <TextInput
                    style={[
                      styles.input,
                      fixedSenderAddress
                        ? {
                            opacity: 0.5,
                            backgroundColor:
                              'rgba(253, 253, 253, 0.72)',
                          }
                        : {},
                    ]}
                    placeholder="Sender Wallet Address"
                    value={txHash}
                    onChangeText={setTxHash}
                    autoCapitalize="none"
                    placeholderTextColor="rgba(0,0,0,0.4)"
                    editable={!fixedSenderAddress}
                  />
                </View>

                <SwipeButton
                  onSwipeSuccess={submitDeposit}
                  loading={loading}
                  disabled={hasPending}
                  colors={THEME_GRADIENT}
                  disabledColors={DISABLED_GRADIENT}
                  activeText="Confirm Deposit"
                  disabledText="Pending Deposit Active"
                />
              </LinearGradient>
            </View>

            <View
              style={styles.historyContainer}
            >
              <Text style={styles.historyHeader}>
                Recent History
              </Text>

              {loadingDeposits ? (
                <ActivityIndicator
                  color="#ff00aa"
                  style={{ marginTop: 20 }}
                />
              ) : (
                <FlatList
                  data={deposits}
                  keyExtractor={item =>
                    item.id.toString()
                  }
                  renderItem={renderHistoryItem}
                  contentContainerStyle={
                    styles.listContent
                  }
                  showsVerticalScrollIndicator={
                    false
                  }
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={
                    <Text
                      style={styles.emptyText}
                    >
                      No deposit history found
                    </Text>
                  }
                />
              )}
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
    paddingHorizontal: s(10),
    paddingTop: vs(10),
  },

  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      'rgba(255, 255, 255, 1)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },

  successLottie: {
    width: s(400),
    height: s(400),
  },

  topSection: {
    marginBottom: vs(20),
  },

  screenTitle: {
    fontSize: ms(24),
    fontWeight: '800',
    color: '#030303b2',
    marginBottom: vs(15),
    letterSpacing: ms(0.5),
    marginTop: vs(15),
  },

  formContainer: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: ms(20),
    padding: s(15),
    borderWidth: 1,
    borderColor:
      'rgba(255, 0, 170, 0.15)',
  },

  gradientCard: {
    borderRadius: ms(35),
    padding: s(15),
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 170, 0.15)',
  },

  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(15),
  },

  qrWrapper: {
    width: s(100),
    height: s(100),
    backgroundColor: '#fff',
    borderRadius: ms(20),
    padding: s(5),
    marginRight: s(15),
  },

  qrImage: {
    width: '100%',
    height: '100%',
  },

  warningBox: {
    flex: 1,
    justifyContent: 'center',
  },

  warningText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: ms(12),
    marginBottom: vs(2),
  },

  warningDesc: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: ms(11),
    lineHeight: ms(15),
  },

  inputWrapper: {
    marginBottom: vs(12),
  },

  walletBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: ms(20),
    paddingHorizontal: s(15),
    height: vs(40),
    borderWidth: 1,
    borderColor:
      'rgba(255, 0, 170, 0.3)',
  },

  walletText: {
    color: '#ff00aa',
    flex: 1,
    fontSize: ms(13),
    marginRight: s(10),
  },

  copyText: {
    color: '#ff00aa',
    fontWeight: '700',
    fontSize: ms(12),
    backgroundColor:
      'rgba(255, 0, 170, 0.1)',
    paddingHorizontal: s(10),
    paddingVertical: vs(5),
    borderRadius: ms(14),
    borderWidth: 0.5,
    borderColor: '#ff00aa',
  },

  input: {
    backgroundColor: '#fff',
    borderRadius: ms(20),
    height: vs(40),
    paddingHorizontal: s(15),
    color: '#000',
    fontSize: ms(14),
    borderWidth: 1,
    borderColor:
      'rgba(255, 0, 170, 0.3)',
  },

  /*
   * Original submit button style retained unchanged.
   * It is used for the disabled state.
   */
  submitBtn: {
    height: vs(48),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: vs(5),
    width: '100%',
  },

  submitBtnText: {
    color: '#fff',
    fontSize: ms(15),
    fontWeight: 'bold',
    letterSpacing: ms(0.5),
  },

  /*
   * Swipe version uses the same original dimensions,
   * radius and top spacing.
   */
  swipeContainer: {
    width: '100%',
    height: SWIPE_HEIGHT,
    borderRadius: SWIPE_CORNER_RADIUS,
    backgroundColor: 'transparent',
    marginTop: vs(5),
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
    fontSize: ms(15),
    fontWeight: 'bold',
    letterSpacing: ms(0.5),
  },

  swipeLoadingIndicator: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 3,
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

  historyContainer: {
    flex: 1,
  },

  historyHeader: {
    fontSize: ms(18),
    fontWeight: '700',
    color: '#030303b2',
    marginBottom: vs(10),
  },

  listContent: {
    paddingBottom: vs(200),
  },

  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(86, 0, 112, 0.06)',
    borderRadius: ms(20),
    padding: s(12),
    marginBottom: vs(8),
    borderWidth: 0,
    borderColor:
      'rgba(255, 0, 170, 0.15)',
  },

  historyLeft: {
    flexDirection: 'column',
  },

  historyAmount: {
    color: '#ff00aa',
    fontSize: ms(16),
    fontWeight: 'bold',
    marginBottom: vs(2),
  },

  historyDate: {
    color: 'rgba(0, 0, 0, 0.4)',
    fontSize: ms(11),
  },

  statusBadge: {
    paddingVertical: vs(4),
    paddingHorizontal: s(8),
    borderRadius: ms(10),
    borderWidth: 1,
  },

  statusText: {
    fontSize: ms(10),
    fontWeight: '800',
  },

  emptyText: {
    color: 'rgba(0,0,0,0.4)',
    textAlign: 'center',
    marginTop: vs(20),
    fontSize: ms(14),
  },
});