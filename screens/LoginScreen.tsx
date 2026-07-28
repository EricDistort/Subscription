import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  PanResponder,
  Easing,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  scale as s,
  verticalScale as vs,
  moderateScale as ms,
} from 'react-native-size-matters';

import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';

import { supabase } from '../utils/supabaseClient';
import { useUser } from '../utils/UserContext';
import ScreenWrapper from '../utils/ScreenWrapper';

const { width, height } = Dimensions.get('window');

const AnimatedLinearGradient =
  Animated.createAnimatedComponent(LinearGradient);

/*
 * SWIPE BUTTON GEOMETRY
 *
 * Change SWIPE_CORNER_RADIUS to control the overall radius.
 *
 * Fully rounded:
 * const SWIPE_CORNER_RADIUS = SWIPE_HEIGHT / 2;
 *
 * Slightly less rounded:
 * const SWIPE_CORNER_RADIUS = vs(22);
 */
const SWIPE_HEIGHT = vs(58);
const SWIPE_BORDER_WIDTH = s(2);
const SWIPE_THUMB_SIZE = vs(46);

/*
 * CHANGE THIS VALUE TO ADJUST THE RADIUS.
 */
const SWIPE_CORNER_RADIUS = vs(26 );

/*
 * These values are automatically calculated so the outer border,
 * inner track and expanding gradient remain visually aligned.
 */
const SWIPE_INNER_RADIUS = Math.max(
  0,
  SWIPE_CORNER_RADIUS - SWIPE_BORDER_WIDTH
);

const SWIPE_VERTICAL_INSET = Math.max(
  0,
  (SWIPE_HEIGHT - SWIPE_THUMB_SIZE) / 2
);

const SWIPE_FILL_RADIUS = Math.max(
  0,
  SWIPE_CORNER_RADIUS - SWIPE_VERTICAL_INSET
);

/*
 * This padding aligns the slider's left edge with its top and
 * bottom spacing inside the gradient border.
 */
const SWIPE_TRACK_PADDING = Math.max(
  0,
  (SWIPE_HEIGHT -
    SWIPE_BORDER_WIDTH * 2 -
    SWIPE_THUMB_SIZE) /
    2
);

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
};

type PopButtonProps = {
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  style?: any;
};

