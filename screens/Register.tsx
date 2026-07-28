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
  StatusBar,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
  PanResponder,
  Easing,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';

import {
  scale as s,
  verticalScale as vs,
  moderateScale as ms,
} from 'react-native-size-matters';

import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';

// Utils
import { supabase } from '../utils/supabaseClient';
import { useUser } from '../utils/UserContext';
import ScreenWrapper from '../utils/ScreenWrapper';

const { width, height } = Dimensions.get('window');

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

/*
 * REGISTER SWIPE BUTTON GEOMETRY
 *
 * These values preserve the registration button's existing
 * compact dimensions and rounded styling.
 *
 * Change SWIPE_CORNER_RADIUS only when you want to adjust
 * the button's overall corner radius.
 */
const SWIPE_HEIGHT = vs(48);
const SWIPE_BORDER_WIDTH = s(2);
const SWIPE_THUMB_SIZE = vs(38);
const SWIPE_CORNER_RADIUS = ms(22);

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

// --- GENERIC POP BUTTON COMPONENT ---
const PopButton = ({
  onPress,
  children,
  disabled,
  style,
}: {
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  style?: any;
}) => {
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
      tension: 50,
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

const SwipeButton = ({ onSwipeSuccess, loading, colors }: SwipeButtonProps) => {
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
        const registrationSucceeded = await onSwipeSuccessRef.current();

        if (!registrationSucceeded) {
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
            CREATE VAULT
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
              <Text style={styles.swipeThumbArrow}>»</Text>
            </View>
          </AnimatedLinearGradient>
        </View>
      </LinearGradient>
    </View>
  );
};

export default function Register() {
  const navigation = useNavigation<any>();
  const { setUser } = useUser();

  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 🎨 CYAN/MAGENTA THEME COLORS
  const THEME_GRADIENT = ['#ff00aa', '#9000ff'];

  const handleRegister = async (): Promise<boolean> => {
    if (
      !username.trim() ||
      !password.trim() ||
      !mobile.trim()
    ) {
      Alert.alert('Missing Details', 'All fields are required.');
      return false;
    }

    setLoading(true);

    const startTime = Date.now();

    try {
      const { data: insertedUser, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            username: username.trim(),
            password: password.trim(),
            mobile: mobile.trim(),
            balance: 0,
          },
        ])
        .select('*')
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('Mobile number is already registered.');
        }

        throw insertError;
      }

      await enforceMinDuration(startTime);

      setLoading(false);
      setUser(insertedUser);
      navigation.replace('Main');

      return true;
    } catch (error: any) {
      await enforceMinDuration(startTime);

      setLoading(false);

      setTimeout(() => Alert.alert('Registration Failed', error.message), 100);

      return false;
    }
  };

  const enforceMinDuration = async (startTime: number) => {
    const elapsed = Date.now() - startTime;

    const remaining = Math.max(0, 3000 - elapsed);

    if (remaining > 0) {
      await new Promise(resolve => setTimeout(resolve, remaining));
    }
  };

  return (
    <ScreenWrapper>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.mainContainer}>
          {/* 🎨 Ambient Cyan/Magenta Background Glows */}
          <LinearGradient
            colors={['rgba(255, 0, 170, 0.3)', 'transparent']}
            style={styles.topGlow}
          />

          <View style={styles.bottomGlow} />

          {loading && (
            <View style={styles.loadingOverlay}>
              <LottieView
                source={require('./LoginMedia/loadinglatest.json')}
                autoPlay
                loop
                style={styles.loadingAnimation}
              />
            </View>
          )}

          <SafeAreaView style={{ flex: 1 }}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.header}>
                  <Text style={styles.titleOutline}>Start</Text>

                  <Text style={styles.titleFilled}>Liquidity</Text>

                  <Text style={styles.subtitle}>
                    Initialize your Daily Profits.
                  </Text>
                </View>

                <View style={styles.formSection}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>USERNAME</Text>

                    <TextInput
                      placeholder="Type Name Here"
                      style={styles.input}
                      value={username}
                      onChangeText={setUsername}
                      placeholderTextColor="rgba(0,0,0,0.4)"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>MOBILE</Text>

                    <TextInput
                      placeholder="1234567890"
                      style={styles.input}
                      value={mobile}
                      onChangeText={setMobile}
                      placeholderTextColor="rgba(0,0,0,0.4)"
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>PASSWORD</Text>

                    <TextInput
                      placeholder="••••••••••••"
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      placeholderTextColor="rgba(0,0,0,0.4)"
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.spacer} />

                  <SwipeButton
                    onSwipeSuccess={handleRegister}
                    loading={loading}
                    colors={THEME_GRADIENT}
                  />

                  <PopButton
                    onPress={() => navigation.goBack()}
                    style={styles.loginLink}
                  >
                    <Text style={styles.loginText}>
                      Already registered?{' '}
                      <Text style={styles.loginHighlight}>Sign In</Text>
                    </Text>
                  </PopButton>
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
    backgroundColor: '#fff',
  },

  topGlow: {
    position: 'absolute',
    top: vs(-height * 0.15),
    left: s(-width * 0.2),
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
    backgroundColor: 'rgba(255, 255, 255, 1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },

  loadingAnimation: {
    width: s(300),
    height: s(300),
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: s(24),
    justifyContent: 'center',
    paddingBottom: vs(20),
  },

  header: {
    marginBottom: vs(15),
    marginTop: vs(10),
  },

  titleOutline: {
    fontSize: ms(32),
    fontWeight: '300',
    color: 'transparent',
    textShadowColor: 'rgba(255, 0, 170, 0.3)',
    textShadowOffset: {
      width: s(1),
      height: vs(1),
    },
    textShadowRadius: s(1),
    letterSpacing: ms(2),
    marginBottom: vs(-8),
  },

  titleFilled: {
    fontSize: ms(32),
    fontWeight: '900',
    color: '#ff00aa',
    letterSpacing: ms(2),
  },

  subtitle: {
    fontSize: ms(13),
    color: 'rgba(0, 0, 0, 0.58)',
    marginTop: vs(2),
    fontWeight: '400',
  },

  formSection: {
    width: '100%',
  },

  inputContainer: {
    marginBottom: vs(10),
  },

  label: {
    fontSize: ms(10),
    fontWeight: '800',
    color: '#ff00aa',
    marginBottom: vs(4),
    letterSpacing: ms(1),
    textTransform: 'uppercase',
  },

  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: ms(18),
    paddingHorizontal: s(16),
    paddingVertical: vs(12),
    color: '#000',
    fontSize: ms(16),
   
  },

  spacer: {
    height: vs(10),
  },

  /*
   * Original button spacing, radius and shadow
   * are preserved here.
   */
  swipeContainer: {
    width: '100%',
    height: SWIPE_HEIGHT,
    marginTop: vs(5),
    borderRadius: SWIPE_CORNER_RADIUS,
    backgroundColor: 'transparent',
    shadowColor: '#ff00aa',
    shadowOffset: {
      width: 0,
      height: vs(4),
    },
    shadowOpacity: 0.2,
    shadowRadius: ms(10),
    elevation: 8,
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
    letterSpacing: ms(2),
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

  /*
   * Retained unchanged from the original screen.
   */
  gradientButton: {
    paddingVertical: vs(14),
    borderRadius: ms(22),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff00aa',
    shadowOffset: {
      width: 0,
      height: vs(4),
    },
    shadowOpacity: 0.2,
    shadowRadius: ms(10),
    elevation: 8,
    marginTop: vs(5),
  },

  btnText: {
    color: '#fff',
    fontSize: ms(14),
    fontWeight: '900',
    letterSpacing: ms(2),
  },

  loginLink: {
    marginTop: vs(15),
    alignSelf: 'center',
    padding: s(8),
  },

  loginText: {
    color: 'rgba(0, 0, 0, 0.4)',
    fontSize: ms(14),
  },

  loginHighlight: {
    color: '#9000ff',
    fontWeight: '700',
  },
});