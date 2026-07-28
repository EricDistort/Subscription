import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
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

/* -------------------------------------------------------------------------- */
/*                                   THEME                                    */
/* -------------------------------------------------------------------------- */

const NEON_CYAN = '#ff00aa';
const MAGENTA = '#9000ff';

const BACKGROUND = '#f7f6f9';
const TEXT_PRIMARY = '#19151c';
const TEXT_SECONDARY = 'rgba(25, 21, 28, 0.62)';
const INACTIVE = '#e2dde4';

/* -------------------------------------------------------------------------- */
/*                                  CONTENT                                   */
/* -------------------------------------------------------------------------- */

type GrowthStep = {
  id: string;
  title: string;
  subtitle: string;
  action: string;
  outcome: string;
  recognition: string;
  image: ImageSourcePropType;
};

const steps: GrowthStep[] = [
  {
    id: '1',
    title: 'Explorer',
    subtitle: 'Begin Your Journey',
    action:
      'Register separately on BitAI with a minimum participation amount of 50 USDT. Activate your Teknoleed Growth Membership for 10 USDT per month, attend orientation, and understand the basic community guidelines.',
    outcome:
      'Gain BitAI platform access, Teknoleed learning access, basic training, business orientation, and official Explorer recognition.',
    recognition: 'Explorer',

    // Replace with the required local image.
    image: require('../LoginMedia/One.jpeg'),
  },
  {
    id: '2',
    title: 'Builder',
    subtitle: 'Learn the System',
    action:
      'Attend official Zoom training sessions, complete the learning modules, understand the community-building system, and learn how to present the platform professionally.',
    outcome:
      'Develop better platform knowledge, stronger communication confidence, presentation skills, and readiness to begin community building.',
    recognition: 'Builder',

    // Replace with the required local image.
    image: require('../LoginMedia/Two.jpg'),
  },
  {
    id: '3',
    title: 'Core Builder',
    subtitle: 'Build Your Foundation',
    action:
      'Personally introduce, guide, and support your first 20 active members. Help them complete orientation, attend training, understand the system, and participate in community activities.',
    outcome:
      'Create an active team foundation, gain practical experience, receive community recognition, and begin your leadership journey.',
    recognition: 'Core Builder',

    // Replace with the required local image.
    image: require('../LoginMedia/Three.jpg'),
  },
  {
    id: '4',
    title: 'Team Leader',
    subtitle: 'Build an Active Team',
    action:
      'Help your members complete training, remain active, learn the duplication system, conduct presentations, and support newly registered members.',
    outcome:
      'Build a stronger team culture, improve member retention, increase participation, and create structured community growth.',
    recognition: 'Team Leader',

    // Replace with the required local image.
    image: require('../LoginMedia/Four.jpg'),
  },
  {
    id: '5',
    title: 'Mentor',
    subtitle: 'Create Independent Leaders',
    action:
      'Coach Builders and Team Leaders to conduct presentations, support their teams, organise training sessions, and develop new leaders independently.',
    outcome:
      'Develop independent teams, stronger duplication, capable leaders, and greater long-term community impact.',
    recognition: 'Mentor',

    // Replace with the required local image.
    image: require('../LoginMedia/Five.jpeg'),
  },
  {
    id: '6',
    title: 'Community Leader',
    subtitle: 'Build Multiple Communities',
    action:
      'Expand your organisation across multiple teams, groups, cities, or communities while maintaining consistent education, training, and support standards.',
    outcome:
      'Create community expansion, a stronger leadership network, improved organisation, and wider community impact.',
    recognition: 'Community Leader',

    // Replace with the required local image.
    image: require('../LoginMedia/Six.jpeg'),
  },
  {
    id: '7',
    title: 'Regional Leader',
    subtitle: 'Lead a Region',
    action:
      'Develop multiple successful Community Leaders within a defined region. Maintain regular training, coordination, ethical practices, support, and performance tracking.',
    outcome:
      'Gain regional recognition, greater leadership influence, structured expansion, and stronger coordination between teams.',
    recognition: 'Regional Leader',

    // Replace with the required local image.
    image: require('../LoginMedia/Seven.jpg'),
  },
  {
    id: '8',
    title: 'National Leader',
    subtitle: 'Build National Growth',
    action:
      'Develop Regional Leaders and implement the same education, leadership, support, and duplication system across the country.',
    outcome:
      'Build a national organisation with strong leadership, consistent training standards, and sustainable expansion.',
    recognition: 'National Leader',

    // Replace with the required local image.
    image: require('../LoginMedia/Eight.jpg'),
  },
  {
    id: '9',
    title: 'Global Leader',
    subtitle: 'Expand Internationally',
    action:
      'Develop leaders and communities across different countries while respecting local laws, cultures, policies, and market requirements.',
    outcome:
      'Create an international network, cross-border leadership, worldwide collaboration, and global community recognition.',
    recognition: 'Global Leader',

    // Replace with the required local image.
    image: require('../LoginMedia/Nine.jpeg'),
  },
  {
    id: '10',
    title: 'Legacy Leader',
    subtitle: 'Create Long-Term Impact',
    action:
      'Continue mentoring leaders, strengthening communities, developing education systems, and supporting responsible long-term ecosystem growth.',
    outcome:
      'Create a lasting contribution, leadership legacy, sustainable organisation, and long-term community recognition.',
    recognition: 'Legacy Leader',

    // Replace with the required local image.
    image: require('../LoginMedia/Ten.jpg'),
  },
];

