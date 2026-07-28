import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  scale as s,
  verticalScale as vs,
  moderateScale as ms,
} from 'react-native-size-matters';

import ScreenWrapper from '../../utils/ScreenWrapper';

const { width } = Dimensions.get('window');

/* -------------------------------------------------------------------------- */
/*                                   THEME                                    */
/* -------------------------------------------------------------------------- */

const PRIMARY = '#ff00aa';
const SECONDARY = '#9000ff';

const CARD_WIDTH = Math.min(width * 0.72, s(330));
const CARD_HEIGHT = vs(430);

const SIDE_CARD_SCALE = 0.86;
const SIDE_EDGE_GAP = s(8);

/*
 * The calculation uses the scaled width of the rear cards.
 * This keeps them visible while preserving a small screen-edge gap.
 */
const SIDE_TRANSLATE_X = Math.max(
  s(42),
  width / 2 -
    (CARD_WIDTH * SIDE_CARD_SCALE) / 2 -
    SIDE_EDGE_GAP,
);

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type CardPosition = -1 | 0 | 1;
type RotationDirection = 'left' | 'right';

type SubscriptionPlan = {
  id: string;
  title: string;
  price: string;
  duration: string;
};

type CardAnimationValues = {
  translateX: Animated.Value;
  translateY: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  rotation: Animated.Value;
};

/* -------------------------------------------------------------------------- */
/*                                    DATA                                    */
/* -------------------------------------------------------------------------- */

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly',
    title: 'Monthly Plan',
    price: '10',
    duration: '/month',
  },
  {
    id: 'yearly',
    title: 'Yearly Plan',
    price: '110',
    duration: '/year',
  },
  {
    id: 'lifetime',
    title: 'Lifetime Plan',
    price: '899',
    duration: ' once',
  },
];

const SUBSCRIPTION_FEATURES = [
  'Access to all Premium Mining Nodes',
  'Real-time Advanced Analytics Dashboard',
  '24/7 Priority Customer Support',
];

/* -------------------------------------------------------------------------- */
/*                          CAROUSEL POSITION HELPERS                         */
/* -------------------------------------------------------------------------- */

const LEFT_POSITION: CardPosition = -1;
const FRONT_POSITION: CardPosition = 0;
const RIGHT_POSITION: CardPosition = 1;

const getCardPosition = (
  cardIndex: number,
  activeIndex: number,
): CardPosition => {
  const totalCards = SUBSCRIPTION_PLANS.length;

  if (cardIndex === activeIndex) {
    return FRONT_POSITION;
  }

  const leftCardIndex =
    (activeIndex - 1 + totalCards) % totalCards;

  if (cardIndex === leftCardIndex) {
    return LEFT_POSITION;
  }

  return RIGHT_POSITION;
};

const getPositionValues = (position: CardPosition) => {
  if (position === LEFT_POSITION) {
    return {
      translateX: -SIDE_TRANSLATE_X,
      translateY: vs(18),
      scale: SIDE_CARD_SCALE,
      opacity: 0.92,
      rotation: -1,
    };
  }

  if (position === RIGHT_POSITION) {
    return {
      translateX: SIDE_TRANSLATE_X,
      translateY: vs(18),
      scale: SIDE_CARD_SCALE,
      opacity: 0.92,
      rotation: 1,
    };
  }

  return {
    translateX: 0,
    translateY: 0,
    scale: 1,
    opacity: 1,
    rotation: 0,
  };
};

/* -------------------------------------------------------------------------- */
/*                               POP BUTTON                                   */
/* -------------------------------------------------------------------------- */

