import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { supabase } from '../../utils/supabaseClient';
import ScreenWrapper from '../../utils/ScreenWrapper';
import {
  scale as s,
  verticalScale as vs,
  moderateScale as ms,
} from 'react-native-size-matters';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width - s(32); // The pill width remains padded

// --- FAKE DATA GENERATOR ---
const FAKE_NAMES = [
  // 🇯🇵 Japanese
  'さくら',
  'ひなた',
  'ゆい',
  '結衣',
  '大輝',
  '陽太',
  '蓮',
  '真一',
  '美咲',
  '葵',
  '凛',
  '結菜',
  '紬',
  '奏太',
  '樹',
  '朝陽',
  '咲良',
  '澪',
  '和真',
  '大輔',

  // 🇰🇷 Korean
  '지훈',
  '서연',
  '민준',
  '지은',
  '현우',
  '수진',
  '도윤',
  '하준',
  '은우',
  '시우',
  '하린',
  '지아',
  '서아',
  '민서',
  '예은',
  '주원',
  '건우',
  '승민',
  '하은',
  '유진',

  // 🇨🇳 Chinese
  '伟',
  '杰',
  '翔',
  '芳',
  '丽',
  '强',
  '浩',
  '洋',
  '勇',
  '敏',
  '静',
  '燕',
  '艳',
  '娟',
  '霞',
  '秀英',
  '健',
  '明',
  '辉',
  '宇',

  // 🇷🇺 Russian/Cyrillic
  'Иван',
  'Анна',
  'Дмитрий',
  'Елена',
  'Максим',
  'Ольга',
  'Сергей',
  'Мария',
  'Александр',
  'Екатерина',
  'Михаил',
  'Анастасия',
  'Алексей',
  'Дарья',
  'Николай',
  'Татьяна',
  'Владимир',
  'София',
  'Игорь',
  'Наталья',

  // 🇬🇷 Greek
  'Νίκος',
  'Μαρία',
  'Γιώργος',
  'Ελένη',
  'Κώστας',
  'Δημήτρης',
  'Γιάννης',
  'Άννα',
  'Σοφία',
  'Κατερίνα',
  'Ανδρέας',
  'Βασίλης',
  'Παναγιώτης',
  'Χρήστος',
  'Ειρήνη',
  'Αλέξανδρος',
  'Γεωργία',
  'Αγγελική',
  'Μιχάλης',
  'Σταύρος',

  // 🇮🇳 Hindi/Devanagari
  'राहुल',
  'प्रिया',
  'अमित',
  'स्नेहा',
  'राज',
  'कविता',
  'रोहन',
  'अंजलि',
  'सुमित',
  'पूजा',
  'विक्रम',
  'नेहा',
  'संजय',
  'आरती',
  'दीपक',
  'दिव्या',
  'अर्जुन',
  'रिया',
  'विशाल',
  'किरण',
  'विकास',
  'मीना',
  'संदीप',
  'ज्योति',
  'अशोक',
  'सीमा',
  'मनीष',
  'रितु',
  'नवीन',
  'मोनिका',
  'सुनील',
  'गीता',
  'करण',
  'श्वेता',
  'गौरव',
  'पूनम',
  'विवेक',
  'नीलम',
  'आशीष',
  'रेखा',
  'तरुण',
  'माया',
  'कपिल',
  'दिशा',
  'समीर',
  'तान्या',
  'हर्ष',
  'श्रुति',
  'पंकज',
  'गरिमा',
  'सौरभ',
  'रचना',
  'आकाश',
  'मीनाक्षी',
  'नितिन',
  'अनुराधा',
  'वरुण',
  'शिवानी',
  'अजय',
  'रश्मि',
  'विजय',
  'नंदिनी',
  'प्रतीक',
  'वैशाली',
  'मोहित',
  'अपर्णा',
  'रमन',
  'कोमल',
  'कुणाल',
  'दीप्ति',
  'शशांक',
  'ममता',
  'पीयूष',
  'निशा',
  'सचिन',
  'सोनम',
  'रजत',
  'निधि',
  'अनुराग',
  'स्वाति',
  'गौतम',
  'उर्मिला',
  'चिराग',
  'सारिका',
  'सिद्धार्थ',
  'विनीता',
  'मयंक',
  'ईशा',
  'शुभम',
  'माधुरी',
  'कार्तिक',
  'रूपा',
  'प्रणव',
  'काव्या',
  'अभिजीत',
  'अंकिता',
  'नीरज',
  'वंदना',
  'लक्ष्य',
  'संगीता',
  'योगेश',
  'सुरभि',
  'हर्षित',
  'भावना',
  'ध्रुव',
  'राधिका',
  'वैभव',
  'मेघा',
  'रोनित',
  'पल्लवी',
  'आयुष',
  'अमिता',
  'कौशल',
  'तृप्ति',
  'ऋषि',
  'रेणु',
  'अनूप',
  'सुषमा',
  'तेजस',
  'शिखा',

  // 🇹🇭 Thai
  'สมชาย',
  'มาลี',
  'อาทิตย์',
  'กัญญา',
  'พรทิพย์',
  'ชัย',
  'อานนท์',
  'นารี',
  'สุชาติ',
  'รัตนา',
  'วัฒนา',
  'จินตนา',
  'นิพนธ์',
  'ศิริพร',
  'ประเสริฐ',
  'สุจิตรา',
  'กิตติ',
  'อรทัย',
  'สมศักดิ์',
  'วันเพ็ญ',

  // 🇮🇱 Hebrew
  'דוד',
  'שרה',
  'משה',
  'רחל',
  'אבי',
  'מרים',
  'יצחק',
  'לאה',
  'אברהם',
  'רבקה',
  'חיים',
  'חנה',
  'יעקב',
  'תמר',
  'יוסף',
  'אסתר',
  'שלמה',
  'מיכל',
  'אריאל',
  'נועה',

  // 🇪🇸🇵🇹 Spanish & Portuguese
  'José',
  'María',
  'Sofía',
  'Raúl',
  'Mónica',
  'António',
  'Carlos',
  'Laura',
  'Manuel',
  'Carmen',
  'Alejandro',
  'Lucía',
  'Javier',
  'Paula',
  'Miguel',
  'Isabel',
  'Fernando',
  'Marta',
  'Ricardo',
  'Elena',
  'Diego',
  'Ana',
  'Luis',
  'Rosa',
  'Jorge',
  'Sara',
  'Pedro',
  'Julia',
  'Juan',
  'Teresa',
  'Andrés',
  'Irene',
  'Pablo',
  'Alba',
  'Rafael',
  'Nuria',
  'Víctor',
  'Silvia',
  'Alberto',
  'Eva',
  'Hugo',
  'Cristina',
  'Daniel',
  'Victoria',
  'Álvaro',
  'Blanca',
  'Joaquín',
  'Clara',
  'Eduardo',
  'Beatriz',
  'Roberto',
  'Celia',
  'Óscar',
  'Inés',
  'Marcos',
  'Pilar',
  'Adrián',
  'Natalia',
  'Ignacio',
  'Alicia',
  'Martín',
  'Raquel',
  'Tomás',
  'Lola',
  'Rubén',
  'Marina',
  'Iván',
  'Lidia',
  'Ramón',
  'Lorena',
  'Julio',
  'Miriam',
  'Guillermo',
  'Esther',
  'Enrique',
  'Ainhoa',
  'Félix',
  'Carolina',
  'Héctor',
  'Mercedes',
  'Gabriel',
  'Elisa',
  'Mario',
  'Aurora',
  'Samuel',
  'Ángela',
  'Arturo',
  'Berta',
  'César',
  'Diana',
  'Nicolás',
  'Fátima',
  'Felipe',
  'Gloria',
  'Lorenzo',
  'Gema',
  'Emilio',
  'Inmaculada',
  'Vicente',
  'Leticia',
  'Gonzalo',
  'Noelia',
  'Esteban',
  'Paloma',
  'Francisco',
  'Rocío',
  'Rodrigo',
  'Rosario',
  'Jaime',
  'Sandra',
  'Jesús',
  'Sonia',
  'Alfonso',
  'Susana',
  'Mariano',
  'Yolanda',
  'Salvador',
  'Vanesa',
  'Benjamín',
  'Verónica',

  // 🌍 Mixed European (Nordic, French, German, Polish)
  'Chloé',
  'Jürgen',
  'Bjørn',
  'Étienne',
  'Günther',
  'Åsa',
  'Amélie',
  'Bärbel',
  'Sören',
  'François',
  'Käthe',
  'Kári',
  'Géraldine',
  'Heinrich',
  'Guðrún',
  'Sébastian',
  'Mathias',
  'Jón',
  'Agnieszka',
  'Łukasz',
];

