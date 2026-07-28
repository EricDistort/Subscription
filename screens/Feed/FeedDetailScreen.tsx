// --- FeedDetailScreen.tsx ---
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Animated,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenWrapper from '../../utils/ScreenWrapper';
import {
  scale as s,
  verticalScale as vs,
  moderateScale as ms,
} from 'react-native-size-matters';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

const PopButton = ({ onPress, children, style }: any) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.90,
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
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function FeedDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { feed } = route.params;

  const isVideo =
    feed.banner_url &&
    (feed.banner_url.endsWith('.mp4') || feed.banner_url.includes('video'));
    
  const isCanva = 
    feed.banner_url && 
    (feed.banner_url.includes('canva.com') || feed.banner_url.includes('canva.link'));

  const formattedDate = new Date(feed.created_at).toLocaleDateString(
    undefined,
    {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    },
  );

  return (
    <ScreenWrapper>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.container}>
        {/* Fixed Media Section */}
        <View style={styles.mediaContainer}>
          {isCanva ? (
            <WebView
              source={{ uri: feed.banner_url }}
              style={styles.media}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            />
          ) : isVideo ? (
            <Video
              source={{ uri: feed.banner_url }}
              style={styles.media}
              resizeMode="cover"
              controls
              repeat
              paused={false}
            />
          ) : (
            <Image
              source={{ uri: feed.banner_url }}
              style={styles.media}
              resizeMode="cover"
            />
          )}
          
          {(!isVideo && !isCanva) && (
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.9)', '#ffffff']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 0, y: 1 }}
              style={styles.gradientOverlay}
            />
          )}
        </View>

        {/* Fixed Header & Scrollable Body Section */}
        <View style={[styles.contentContainer, isVideo && { marginTop: vs(15) }]}>
          {/* Fixed Header Info */}
          <View style={styles.headerInfo}>
            <View style={styles.dateContainer}>
              <LinearGradient
                colors={['#ff00aa', '#9000ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.accentLine}
              />
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>

            <Text style={styles.title}>{feed.title}</Text>
          </View>

          {/* Scrollable Description */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={true}
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.body}>{feed.body}</Text>
          </ScrollView>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mediaContainer: {
    width: width,
    height: height * 0.45,
    position: 'relative',
    backgroundColor: '#000',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: s(20),
    paddingTop: vs(5),
    backgroundColor: '#ffffff',
  },
  headerInfo: {
    marginBottom: vs(10),
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(12),
  },
  accentLine: {
    width: s(30),
    height: vs(3),
    borderRadius: ms(2),
    marginRight: s(10),
  },
  dateText: {
    color: '#ff00aa',
    fontSize: ms(13),
    fontWeight: '700',
    letterSpacing: ms(0.5),
  },
  title: {
    fontSize: ms(26),
    fontWeight: '900',
    color: '#000000',
    lineHeight: ms(32),
    marginBottom: vs(10),
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: vs(50),
  },
  body: {
    fontSize: ms(15),
    color: 'rgba(0, 0, 0, 0.7)',
    lineHeight: ms(24),
    fontWeight: '400',
  },
});