// --- FeedScreen.tsx ---
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Animated,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../utils/supabaseClient';
import ScreenWrapper from '../../utils/ScreenWrapper';
import {
  scale as s,
  verticalScale as vs,
  moderateScale as ms,
} from 'react-native-size-matters';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');

// --- POP COMPONENT (Reused for consistency) ---
const PopButton = ({ onPress, children, style }: any) => {
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
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const PopCard = ({ children, style, onPress }: any) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.97,
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

export default function FeedScreen() {
  const navigation = useNavigation<any>();
  const [feeds, setFeeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 🎨 CYAN/MAGENTA GRADIENT
  const THEME_GRADIENT = ['#ff00aa', '#9000ff'];

  const fetchFeeds = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('feeds')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setFeeds(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFeeds();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFeeds();
    setRefreshing(false);
  }, []);

  const renderItem = ({ item }: { item: any }) => {
    const isVideo =
      item.banner_url &&
      (item.banner_url.endsWith('.mp4') || item.banner_url.includes('video'));

    const isCanva =
      item.banner_url &&
      (item.banner_url.includes('canva.com') ||
        item.banner_url.includes('canva.link'));

    const formattedDate = new Date(item.created_at).toLocaleDateString(
      undefined,
      {
        month: 'short',
        day: 'numeric',
      },
    );

    return (
      <PopCard
        style={styles.cardContainer}
        onPress={() => navigation.navigate('FeedDetailScreen', { feed: item })}
      >
        <View style={styles.cardShadow} />
        <View style={styles.card}>
          <View style={styles.mediaContainer}>
            {isCanva ? (
              <View pointerEvents="none" style={styles.media}>
                <WebView
                  source={{ uri: item.banner_url }}
                  style={{ width: '100%', height: '100%' }}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                />
              </View>
            ) : isVideo ? (
              <Video
                source={{ uri: item.banner_url }}
                style={styles.media}
                resizeMode="cover"
                repeat
                muted={true}
                paused={false}
              />
            ) : (
              <Image
                source={{ uri: item.banner_url }}
                style={styles.media}
                resizeMode="cover"
              />
            )}

            {!isCanva && (
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.8)', '#ffffff']}
                start={{ x: 0, y: 0.4 }}
                end={{ x: 0, y: 1 }}
                style={styles.gradientOverlay}
              />
            )}

            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
            <View style={styles.titleOverlay}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
          </View>
          <View style={styles.contentContainer}>
            <LinearGradient
              colors={THEME_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentLine}
            />
            <Text style={styles.body} numberOfLines={3}>
              {item.body}
            </Text>
          </View>
        </View>
      </PopCard>
    );
  };

  return (
    <ScreenWrapper>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <LinearGradient
        colors={['#ffffff', '#f5f5f5', '#ebebeb']}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.mainTitle}>Trending News</Text>
            </View>

            {loading && !refreshing ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#ff00aa" />
              </View>
            ) : (
              <FlatList
                data={feeds}
                keyExtractor={item => item.id.toString()}
                renderItem={renderItem}
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
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: s(10),
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginTop: vs(30),
    marginBottom: vs(15),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: ms(28),
    fontWeight: '800',
    color: '#030303b2',
    letterSpacing: ms(-1),
  },
  webinarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(6),
    paddingHorizontal: s(12),
    borderRadius: ms(20),
    shadowColor: '#ff00aa',
    shadowOffset: { width: 0, height: vs(2) },
    shadowOpacity: 0.3,
    shadowRadius: ms(5),
    elevation: 5,
  },
  webinarText: {
    color: '#ff00aa',
    fontWeight: '800',
    fontSize: ms(12),
  },
  listContent: {
    paddingBottom: vs(50),
  },
  cardContainer: {
    marginBottom: vs(30),
    position: 'relative',
  },
  cardShadow: {
    position: 'absolute',
    top: vs(15),
    left: s(15),
    right: s(15),
    bottom: -vs(5),
    backgroundColor: '#ff00aa',
    borderRadius: ms(24),
    opacity: 0.15,
    transform: [{ scale: 0.95 }],
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: ms(24),
    overflow: 'hidden',
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 170, 0.1)',
  },
  mediaContainer: {
    width: '100%',
    height: vs(240),
    position: 'relative',
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
    height: '60%',
  },
  dateBadge: {
    position: 'absolute',
    top: s(15),
    right: s(15),
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingVertical: vs(6),
    paddingHorizontal: s(12),
    borderRadius: ms(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 170, 0.3)',
  },
  dateText: {
    color: '#ff00aa',
    fontSize: ms(12),
    fontWeight: '700',
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: s(20),
    paddingBottom: vs(10),
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  title: {
    fontSize: ms(22),
    fontWeight: '800',
    color: '#000000',
    lineHeight: ms(28),
    textShadowColor: 'rgba(255,255,255,0.75)',
    textShadowOffset: { width: 0, height: vs(2) },
    textShadowRadius: ms(4),
  },
  contentContainer: {
    padding: s(20),
    paddingTop: vs(10),
    backgroundColor: '#ffffff',
  },
  accentLine: {
    width: s(40),
    height: vs(3),
    borderRadius: ms(2),
    marginBottom: vs(12),
  },
  body: {
    fontSize: ms(14),
    color: 'rgba(0, 0, 0, 0.6)',
    lineHeight: ms(22),
    fontWeight: '400',
  },
});