const FAKE_ACTIONS = [
  'just deposited',

  'added liquidity of',
  'just staked',
  'funded account with',
  'secured a node with',
  'started holding with',

  // 📈 Earnings & Yields
  'has earned',
  'received amount of',
  'generated income of',

  'claimed profits of',
  'secured return of',
  'captured margin of',

  // 💸 Withdrawals
  'has cashed out',
  'just withdrew',
  'extracted profits of',
  'triggered payout of',
  'transferred out',
];
const FAKE_IMAGES = [
  require('../homeMedia/first.png'), // Update these 4 paths to your actual local images
  require('../homeMedia/second.png'),
  require('../homeMedia/third.png'),
  require('../homeMedia/fourth.png'),
];

const generateFakeFeed = () => {
  return Array.from({ length: 200 }).map((_, i) => ({
    id: i.toString(),
    name: FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)],
    action: FAKE_ACTIONS[Math.floor(Math.random() * FAKE_ACTIONS.length)],
    amount: Math.floor(Math.random() * (5000 - 50) + 50),
    image: FAKE_IMAGES[Math.floor(Math.random() * 4)],
  }));
};

// --- HORIZONTAL LIVE FEED SLIDER COMPONENT ---
const LiveFeedSlider = () => {
  const [feed] = useState(generateFakeFeed());
  const [currentIndex, setCurrentIndex] = useState(0);

  // Start completely off-screen to the left (full screen width distance)
  const translateX = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    let isMounted = true;

    const animateSlide = () => {
      // 1. Slide In Slowly (From far Left to Center)
      Animated.timing(translateX, {
        toValue: 0, // 0 brings it to its natural centered position (due to marginHorizontal)
        duration: 1200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || !isMounted) return;

        // 2. Hold to read
        setTimeout(() => {
          if (!isMounted) return;

          // 3. Slide Out Fast (From Center to far Right)
          Animated.timing(translateX, {
            toValue: width, // Push it entirely off the screen to the right
            duration: 300,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (!finished || !isMounted) return;

            // 4. Instantly reset position back to far Left, then move to next message
            translateX.setValue(-width);
            setCurrentIndex(prev => (prev + 1) % feed.length);
          });
        }, 1800); // Time message stays on screen
      });
    };

    animateSlide();

    return () => {
      isMounted = false;
      translateX.stopAnimation();
    };
  }, [currentIndex]);

  const item = feed[currentIndex];
  if (!item) return null;

  return (
    <View style={styles.sliderWrapper} pointerEvents="none">
      <Animated.View
        style={[styles.sliderItem, { transform: [{ translateX }] }]}
      >
        <LinearGradient
          colors={['rgba(255, 0, 170, 0.1)', 'rgba(255,255,255,0.9)']}
          style={styles.sliderGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Image source={item.image} style={styles.sliderAvatar} />
          <Text style={styles.sliderText} numberOfLines={1}>
            <Text style={styles.sliderName}>{item.name}</Text>{' '}
            <Text style={styles.sliderAction}>{item.action}</Text>{' '}
            <Text style={styles.sliderAmount}>
              ${item.amount.toLocaleString()}
            </Text>
          </Text>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

export default function LeaderboardScreen() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('fake_leaderboard')
        .select('name, image, amount')
        .order('amount', { ascending: false });

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Image
        source={require('../homeMedia/leaderboard.png')}
        style={styles.bannerImage}
        resizeMode="contain"
      />
      <LinearGradient
        colors={['transparent', 'transparent']}
        style={styles.bannerGradient}
      />
      {/* 🟢 LIVE FEED SLIDER 🟢 */}
      <LiveFeedSlider />
    </View>
  );

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const rankColor = '#ff00aa';
    const cardBackground = ['#ffffff', '#f9f9f9'];

    return (
      <View style={styles.cardContainer}>
        <LinearGradient colors={cardBackground} style={styles.cardGradient}>
          <View style={styles.cardContent}>
            <View style={styles.rankBox}>
              <Text style={[styles.rankText, { color: rankColor }]}>
                #{index + 1}
              </Text>
            </View>

            <View style={styles.avatarContainer}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>
                    {item.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.textColumn}>
              <Text style={styles.username} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.amount}>
                ${Number(item.amount).toLocaleString()}
              </Text>
            </View>

            <View style={styles.arrowColumn}>
              <Text style={styles.upArrow}>▲</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <LinearGradient
        colors={['#ffffff', '#fafafa', '#f0f0f0']}
        style={styles.background}
      >
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="dark-content" backgroundColor="#fff" />

          {renderHeader()}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ff00aa" />
            </View>
          ) : (
            <View style={styles.fixedListWrapper}>
              <FlatList
                data={leaderboard}
                keyExtractor={(_, index) => index.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  fixedListWrapper: {
    flex: 1,
    width: '100%',
    paddingHorizontal: s(16),
  },

  headerContainer: {
    marginBottom: vs(10),
    marginTop: vs(40),
  },

  bannerImage: {
    width: '100%',
    height: vs(160),
  },

  bannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: vs(80),
    backgroundColor: 'transparent',
  },

  /* 🟢 UPDATED SLIDER STYLES 🟢 */
  sliderWrapper: {
    height: vs(40),
    marginTop: vs(10),
    width: width, // Extends wrapper completely edge-to-edge
    //overflow: 'hidden',
  },
  sliderItem: {
    width: ITEM_WIDTH,
    marginHorizontal: s(16), // Keeps the pill itself visually centered with padding
    height: '100%',
    justifyContent: 'center',
  },
  sliderGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(12),
    borderRadius: ms(22),
  },
  sliderAvatar: {
    width: ms(30),
    height: ms(30),

    marginRight: s(10),
  },
  sliderText: {
    flex: 1,
    fontSize: ms(13),
  },
  sliderName: {
    color: '#ff00aa',
    fontWeight: 'bold',
  },
  sliderAction: {
    color: 'rgba(0, 0, 0, 0.6)',
  },
  sliderAmount: {
    color: '#ff00f2',
    fontWeight: '900',
  },

  /* EXISTING STYLES */
  headerTextContainer: {
    position: 'absolute',
    bottom: vs(10),
    left: s(16),
  },
  headerTitle: {
    fontSize: ms(28),
    fontWeight: '900',
    color: '#ff00aa',
    letterSpacing: ms(2),
  },
  headerSubtitle: {
    fontSize: ms(10),
    color: '#000',
    marginTop: vs(2),
    marginBottom: vs(8),
    letterSpacing: ms(1),
    fontWeight: '700',
  },
  headerLine: {
    height: vs(3),
    width: s(60),
    borderRadius: ms(2),
  },

  listContent: {
    paddingBottom: vs(100),
  },

  cardContainer: {
    marginTop: vs(15),
    borderRadius: ms(20),
    shadowColor: '#080808',
    shadowOffset: { width: 0, height: vs(2) },
    shadowOpacity: 0.1,
    shadowRadius: ms(4),
    elevation: 3,
    overflow: 'visible',
  },
  cardGradient: {
    borderRadius: ms(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 170, 0.1)',
    overflow: 'visible',
    
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(7),
    paddingHorizontal: s(16),
  },

  rankBox: {
    width: s(40),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  rankText: {
    fontSize: ms(20),
    fontWeight: '900',
  },

  avatarContainer: {
    marginRight: s(12),
    marginTop: vs(-25),
    elevation: 5,
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(4) },
    shadowOpacity: 0.3,
    shadowRadius: ms(4),
  },
  avatar: {
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    backgroundColor: 'transparent',
    resizeMode: 'contain',
  },
  avatarPlaceholder: {
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ff00aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#ff00aa',
    fontSize: ms(20),
    fontWeight: 'bold',
  },

  textColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    fontSize: ms(15),
    fontWeight: '800',
    color: '#030303c7',
    marginBottom: vs(2),
  },
  amount: {
    fontSize: ms(14),
    fontWeight: 'bold',
    color: 'rgba(0, 0, 0, 0.52)',
  },

  arrowColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: s(10),
  },
  upArrow: {
    fontSize: ms(18),
    color: '#ff00aa',
  },
});