type PopScaleButtonProps = {
  children: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

const PopScaleButton = ({
  children,
  onPress,
  style,
  disabled = false,
}: PopScaleButtonProps) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) {
      return;
    }

    Animated.spring(scaleValue, {
      toValue: 0.95,
      speed: 30,
      bounciness: 2,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) {
      return;
    }

    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, disabled && styles.disabledButton]}
    >
      <Animated.View
        style={[
          styles.popButtonContent,
          {
            transform: [{ scale: scaleValue }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

/* -------------------------------------------------------------------------- */
/*                           SUBSCRIPTION SCREEN                              */
/* -------------------------------------------------------------------------- */

export default function SubscriptionScreen({ navigation }: any) {
  const initialActiveIndex = 1;

  const [activeIndex, setActiveIndex] =
    useState<number>(initialActiveIndex);

  const [cardLayers, setCardLayers] = useState<number[]>(
    SUBSCRIPTION_PLANS.map((_, index) =>
      index === initialActiveIndex ? 4 : 1,
    ),
  );

  /*
   * Refs prevent stale values inside PanResponder,
   * which is created only once.
   */
  const activeIndexRef = useRef(initialActiveIndex);
  const isAnimatingRef = useRef(false);

  /*
   * Swipes made during an animation are stored here.
   * They are executed immediately after the current transition.
   */
  const swipeQueueRef = useRef<RotationDirection[]>([]);

  const requestRotationRef = useRef<
    (direction: RotationDirection) => void
  >(() => {});

  const startRotationRef = useRef<
    (direction: RotationDirection) => void
  >(() => {});

  const cardAnimations =
    useRef<CardAnimationValues[]>(
      SUBSCRIPTION_PLANS.map((_, index) => {
        const initialPosition = getCardPosition(
          index,
          initialActiveIndex,
        );

        const values = getPositionValues(initialPosition);

        return {
          translateX: new Animated.Value(values.translateX),
          translateY: new Animated.Value(values.translateY),
          scale: new Animated.Value(values.scale),
          opacity: new Animated.Value(values.opacity),
          rotation: new Animated.Value(values.rotation),
        };
      }),
    ).current;

  const setExactCardPosition = (
    animation: CardAnimationValues,
    position: CardPosition,
  ) => {
    const values = getPositionValues(position);

    animation.translateX.setValue(values.translateX);
    animation.translateY.setValue(values.translateY);
    animation.scale.setValue(values.scale);
    animation.opacity.setValue(values.opacity);
    animation.rotation.setValue(values.rotation);
  };

  /*
   * Standard transition for:
   * - front card moving to the rear
   * - rear card moving to the front
   */
  const createStandardAnimation = (
    animation: CardAnimationValues,
    destination: CardPosition,
  ) => {
    const target = getPositionValues(destination);

    return Animated.parallel(
      [
        Animated.timing(animation.translateX, {
          toValue: target.translateX,
          duration: 210,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.timing(animation.translateY, {
          toValue: target.translateY,
          duration: 210,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.timing(animation.scale, {
          toValue: target.scale,
          duration: 210,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.timing(animation.opacity, {
          toValue: target.opacity,
          duration: 190,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),

        Animated.timing(animation.rotation, {
          toValue: target.rotation,
          duration: 210,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ],
      {
        stopTogether: false,
      },
    );
  };

  /*
   * The wrapping rear card moves behind the stack:
   *
   * Right rear → centre rear → left rear
   * Left rear → centre rear → right rear
   */
  const createRearWrapAnimation = (
    animation: CardAnimationValues,
    destination: CardPosition,
  ) => {
    const target = getPositionValues(destination);

    return Animated.sequence([
      Animated.parallel(
        [
          Animated.timing(animation.translateX, {
            toValue: 0,
            duration: 80,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),

          Animated.timing(animation.translateY, {
            toValue: vs(31),
            duration: 80,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),

          Animated.timing(animation.scale, {
            toValue: 0.76,
            duration: 80,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),

          Animated.timing(animation.opacity, {
            toValue: 0.42,
            duration: 80,
            useNativeDriver: true,
          }),

          Animated.timing(animation.rotation, {
            toValue: 0,
            duration: 80,
            useNativeDriver: true,
          }),
        ],
        {
          stopTogether: false,
        },
      ),

      Animated.parallel(
        [
          Animated.timing(animation.translateX, {
            toValue: target.translateX,
            duration: 130,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),

          Animated.timing(animation.translateY, {
            toValue: target.translateY,
            duration: 130,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),

          Animated.timing(animation.scale, {
            toValue: target.scale,
            duration: 130,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),

          Animated.timing(animation.opacity, {
            toValue: target.opacity,
            duration: 130,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),

          Animated.timing(animation.rotation, {
            toValue: target.rotation,
            duration: 130,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ],
        {
          stopTogether: false,
        },
      ),
    ]);
  };

  const processNextQueuedSwipe = () => {
    const nextDirection = swipeQueueRef.current.shift();

    if (!nextDirection) {
      return;
    }

    requestAnimationFrame(() => {
      startRotationRef.current(nextDirection);
    });
  };

  const startRotation = (
    direction: RotationDirection,
  ) => {
    if (isAnimatingRef.current) {
      swipeQueueRef.current.push(direction);
      return;
    }

    const currentActiveIndex = activeIndexRef.current;
    const totalCards = SUBSCRIPTION_PLANS.length;

    const nextActiveIndex =
      direction === 'right'
        ? (currentActiveIndex - 1 + totalCards) %
          totalCards
        : (currentActiveIndex + 1) % totalCards;

    isAnimatingRef.current = true;

    /*
     * Incoming front card receives the highest layer.
     * The wrapping card remains behind the other cards.
     */
    const transitionLayers = SUBSCRIPTION_PLANS.map(
      (_, cardIndex) => {
        const oldPosition = getCardPosition(
          cardIndex,
          currentActiveIndex,
        );

        const nextPosition = getCardPosition(
          cardIndex,
          nextActiveIndex,
        );

        const isWrappingCard =
          (direction === 'right' &&
            oldPosition === RIGHT_POSITION &&
            nextPosition === LEFT_POSITION) ||
          (direction === 'left' &&
            oldPosition === LEFT_POSITION &&
            nextPosition === RIGHT_POSITION);

        if (nextPosition === FRONT_POSITION) {
          return 5;
        }

        if (oldPosition === FRONT_POSITION) {
          return 4;
        }

        if (isWrappingCard) {
          return 1;
        }

        return 2;
      },
    );

    setCardLayers(transitionLayers);

    requestAnimationFrame(() => {
      const animations = cardAnimations.map(
        (animation, cardIndex) => {
          const oldPosition = getCardPosition(
            cardIndex,
            currentActiveIndex,
          );

          const nextPosition = getCardPosition(
            cardIndex,
            nextActiveIndex,
          );

          const shouldWrapBehind =
            (direction === 'right' &&
              oldPosition === RIGHT_POSITION &&
              nextPosition === LEFT_POSITION) ||
            (direction === 'left' &&
              oldPosition === LEFT_POSITION &&
              nextPosition === RIGHT_POSITION);

          if (shouldWrapBehind) {
            return createRearWrapAnimation(
              animation,
              nextPosition,
            );
          }

          return createStandardAnimation(
            animation,
            nextPosition,
          );
        },
      );

      Animated.parallel(animations, {
        stopTogether: false,
      }).start(() => {
        /*
         * Normalise all cards into exact slots after each swipe.
         * This prevents accumulated movement drift.
         */
        cardAnimations.forEach(
          (animation, cardIndex) => {
            const finalPosition = getCardPosition(
              cardIndex,
              nextActiveIndex,
            );

            setExactCardPosition(
              animation,
              finalPosition,
            );
          },
        );

        activeIndexRef.current = nextActiveIndex;
        setActiveIndex(nextActiveIndex);

        setCardLayers(
          SUBSCRIPTION_PLANS.map((_, cardIndex) =>
            cardIndex === nextActiveIndex ? 4 : 1,
          ),
        );

        isAnimatingRef.current = false;

        processNextQueuedSwipe();
      });
    });
  };

  startRotationRef.current = startRotation;

  const requestRotation = (
    direction: RotationDirection,
  ) => {
    if (isAnimatingRef.current) {
      swipeQueueRef.current.push(direction);
      return;
    }

    startRotationRef.current(direction);
  };

  requestRotationRef.current = requestRotation;

  const handleCardPress = (cardIndex: number) => {
    if (
      isAnimatingRef.current ||
      cardIndex === activeIndexRef.current
    ) {
      return;
    }

    const position = getCardPosition(
      cardIndex,
      activeIndexRef.current,
    );

    if (position === LEFT_POSITION) {
      requestRotationRef.current('right');
      return;
    }

    requestRotationRef.current('left');
  };

  const handleBuyPress = (
    _plan: SubscriptionPlan,
    cardIndex: number,
  ) => {
    if (isAnimatingRef.current) {
      return;
    }

    if (cardIndex !== activeIndexRef.current) {
      handleCardPress(cardIndex);
      return;
    }

    navigation.navigate('DepositMoney');
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,

      onMoveShouldSetPanResponder: (
        _,
        gestureState,
      ) => {
        const horizontalDistance = Math.abs(
          gestureState.dx,
        );

        const verticalDistance = Math.abs(
          gestureState.dy,
        );

        return (
          horizontalDistance > 8 &&
          horizontalDistance > verticalDistance * 1.15
        );
      },

      onMoveShouldSetPanResponderCapture: (
        _,
        gestureState,
      ) => {
        const horizontalDistance = Math.abs(
          gestureState.dx,
        );

        const verticalDistance = Math.abs(
          gestureState.dy,
        );

        return (
          horizontalDistance > 10 &&
          horizontalDistance > verticalDistance * 1.15
        );
      },

      onPanResponderTerminationRequest: () => false,

      onPanResponderRelease: (_, gestureState) => {
        const horizontalDistance = gestureState.dx;
        const horizontalVelocity = gestureState.vx;

        const swipedRight =
          horizontalDistance > 34 ||
          horizontalVelocity > 0.35;

        const swipedLeft =
          horizontalDistance < -34 ||
          horizontalVelocity < -0.35;

        if (swipedRight) {
          requestRotationRef.current('right');
          return;
        }

        if (swipedLeft) {
          requestRotationRef.current('left');
        }
      },

      onPanResponderTerminate: () => {
        // Cards rotate only after a completed swipe.
      },

      onShouldBlockNativeResponder: () => true,
    }),
  ).current;

  return (
    <ScreenWrapper>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
      />

      <LinearGradient
        colors={['#ffffff', '#f5f5f5', '#ebebeb']}
        style={styles.screen}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}

          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              Choose Your Plan
            </Text>
          </View>

          <Text style={styles.subtitleText}>
            Unlock the full potential of your account by
            subscribing to one of our premium plans.
          </Text>

          {/* Infinite circular carousel */}

          <View
            style={styles.carouselContainer}
            {...panResponder.panHandlers}
          >
            {SUBSCRIPTION_PLANS.map(
              (plan, cardIndex) => {
                const animation =
                  cardAnimations[cardIndex];

                const isActive =
                  activeIndex === cardIndex;

                const rotateZ =
                  animation.rotation.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: [
                      '-2.5deg',
                      '0deg',
                      '2.5deg',
                    ],
                    extrapolate: 'clamp',
                  });

                return (
                  <Animated.View
                    key={plan.id}
                    style={[
                      styles.cardWrapper,
                      {
                        zIndex: cardLayers[cardIndex],
                        elevation:
                          cardLayers[cardIndex],
                        opacity: animation.opacity,
                        transform: [
                          {
                            translateX:
                              animation.translateX,
                          },
                          {
                            translateY:
                              animation.translateY,
                          },
                          {
                            scale: animation.scale,
                          },
                          {
                            rotateZ,
                          },
                        ],
                      },
                    ]}
                  >
                    <Pressable
                      onPress={() =>
                        handleCardPress(cardIndex)
                      }
                      style={styles.cardTouchArea}
                    >
                      {/*
                       * Layer 1: strong gradient border
                       */}
                      <LinearGradient
                        colors={[
                          PRIMARY,
                          SECONDARY,
                          PRIMARY,
                        ]}
                        locations={[0, 0.52, 1]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.strongGradientBorder}
                      >
                        {/*
                         * Layer 2: white outline / visual gap
                         */}
                        <View style={styles.whiteOutline}>
                          {/*
                           * Layer 3: actual gradient card
                           */}
                          <LinearGradient
                            colors={[PRIMARY, SECONDARY]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.cardGradient}
                          >
                            <Text style={styles.planTitle}>
                              {plan.title}
                            </Text>

                            <View style={styles.priceRow}>
                              <Text style={styles.priceText}>
                                ${plan.price}
                              </Text>

                              <Text
                                style={styles.durationText}
                              >
                                {plan.duration}
                              </Text>
                            </View>

                            <View style={styles.divider} />

                            <View
                              style={
                                styles.featuresContainer
                              }
                            >
                              {SUBSCRIPTION_FEATURES.map(
                                (
                                  feature,
                                  featureIndex,
                                ) => (
                                  <View
                                    key={`${plan.id}-${featureIndex}`}
                                    style={
                                      styles.featureRow
                                    }
                                  >
                                    <View
                                      style={
                                        styles.checkCircle
                                      }
                                    >
                                      <Text
                                        style={
                                          styles.checkIcon
                                        }
                                      >
                                        ✓
                                      </Text>
                                    </View>

                                    <Text
                                      style={
                                        styles.featureText
                                      }
                                    >
                                      {feature}
                                    </Text>
                                  </View>
                                ),
                              )}
                            </View>

                            <View
                              style={styles.flexSpacer}
                            />

                            <PopScaleButton
                              onPress={() =>
                                handleBuyPress(
                                  plan,
                                  cardIndex,
                                )
                              }
                              style={styles.buyButton}
                            >
                              <Text
                                style={styles.buyButtonText}
                              >
                                {isActive
                                  ? 'BUY NOW'
                                  : 'BUY NOW'}
                              </Text>
                            </PopScaleButton>
                          </LinearGradient>
                        </View>
                      </LinearGradient>
                    </Pressable>
                  </Animated.View>
                );
              },
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </ScreenWrapper>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(15),
    paddingTop: vs(50),
  },

  headerTitle: {
    color: '#030303b2',
    fontSize: ms(22),
    fontWeight: '800',
  },

  subtitleText: {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: ms(14),
    lineHeight: ms(22),
    textAlign: 'center',
    marginTop: vs(6),
    //marginBottom: vs(10),
    paddingHorizontal: s(30),
  },

  carouselContainer: {
    //flex: 1,
    minHeight: vs(460),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    //backgroundColor: 'black',
  },

  cardWrapper: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },

  cardTouchArea: {
    flex: 1,
  },

  /*
   * Strong outer gradient border
   */
  strongGradientBorder: {
    flex: 1,
    padding: ms(4),
    borderRadius: ms(40),

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: vs(6),
    },
    shadowOpacity: 0.3,
    shadowRadius: ms(11),

    elevation: 8,
  },

  /*
   * White space between outer border and actual card
   */
  whiteOutline: {
    flex: 1,
    padding: ms(4),
    borderRadius: ms(37),
    backgroundColor: '#ffffff',
  },

  /*
   * Same gradient card design for every card
   */
  cardGradient: {
    flex: 1,
    padding: ms(20),
    borderRadius: ms(35),
  },

  planTitle: {
    color: '#ffe6f9',
    fontSize: ms(18),
    fontWeight: '800',
    marginTop: vs(10),
    marginBottom: vs(5),
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  priceText: {
    color: '#ffffff',
    fontSize: ms(38),
    fontWeight: '900',
  },

  durationText: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: ms(14),
    fontWeight: '600',
    marginLeft: s(4),
  },

  divider: {
    width: '100%',
    height: 1,
    marginVertical: vs(15),
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },

  featuresContainer: {
    gap: vs(12),
  },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkCircle: {
    width: s(20),
    height: s(20),
    borderRadius: ms(10),

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: s(10),

    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  checkIcon: {
    color: '#ffffff',
    fontSize: ms(10),
    fontWeight: '900',
  },

  featureText: {
    flex: 1,
    color: '#ffffff',
    fontSize: ms(12),
    lineHeight: ms(18),
    fontWeight: '600',
  },

  flexSpacer: {
    flex: 1,
  },

  buyButton: {
    width: '100%',
    paddingVertical: vs(14),
    borderRadius: ms(20),
    marginTop: vs(10),

    backgroundColor: '#ffffff',

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: vs(4),
    },
    shadowOpacity: 0.12,
    shadowRadius: ms(8),

    elevation: 4,
  },

  buyButtonText: {
    color: '#000000a6',
    fontSize: ms(15),
    fontWeight: '900',
    letterSpacing: ms(1),
  },

  popButtonContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledButton: {
    opacity: 0.55,
  },
});