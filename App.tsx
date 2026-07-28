import React, { useState, useEffect, useRef } from 'react';
import {
  NavigationContainer,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  StatusBar,
  Image,
  View,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import {
  scale as s,
  verticalScale as vs,
  moderateScale as ms,
} from 'react-native-size-matters';
import { UserProvider } from './utils/UserContext';
import LinearGradient from 'react-native-linear-gradient';

// Import Screens
import SplashScreen from './SplashScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/home/HomeScreen';
import TransactionListScreen from './screens/home/TransactionListScreen';
import Help from './screens/home/Help';
import DepositScreen from './screens/home/DepositScreen';
import WithdrawalScreen from './screens/home/WithdrawalScreen';
import FeedScreen from './screens/Feed/FeedScreen';
import StoreScreen from './screens/Store/StoreScreen';
import RecieveMoneyScreen from './screens/home/RecieveMoneyScreen';
import SendMoneyScreen from './screens/home/SendMoneyScreen';
import OrderListScreen from './screens/Store/OrderListScreen';
import OnboardingScreen from './screens/Onboarding';
import Register from './screens/Register';
import ProfileScreen from './screens/home/ProfileScreen';
import BrowserScreen from './screens/home/BrowserScreen';
import TransactionDetailsScreen from './screens/home/TransactionDetailsScreen';
import IndirectReferralsScreen from './screens/home/IndirectReferralsScreen';
import WebinarScreen from './screens/Feed/WebinarScreen';
import Love from './screens/love';
import Plan from './screens/home/Plan';
import FeedDetailScreen from './screens/Feed/FeedDetailScreen';
import SubscriptionScreen from './screens/home/SubscriptionScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLLAPSED_SIZE = vs(65);
const EXPANDED_HEIGHT = COLLAPSED_SIZE * 3;

const RootStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const StoreStack = createNativeStackNavigator();
const FeedStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 🎨 Cyan/Magenta Theme Gradient
const THEME_GRADIENT = ['#ff00aa', '#9000ff'];

// 1️⃣ UPDATED THEME FOR CYAN ACCENTS
const MyDarkTheme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    background: '#000000',
    card: '#000000',
    text: '#ffffff',
    border: '#1a0011',
    notification: '#ff00aa',
  },
};

const globalScreenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: '#000000' },
  animation: 'slide_from_right' as const,
};

// --- CUSTOM POP TAB BUTTON ---
const PopTabButton = (props: any) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      {...props}
      onPressIn={e => {
        handlePressIn();
        props.onPressIn && props.onPressIn(e);
      }}
      onPressOut={e => {
        handlePressOut();
        props.onPressOut && props.onPressOut(e);
      }}
      style={[props.style, styles.tabBtnContainer]}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleValue }],
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {props.children}
      </Animated.View>
    </Pressable>
  );
};

// --- EXPANDABLE CUSTOM TAB BAR ---
function CustomTabBar({ state, descriptors, navigation }: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    Animated.spring(expandAnim, {
      toValue: nextState ? 1 : 0,
      friction: 7,
      tension: 50,
      useNativeDriver: false,
    }).start();
  };

  const handlePress = (route: any, index: number, isFocused: boolean) => {
    if (!isExpanded) {
      toggleMenu();
      return;
    }

    if (isFocused) {
      toggleMenu();
      return;
    }

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate({ name: route.name, merge: true });
    }
    toggleMenu();
  };

  const animatedHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLLAPSED_SIZE, EXPANDED_HEIGHT],
  });

  const rowOpacity = expandAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const collapsedOpacity = expandAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

  const activeRoute = state.routes[state.index];
  const activeDescriptor = descriptors[activeRoute.key];
  const ActiveIcon = activeDescriptor.options.tabBarIcon;

  return (
    <Animated.View
      style={[styles.tabBar, { height: animatedHeight, width: COLLAPSED_SIZE }]}
    >
      <LinearGradient
        colors={THEME_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientBackground}
      />

      {/* Expanded Column (All Tabs) */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            flexDirection: 'column',
            height: EXPANDED_HEIGHT,
            width: COLLAPSED_SIZE,
            opacity: rowOpacity,
          },
        ]}
        pointerEvents={isExpanded ? 'auto' : 'none'}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          return (
            <PopTabButton
              key={route.key}
              onPress={() => handlePress(route, index, isFocused)}
              style={styles.tabBtnContainer}
            >
              {options.tabBarIcon
                ? options.tabBarIcon({ focused: isFocused })
                : null}
            </PopTabButton>
          );
        })}
      </Animated.View>

      {/* Collapsed View (Only Active Tab) */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: COLLAPSED_SIZE,
            width: COLLAPSED_SIZE,
            opacity: collapsedOpacity,
          },
        ]}
        pointerEvents={isExpanded ? 'none' : 'auto'}
      >
        <PopTabButton onPress={toggleMenu} style={styles.tabBtnContainer}>
          {ActiveIcon ? ActiveIcon({ focused: true }) : null}
        </PopTabButton>
      </Animated.View>
    </Animated.View>
  );
}

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={globalScreenOptions}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="SendMoney" component={SendMoneyScreen} />
      <HomeStack.Screen name="RecieveMoney" component={FeedScreen} />
      <HomeStack.Screen name="FeedDetailScreen" component={FeedDetailScreen} />
      <HomeStack.Screen name="WebinarScreen" component={WebinarScreen} />
      <HomeStack.Screen name="OrderList" component={OrderListScreen} />
      <HomeStack.Screen
        name="SubscriptionScreen"
        component={SubscriptionScreen}
      />
      <HomeStack.Screen
        name="RecieveMoneyScreen"
        component={RecieveMoneyScreen}
      />
      <HomeStack.Screen
        name="IndirectReferralsScreen"
        component={IndirectReferralsScreen}
      />
      <HomeStack.Screen name="BrowserScreen" component={BrowserScreen} />
      <HomeStack.Screen name="DepositMoney" component={DepositScreen} />
      <HomeStack.Screen name="WithdrawalMoney" component={WithdrawalScreen} />
      <HomeStack.Screen
        name="TransactionDetailsScreen"
        component={TransactionDetailsScreen}
      />
      <HomeStack.Screen
        name="TransactionListScreen"
        component={TransactionListScreen}
      />
      <HomeStack.Screen name="StoreMain" component={StoreScreen} />
      <HomeStack.Screen name="ProfileScreen" component={ProfileScreen} />
    </HomeStack.Navigator>
  );
}