/* -------------------------------------------------------------------------- */
/*                                POP BUTTON                                  */
/* -------------------------------------------------------------------------- */

type PopButtonProps = {
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const PopButton = ({
  onPress,
  children,
  disabled = false,
  style,
}: PopButtonProps) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) {
      return;
    }

    Animated.spring(scaleValue, {
      toValue: 0.95,
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
          styles.animatedButton,
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
/*                          VERTICAL PROGRESS BAR                             */
/* -------------------------------------------------------------------------- */

type ProgressIndicatorProps = {
  currentIndex: number;
  onStepPress: (index: number) => void;
};

const ProgressIndicator = ({
  currentIndex,
  onStepPress,
}: ProgressIndicatorProps) => {
  const progressAnimation = useRef(
    new Animated.Value((currentIndex + 1) / steps.length),
  ).current;

  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: (currentIndex + 1) / steps.length,
      duration: 320,
      useNativeDriver: false,
    }).start();
  }, [currentIndex, progressAnimation]);

  const animatedHeight = progressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.progressColumn}>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFillContainer,
            {
              height: animatedHeight,
            },
          ]}
        >
          <LinearGradient
            colors={[NEON_CYAN, MAGENTA]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.progressGradient}
          />
        </Animated.View>

        <View style={styles.progressTouchLayer}>
          {steps.map((step, index) => (
            <Pressable
              key={step.id}
              hitSlop={{
                left: 12,
                right: 12,
              }}
              onPress={() => onStepPress(index)}
              style={styles.progressTouchZone}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/*                            ONBOARDING SCREEN                               */
/* -------------------------------------------------------------------------- */

export default function OnboardingScreen({ navigation }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslate = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const currentStep = steps[currentIndex];
  const isLastStep = currentIndex === steps.length - 1;

  const changeStep = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= steps.length || newIndex === currentIndex) {
      return;
    }

    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslate, {
        toValue: 10,
        duration: 110,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentIndex(newIndex);

      scrollRef.current?.scrollTo({
        y: 0,
        animated: false,
      });

      contentTranslate.setValue(-10);

      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(contentTranslate, {
          toValue: 0,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (!isLastStep) {
      changeStep(currentIndex + 1);
    }
  };

  const handleStartJourney = () => {
    navigation.replace('Login');
  };

  return (
    <ScreenWrapper>
      <LinearGradient
        colors={['#ffffff', '#ffffff', '#ffffff']}
        locations={[0, 0.45, 1]}
        style={styles.screen}
      >
        <View style={styles.mainContainer}>
          <ProgressIndicator
            currentIndex={currentIndex}
            onStepPress={changeStep}
          />

          <Animated.View
            style={[
              styles.contentContainer,
              {
                opacity: contentOpacity,
                transform: [
                  {
                    translateY: contentTranslate,
                  },
                ],
              },
            ]}
          >
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <Text style={styles.stepText}></Text>

              <Text style={styles.title}>{currentStep.title}</Text>

              <Text style={styles.subtitle}>{currentStep.subtitle}</Text>

              <View style={styles.titleLine} />

              <Text style={styles.sectionLabel}>ACTION</Text>

              <Text style={styles.bodyText}>{currentStep.action}</Text>

              <View style={styles.sectionDivider} />

              <Text style={styles.sectionLabel}>OUTCOME</Text>

              <Text style={styles.bodyText}>{currentStep.outcome}</Text>

              <View style={styles.recognitionContainer}>
                <Text style={styles.recognitionTitle}>
                  {currentStep.recognition}
                </Text>
              </View>

              {/* 16:9 step image */}
              <View style={styles.stepImageContainer}>
                <Image
                  source={currentStep.image}
                  style={styles.stepImage}
                  resizeMode="cover"
                />
              </View>
            </ScrollView>
          </Animated.View>
        </View>
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

  mainContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: vs(55),
    paddingHorizontal: s(20),
  },

  /* Vertical progress bar */

  progressColumn: {
    width: s(30),
    alignItems: 'center',
    alignSelf: 'stretch',
    marginRight: s(17),
    paddingTop: vs(3),
    paddingBottom: vs(18),
  },

  progressTrack: {
    flex: 1,
    width: ms(8),
    minHeight: vs(320),
    maxHeight: vs(450),
    borderRadius: ms(8),
    backgroundColor: INACTIVE,
    overflow: 'visible',
  },

  progressFillContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    borderRadius: ms(8),
    overflow: 'hidden',
  },

  progressGradient: {
    flex: 1,
    width: '100%',
    borderRadius: ms(8),
  },

  progressTouchLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: ms(-14),
    right: ms(-14),
  },

  progressTouchZone: {
    flex: 1,
    width: '100%',
  },

  /* Step content */

  contentContainer: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingRight: s(5),
    paddingBottom: vs(18),
  },

  stepText: {
    color: NEON_CYAN,
    fontSize: ms(10),
    fontWeight: '800',
    letterSpacing: ms(1.8),
    marginBottom: vs(4),
  },

  title: {
    color: TEXT_PRIMARY,
    fontSize: ms(31),
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: ms(36),
  },

  subtitle: {
    color: MAGENTA,
    fontSize: ms(15),
    fontWeight: '600',
    marginTop: vs(2),
    lineHeight: ms(20),
  },

  titleLine: {
    width: s(40),
    height: vs(3),
    borderRadius: ms(3),
    backgroundColor: NEON_CYAN,
    marginTop: vs(11),
    marginBottom: vs(18),
  },

  sectionLabel: {
    color: NEON_CYAN,
    fontSize: ms(10),
    fontWeight: '800',
    letterSpacing: ms(1.5),
    marginBottom: vs(6),
  },

  bodyText: {
    color: TEXT_SECONDARY,
    fontSize: ms(14),
    lineHeight: ms(21),
    fontWeight: '500',
  },

  sectionDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(144, 0, 255, 0.10)',
    marginVertical: vs(16),
  },

  recognitionContainer: {
    marginTop: vs(18),
    paddingTop: vs(12),
    borderTopWidth: 1,
    borderTopColor: 'rgba(144, 0, 255, 0.10)',
  },

  recognitionLabel: {
    color: TEXT_SECONDARY,
    fontSize: ms(9),
    fontWeight: '700',
    letterSpacing: ms(1.3),
    marginBottom: vs(2),
  },

  recognitionTitle: {
    color: TEXT_PRIMARY,
    fontSize: ms(16),
    fontWeight: '800',
    lineHeight: ms(20),
  },

  /* 16:9 step image */

  stepImageContainer: {
    width: '100%',
    aspectRatio: 16 / 5,
    marginTop: vs(14),
    borderRadius: ms(25),
    overflow: 'hidden',
    backgroundColor: '#ece8ee',
  },

  stepImage: {
    width: '100%',
    height: '100%',
  },

  /* Bottom buttons */

  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(50),
    paddingTop: vs(12),
    paddingBottom: vs(40),
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
  },

  startButtonWrapper: {
    flex: 1,
  },

  nextButtonWrapper: {
    width: s(60),
    marginLeft: s(10),
  },

  animatedButton: {
    width: '100%',
  },

  startButton: {
    width: '100%',
    height: vs(45),
    borderRadius: ms(25),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: vs(4) },
    shadowOpacity: 0.2,
    shadowRadius: ms(10),
    elevation: 10,
  },

  nextButton: {
    width: '100%',
    height: vs(45),
    borderRadius: ms(25),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: vs(4) },
    shadowOpacity: 0.2,
    shadowRadius: ms(10),
    elevation: 10,
  },

  startButtonText: {
    color: '#ffffff',
    fontSize: ms(17),
    fontWeight: '800',
  },

  nextButtonText: {
    color: '#ffffff',
    fontSize: ms(30),
    fontWeight: '500',
    lineHeight: ms(30),
    marginTop: vs(-4),
  },

  disabledButton: {
    opacity: 0.55,
  },
});