const PopButton = ({
  onPress,
  children,
  disabled = false,
  style,
}: PopButtonProps) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;

    Animated.spring(scaleValue, {
      toValue: 0.95,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 5,
      tension: 80,
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
          width: '100%',
          transform: [{ scale: scaleValue }],
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
  colors: string[];
};

const SwipeButton = ({
  onSwipeSuccess,
  loading,
  colors,
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
        const loginSucceeded =
          await onSwipeSuccessRef.current();

        if (!loginSucceeded) {
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
          !isCompletingRef.current
        );
      },

      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (
          loadingRef.current ||
          isCompletingRef.current
        ) {
          return false;
        }

        const horizontalMovement = Math.abs(
          gestureState.dx
        );

        const verticalMovement = Math.abs(
          gestureState.dy
        );

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
          isCompletingRef.current ||
          maxDragRef.current <= 0
        ) {
          return;
        }

        const nextProgress = Math.max(
          0,
          Math.min(
            gestureState.dx,
            maxDragRef.current
          )
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
          Math.min(
            gestureState.dx,
            maxDragRef.current
          )
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
    })
  ).current;

  const animatedSliderWidth = Animated.add(
    dragProgress,
    SWIPE_THUMB_SIZE
  );

  return (
    <View
      style={[
        styles.swipeContainer,
        loading && styles.swipeDisabled,
      ]}
      onLayout={(event) => {
        const measuredWidth =
          event.nativeEvent.layout.width;

        maxDragRef.current = Math.max(
          0,
          measuredWidth -
            SWIPE_THUMB_SIZE -
            SWIPE_TRACK_PADDING * 2 -
            SWIPE_BORDER_WIDTH * 2
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
          <Text
            pointerEvents="none"
            style={styles.swipeText}
          >
            {loading
              ? 'AUTHENTICATING...'
              : 'SWIPE TO ACCESS'}
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
              <Text style={styles.swipeThumbArrow}>
                »
              </Text>
            </View>
          </AnimatedLinearGradient>
        </View>
      </LinearGradient>
    </View>
  );
};

export default function Login() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList>
    >();

  const { setUser } = useUser();

  const [accountNumber, setAccountNumber] =
    useState('');

  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);

  const THEME_GRADIENT = [
    '#ff00aa',
    '#9000ff',
  ];

  const navigateToApp = (userData: any) => {
    setUser(userData);
    navigation.replace('Main');
  };

  const handleLogin =
    async (): Promise<boolean> => {
      Keyboard.dismiss();

      const cleanedAccountNumber =
        accountNumber.trim();

      const cleanedPassword = password.trim();

      if (
        !cleanedAccountNumber ||
        !cleanedPassword
      ) {
        Alert.alert(
          'Missing Details',
          'Please enter your account number and password.'
        );

        return false;
      }

      const numericAccountNumber = Number(
        cleanedAccountNumber
      );

      if (
        !Number.isSafeInteger(
          numericAccountNumber
        ) ||
        numericAccountNumber <= 0
      ) {
        Alert.alert(
          'Invalid Account Number',
          'Please enter a valid numeric account number.'
        );

        return false;
      }

      if (loading) {
        return false;
      }

      setLoading(true);

      const startTime = Date.now();
      const minimumLoadingDuration = 3000;

      try {
        const { data: user, error } =
          await supabase
            .from('users')
            .select('*')
            .eq(
              'account_number',
              numericAccountNumber
            )
            .maybeSingle();

        if (error) {
          throw error;
        }

        const elapsedTime =
          Date.now() - startTime;

        const remainingTime = Math.max(
          0,
          minimumLoadingDuration - elapsedTime
        );

        await new Promise<void>((resolve) => {
          setTimeout(resolve, remainingTime);
        });

        if (!user) {
          setLoading(false);

          setTimeout(() => {
            Alert.alert(
              'Login Failed',
              'Account number not found.'
            );
          }, 100);

          return false;
        }

        if (user.password !== cleanedPassword) {
          setLoading(false);

          setTimeout(() => {
            Alert.alert(
              'Login Failed',
              'The password you entered is incorrect.'
            );
          }, 100);

          return false;
        }

        setLoading(false);
        navigateToApp(user);

        return true;
      } catch (error: unknown) {
        const elapsedTime =
          Date.now() - startTime;

        const remainingTime = Math.max(
          0,
          minimumLoadingDuration - elapsedTime
        );

        await new Promise<void>((resolve) => {
          setTimeout(resolve, remainingTime);
        });

        setLoading(false);

        const message =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.';

        setTimeout(() => {
          Alert.alert('Error', message);
        }, 100);

        return false;
      }
    };

  return (
    <ScreenWrapper>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
      />

      <TouchableWithoutFeedback
        onPress={Keyboard.dismiss}
        accessible={false}
      >
        <View style={styles.mainContainer}>
          <LinearGradient
            colors={[
              'rgba(255, 0, 170, 0.3)',
              'rgba(255, 255, 255, 0)',
            ]}
            style={styles.topGlow}
            pointerEvents="none"
          />

          <View
            style={styles.bottomGlow}
            pointerEvents="none"
          />

          {loading && (
            <View style={styles.loadingOverlay}>
              <LottieView
                source={require('./LoginMedia/Loadinglatest.json')}
                autoPlay
                loop
                style={styles.loadingAnimation}
              />
            </View>
          )}

          <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
              behavior={
                Platform.OS === 'ios'
                  ? 'padding'
                  : 'height'
              }
              style={styles.keyboardAvoidingView}
            >
              <ScrollView
                contentContainerStyle={
                  styles.scrollContent
                }
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={
                  Platform.OS === 'ios'
                    ? 'interactive'
                    : 'on-drag'
                }
                directionalLockEnabled
              >
                <View
                  style={styles.contentContainer}
                >
                  <View style={styles.header}>
                    <Text
                      style={styles.titleOutline}
                    >
                      Welcome
                    </Text>

                    <Text
                      style={styles.titleFilled}
                    >
                      Back
                    </Text>

                    <Text style={styles.subtitle}>
                      Sign in to access your Liquid.
                    </Text>
                  </View>

                  <View style={styles.formSection}>
                    <View
                      style={styles.inputContainer}
                    >
                      <Text style={styles.label}>
                        ACCOUNT NUMBER
                      </Text>

                      <TextInput
                        placeholder="12345678"
                        style={styles.input}
                        value={accountNumber}
                        onChangeText={(value) => {
                          setAccountNumber(
                            value.replace(
                              /[^0-9]/g,
                              ''
                            )
                          );
                        }}
                        keyboardType="number-pad"
                        inputMode="numeric"
                        returnKeyType="next"
                        editable={!loading}
                        placeholderTextColor="rgba(0,0,0,0.4)"
                      />
                    </View>

                    <View
                      style={styles.inputContainer}
                    >
                      <Text style={styles.label}>
                        PASSWORD
                      </Text>

                      <TextInput
                        placeholder="••••••••••••"
                        style={styles.input}
                        value={password}
                        secureTextEntry
                        onChangeText={setPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="done"
                        editable={!loading}
                        onSubmitEditing={
                          Keyboard.dismiss
                        }
                        placeholderTextColor="rgba(0,0,0,0.4)"
                      />
                    </View>

                    <View style={styles.spacer} />

                    <SwipeButton
                      onSwipeSuccess={handleLogin}
                      loading={loading}
                      colors={THEME_GRADIENT}
                    />

                    <PopButton
                      onPress={() =>
                        navigation.navigate(
                          'Register'
                        )
                      }
                      disabled={loading}
                      style={styles.registerLink}
                    >
                      <Text
                        style={styles.registerText}
                      >
                        New here?{' '}
                        <Text
                          style={
                            styles.registerHighlight
                          }
                        >
                          Create Account
                        </Text>
                      </Text>
                    </PopButton>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </TouchableWithoutFeedback>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  safeArea: {
    flex: 1,
  },

  keyboardAvoidingView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: vs(50),
  },

  topGlow: {
    position: 'absolute',
    top: -height * 0.15,
    left: -width * 0.2,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width,
    opacity: 0.3,
  },

  bottomGlow: {
    position: 'absolute',
    bottom: vs(-150),
    right: s(-75),
    width: s(300),
    height: s(300),
    borderRadius: s(150),
    backgroundColor: '#9000ff',
    opacity: 0.08,
    transform: [{ scale: 1.5 }],
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },

  loadingAnimation: {
    width: s(300),
    height: s(300),
  },

  contentContainer: {
    width: '100%',
    paddingHorizontal: s(24),
  },

  header: {
    marginBottom: vs(40),
  },

  titleOutline: {
    fontSize: ms(42),
    fontWeight: '300',
    color: 'transparent',
    textShadowColor:
      'rgba(255, 0, 170, 0.3)',
    textShadowOffset: {
      width: s(1),
      height: vs(1),
    },
    textShadowRadius: s(1),
    letterSpacing: ms(2),
    marginBottom: vs(-8),
  },

  titleFilled: {
    fontSize: ms(42),
    fontWeight: '900',
    color: '#ff00aa',
    letterSpacing: ms(2),
  },

  subtitle: {
    marginTop: vs(5),
    fontSize: ms(14),
    fontWeight: '400',
    color: 'rgba(0,0,0,0.58)',
  },

  formSection: {
    width: '100%',
  },

  inputContainer: {
    marginBottom: vs(20),
  },

  label: {
    marginBottom: vs(8),
    fontSize: ms(10),
    fontWeight: '800',
    color: '#ff00aa',
    letterSpacing: ms(1),
  },

  input: {
    minHeight: vs(45),
    paddingHorizontal: s(16),
    paddingVertical: vs(13),
   
    borderRadius: ms(22),
    backgroundColor: 'rgba(0,0,0,0.05)',
    color: '#000000',
    fontSize: ms(16),
  },

  spacer: {
    height: vs(10),
  },

  swipeContainer: {
    width: '100%',
    height: SWIPE_HEIGHT,
    borderRadius: SWIPE_CORNER_RADIUS,
    backgroundColor: 'transparent',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
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
    color: '#af00be',
    fontSize: ms(14),
    fontWeight: '900',
    letterSpacing: ms(2),
  },

  swipeExpandingFill: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'flex-end',
    overflow: 'hidden',
    zIndex: 2,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
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

  registerLink: {
    alignSelf: 'center',
    marginTop: vs(20),
    padding: s(10),
  },

  registerText: {
    color: 'rgba(0,0,0,0.5)',
    fontSize: ms(14),
  },

  registerHighlight: {
    color: '#9000ff',
    fontWeight: '700',
  },
});