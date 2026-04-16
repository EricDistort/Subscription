import React, { useState, useRef } from 'react';
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
        style={{ transform: [{ scale: scaleValue }], width: '100%' }}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function Register() {
  const navigation = useNavigation<any>();
  const { setUser } = useUser();

  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [referrerAcc, setReferrerAcc] = useState('');
  const [loading, setLoading] = useState(false);

  // 🎨 CYAN/MAGENTA THEME COLORS
  const THEME_GRADIENT = ['#ff00aa', '#9000ff'];

  const handleRegister = async () => {
    if (
      !username.trim() ||
      !password.trim() ||
      !mobile.trim() ||
      !referrerAcc.trim()
    )
      return Alert.alert('Missing Details', 'All fields are required.');

    setLoading(true);
    const startTime = Date.now();

    try {
      const { data: refUser } = await supabase
        .from('users')
        .select('account_number')
        .eq('account_number', referrerAcc.trim())
        .maybeSingle();

      if (!refUser) {
        await enforceMinDuration(startTime);
        setLoading(false);
        setTimeout(
          () =>
            Alert.alert(
              'Invalid Referrer',
              'The referrer account number does not exist.',
            ),
          100,
        );
        return;
      }

      const { data: insertedUser, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            username: username.trim(),
            password: password.trim(),
            mobile: mobile.trim(),
            balance: 0,
            referrer_account_number: refUser.account_number,
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
    } catch (error: any) {
      await enforceMinDuration(startTime);
      setLoading(false);
      setTimeout(() => Alert.alert('Registration Failed', error.message), 100);
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
      <StatusBar barStyle="light-content" backgroundColor="#000" />
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
                      placeholderTextColor="rgba(255,255,255,0.2)"
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
                      placeholderTextColor="rgba(255,255,255,0.2)"
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
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>REFERRER ACCOUNT</Text>
                    <TextInput
                      placeholder="Referrer's Account Number"
                      style={styles.input}
                      value={referrerAcc}
                      onChangeText={setReferrerAcc}
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.spacer} />

                  <PopButton
                    onPress={handleRegister}
                    disabled={loading}
                    style={{ width: '100%' }}
                  >
                    <LinearGradient
                      colors={THEME_GRADIENT}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.gradientButton}
                    >
                      <Text style={styles.btnText}>CREATE VAULT</Text>
                    </LinearGradient>
                  </PopButton>

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
    backgroundColor: '#000',
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
    backgroundColor: '#9000ff', // Magenta glow
    opacity: 0.08,
    transform: [{ scale: 1.5 }],
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 1)',
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
    textShadowColor: 'rgba(255, 0, 170, 0.3)', // Cyan shadow
    textShadowOffset: { width: s(1), height: vs(1) },
    textShadowRadius: s(1),
    letterSpacing: ms(2),
    marginBottom: vs(-8),
  },
  titleFilled: {
    fontSize: ms(32),
    fontWeight: '900',
    color: '#ff00aa', // Cyan
    letterSpacing: ms(2),
  },
  subtitle: {
    fontSize: ms(13),
    color: 'rgba(255, 255, 255, 0.58)',
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
    color: '#ff00aa', // Cyan
    marginBottom: vs(4),
    letterSpacing: ms(1),
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: ms(18),
    paddingHorizontal: s(16),
    paddingVertical: vs(12),
    color: '#fff',
    fontSize: ms(16),
    //borderWidth: 1,
    borderColor: 'rgba(255, 0, 170, 0.15)', // Cyan tint border
  },

  spacer: {
    height: vs(10),
  },
  gradientButton: {
    paddingVertical: vs(14),
    borderRadius: ms(22),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff00aa', // Cyan
    shadowOffset: { width: 0, height: vs(4) },
    shadowOpacity: 0.2,
    shadowRadius: ms(10),
    elevation: 8,
    marginTop: vs(5),
  },
  btnText: {
    color: '#fff', // White text
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
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: ms(14),
  },
  loginHighlight: {
    color: '#9000ff', // Magenta
    fontWeight: '700',
  },
});