function FeedStackScreen() {
  return (
    <FeedStack.Navigator screenOptions={globalScreenOptions}>
      <FeedStack.Screen name="FeedMain" component={BrowserScreen} />
    </FeedStack.Navigator>
  );
}

function StoreStackScreen() {
  return (
    <StoreStack.Navigator screenOptions={globalScreenOptions}>
      <StoreStack.Screen name="SendMoney" component={SendMoneyScreen} />
      <StoreStack.Screen
        name="TransactionListScreen"
        component={TransactionListScreen}
      />
      <StoreStack.Screen
        name="TransactionDetailsScreen"
        component={TransactionDetailsScreen}
      />
    </StoreStack.Navigator>
  );
}

function MainTabs() {
  return (
    <View style={styles.tabContainer}>
      <Tab.Navigator
        initialRouteName="Home"
        sceneContainerStyle={{ backgroundColor: '#000000' }}
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen
          name="Trades"
          component={StoreStackScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={styles.iconContainer}>
                <Image
                  source={require('./screens/tabMedia/store.webp')}
                  style={[
                    styles.icon,
                    focused ? styles.activeIcon : styles.inactiveIcon,
                  ]}
                  resizeMode="contain"
                />
                {focused && <View style={styles.activeDot} />}
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Home"
          component={HomeStackScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={styles.iconContainer}>
                <Image
                  source={require('./screens/tabMedia/home.webp')}
                  style={[
                    styles.icon,
                    focused ? styles.activeIcon : styles.inactiveIcon,
                  ]}
                  resizeMode="contain"
                />
                {focused && <View style={styles.activeDot} />}
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Receipt"
          component={FeedStackScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={styles.iconContainer}>
                <Image
                  source={require('./screens/tabMedia/feed.webp')}
                  style={[
                    styles.icon,
                    focused ? styles.activeIcon : styles.inactiveIcon,
                  ]}
                  resizeMode="contain"
                />
                {focused && <View style={styles.activeDot} />}
              </View>
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

export default function App() {
  const [isShowSplash, setIsShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (isShowSplash) {
    return <SplashScreen />;
  }

  return (
    <UserProvider>
      <StatusBar backgroundColor="#000000" barStyle="light-content" />
      <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <NavigationContainer theme={MyDarkTheme}>
          <RootStack.Navigator
            initialRouteName="Onboarding"
            screenOptions={globalScreenOptions}
          >
            <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="Register" component={Register} />
            <RootStack.Screen name="Main" component={MainTabs} />
            <RootStack.Screen name="Plan" component={Plan} />
            <RootStack.Screen name="Help" component={Help} />
            <RootStack.Screen name="Love" component={Love} />
          </RootStack.Navigator>
        </NavigationContainer>
      </View>
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  tabBar: {
    position: 'absolute',
    bottom: vs(30),
    left: s(30),
    height: vs(65),
    borderRadius: ms(100),
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.9,
    shadowRadius: ms(10),
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBtnContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    gap: vs(4),
  },
  icon: {
    width: s(27),
    height: s(27),
  },
  activeIcon: {
    width: s(32),
    height: s(32),
    tintColor: '#ffffff',
  },
  inactiveIcon: {
    tintColor: 'rgba(255, 255, 255, 0.4)',
  },
  activeDot: {
    width: s(15),
    height: s(4),
    borderRadius: s(2.5),
    backgroundColor: '#ffffff',
  },
});
