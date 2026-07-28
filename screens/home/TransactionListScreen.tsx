import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Animated,
  Pressable,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useUser } from '../../utils/UserContext';
import ScreenWrapper from '../../utils/ScreenWrapper';
import { supabase } from '../../utils/supabaseClient';
import {
  scale as s,
  verticalScale as vs,
  moderateScale as ms,
} from 'react-native-size-matters';

// --- POP CARD COMPONENT ---
const PopCard = ({ onPress, children, style }: any) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96,
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

export default function TransactionListScreen() {
  const { user } = useUser();
  const navigation = useNavigation<any>();

  const [mixedData, setMixedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // --- 🎨 FOUNDRY THEME PALETTES (Modified to Cyan/Magenta) ---
  // Cyan for Transactions
  const THEME_GRADIENT = ['#ff00aa', '#9000ff'];
  // Magenta/Dark for Feeds
  const FEED_GRADIENT = ['#9000ff', '#1a001a'];
  // Dark Cyan for Products
  const PRODUCT_GRADIENT = ['#800080', '#ff00aa'];

  const fetchData = async () => {
    if (!user?.account_number) return;
    if (!refreshing) setLoading(true);

    try {
      // 1. Fetch Transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select(
          `
          id, sender_acc, receiver_acc, amount, created_at,
          sender:sender_acc(username),
          receiver:receiver_acc(username)
        `,
        )
        .or(
          `sender_acc.eq.${user.account_number},receiver_acc.eq.${user.account_number}`,
        )
        .order('created_at', { ascending: false });

      // 2. Fetch Feeds
      const { data: feedData, error: feedError } = await supabase
        .from('feeds')
        .select('id, title, banner_url, created_at')
        .order('created_at', { ascending: false });

      // 3. Fetch Products
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('id, name, image_url, price, created_at')
        .order('created_at', { ascending: false });

      if (txError) console.error(txError);
      if (feedError) console.error(feedError);
      if (prodError) console.error(prodError);

      // 4. Normalize & Merge
      const transactions = (txData || []).map((t: any) => ({
        ...t,
        type: 'transaction',
      }));
      const feeds = (feedData || []).map((f: any) => ({ ...f, type: 'feed' }));
      const products = (prodData || []).map((p: any) => ({
        ...p,
        type: 'product',
      }));

      // 5. Combine and Sort by Date (Newest First)
      const combined = [...transactions, ...feeds, ...products].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setMixedData(combined);
    } catch (err) {
      console.log('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.account_number]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [user?.account_number]);

  // --- RENDER ITEM ---
  const renderItem = ({ item }: { item: any }) => {
    // 🅰️ RENDER TRANSACTION
    if (item.type === 'transaction') {
      const isSent = item.sender_acc === user.account_number;
      const otherUser = isSent ? item.receiver : item.sender;

      return (
        <PopCard
          onPress={() =>
            navigation.navigate('TransactionDetailsScreen', {
              transaction: item,
            })
          }
          style={{ marginBottom: vs(12) }}
        >
          {/* Card Container */}
          <View style={styles.cardContainer}>
            <LinearGradient
              colors={['#ffffff', '#f9f9f9']} // Light Theme Gradient
              style={styles.cardGradient}
            >
              <View style={styles.cardContent}>
                {/* Icon Container */}
                <View style={styles.iconBox}>
                  <Text style={styles.iconText}>{isSent ? '↗' : '↙'}</Text>
                </View>

                <View style={styles.textColumn}>
                  <Text style={styles.username} numberOfLines={1}>
                    {otherUser?.username || 'Unknown'}
                  </Text>
                  <Text style={styles.dateText}>
                    {new Date(item.created_at).toLocaleDateString()} • Transfer
                  </Text>
                </View>

                <View style={styles.amountColumn}>
                  <Text
                    style={[
                      styles.amount,
                      // Adjusted for neon cyan/magenta theme
                      { color: isSent ? '#9000ff' : '#ff00aa' },
                    ]}
                  >
                    {isSent ? '-' : '+'}${Math.abs(item.amount)}
                  </Text>
                  <Text style={styles.timeText}>
                    {new Date(item.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </PopCard>
      );
    }

    // 🅱️ RENDER FEED POST
    else if (item.type === 'feed') {
      const isVideo =
        item.banner_url &&
        (item.banner_url.endsWith('.mp4') || item.banner_url.includes('video'));

      return (
        <PopCard
          onPress={() => navigation.navigate('RecieveMoney')}
          style={{ marginBottom: vs(12) }}
        >
          <View style={styles.cardContainer}>
            <LinearGradient
              colors={['#ffffff', '#f9f9f9']} // Light Theme Gradient
              style={styles.cardGradient}
            >
              <View style={styles.cardContent}>
                <View style={styles.feedMediaContainer}>
                  {item.banner_url ? (
                    <Image
                      source={{ uri: item.banner_url }}
                      style={styles.feedImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <LinearGradient
                      colors={FEED_GRADIENT}
                      style={styles.feedIconPlaceholder}
                    >
                      <Text style={styles.feedIconText}>📰</Text>
                    </LinearGradient>
                  )}
                  {isVideo && (
                    <View style={styles.playBadge}>
                      <Text style={{ color: '#fff', fontSize: 8 }}>▶</Text>
                    </View>
                  )}
                </View>

                <View style={styles.textColumn}>
                  <Text style={styles.feedTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.dateText, { color: '#9000ff' }]}>
                    {new Date(item.created_at).toLocaleDateString()} • News
                  </Text>
                </View>

                <View style={styles.amountColumn}>
                  <Text style={[styles.arrowIndicator, { color: '#9000ff' }]}>
                    ›
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </PopCard>
      );
    }

    // 🆕 🅾️ RENDER PRODUCT ITEM
    else if (item.type === 'product') {
      return (
        <PopCard
          onPress={() => navigation.navigate('StoreMain')}
          style={{ marginBottom: vs(12) }}
        >
          <View style={styles.cardContainer}>
            <LinearGradient
              colors={['#ffffff', '#f9f9f9']} // Light Theme Gradient
              style={styles.cardGradient}
            >
              <View style={styles.cardContent}>
                {/* Product Image/Icon */}
                <View style={styles.feedMediaContainer}>
                  {item.image_url ? (
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.feedImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <LinearGradient
                      colors={PRODUCT_GRADIENT}
                      style={styles.feedIconPlaceholder}
                    >
                      <Text style={styles.feedIconText}>🛍️</Text>
                    </LinearGradient>
                  )}
                </View>

                {/* Info */}
                <View style={styles.textColumn}>
                  <Text style={styles.feedTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.dateText, { color: '#ff00aa' }]}>
                    New Arrival • Store
                  </Text>
                </View>

                {/* Price */}
                <View style={styles.amountColumn}>
                  <Text style={[styles.amount, { color: '#ff00aa' }]}>
                    ${item.price}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </PopCard>
      );
    }
  };

  return (
    <ScreenWrapper>
      {/* 🌑 Background: Light Theme Gradient */}
      <LinearGradient
        colors={['#ffffff', '#f5f5f5', '#ebebeb']}
        style={styles.background}
      >
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>LOGS</Text>
              <Text style={styles.headerSubtitle}>LEDGER, INTEL & SUPPLY</Text>
              <LinearGradient
                colors={THEME_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.headerLine}
              />
            </View>

            {loading && !refreshing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ff00aa" />
              </View>
            ) : (
              <FlatList
                data={mixedData}
                keyExtractor={item => `${item.type}-${item.id}`}
                renderItem={renderItem}
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
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>📂</Text>
                    <Text style={styles.emptyText}>LEDGER EMPTY</Text>
                  </View>
                }
              />
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: s(16),
  },

  /* Header */
  headerContainer: {
    marginTop: vs(20),
    marginBottom: vs(20),
  },
  headerTitle: {
    fontSize: ms(28),
    fontWeight: '800',
    color: '#ff00aa', // Cyan
    letterSpacing: ms(2),
  },
  headerSubtitle: {
    fontSize: ms(10),
    color: '#8B8B8B', // Grey
    marginTop: vs(4),
    marginBottom: vs(10),
    letterSpacing: ms(1),
    fontWeight: '600',
  },
  headerLine: {
    height: vs(3),
    width: s(40),
    borderRadius: ms(2),
  },

  listContent: {
    paddingBottom: vs(100),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Card Base */
  cardContainer: {
    borderRadius: ms(25), // Rounded corners
    shadowColor: '#ff00aa',
    shadowOffset: { width: 0, height: vs(4) },
    shadowOpacity: 0.1,
    shadowRadius: ms(5),
    elevation: 3,
  },
  cardGradient: {
    borderRadius: ms(25),
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 170, 0.15)', // Subtle cyan border
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: s(16),
  },

  /* Transaction Icons */
  iconBox: {
    width: ms(42),
    height: ms(42),
    borderRadius: ms(21), // Circular
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: s(12),
    backgroundColor: 'rgba(255, 0, 170, 0.1)', // Cyan tint bg
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 170, 0.2)',
  },
  iconText: {
    color: '#ff00aa',
    fontSize: ms(20),
    fontWeight: 'bold',
  },

  /* Feed & Product Media */
  feedMediaContainer: {
    width: ms(42),
    height: ms(42),
    borderRadius: ms(12),
    marginRight: s(12),
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  feedImage: {
    width: '100%',
    height: '100%',
  },
  feedIconPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedIconText: {
    fontSize: ms(20),
  },
  playBadge: {
    position: 'absolute',
    bottom: vs(2),
    right: s(2),
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: ms(4),
    width: s(12),
    height: s(12),
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Text Info */
  textColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    fontSize: ms(14),
    fontWeight: '700',
    color: '#ff00aa', // Cyan
    marginBottom: vs(2),
  },
  feedTitle: {
    fontSize: ms(13),
    fontWeight: 'bold',
    color: '#ff00aa', // Cyan
    marginBottom: vs(2),
  },
  dateText: {
    fontSize: ms(10),
    color: 'rgba(0, 0, 0, 0.4)',
    fontWeight: '500',
  },

  /* Right Side Info */
  amountColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: s(70),
  },
  amount: {
    fontSize: ms(14),
    fontWeight: '700',
    marginBottom: vs(2),
  },
  timeText: {
    fontSize: ms(10),
    color: '#666',
  },
  arrowIndicator: {
    color: '#ff00aa',
    fontSize: ms(24),
    fontWeight: '300',
    marginTop: vs(-4),
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    marginTop: vs(80),
    opacity: 0.5,
  },
  emptyIcon: {
    fontSize: ms(40),
    marginBottom: vs(10),
  },
  emptyText: {
    color: '#ff00aa',
    fontSize: ms(14),
    letterSpacing: ms(2),
    fontWeight: '700',
  },
});
