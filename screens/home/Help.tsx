import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Keyboard,
  Animated,
  Pressable,
  AppState,
} from 'react-native';
// MAKE SURE THIS IS IN YOUR APP.TSX AS WELL:
import 'react-native-url-polyfill/auto';
import { supabase } from '../../utils/supabaseClient';
import { useUser } from '../../utils/UserContext';
import LinearGradient from 'react-native-linear-gradient';
import {
  scale as s,
  verticalScale as vs,
  moderateScale as ms,
} from 'react-native-size-matters';
import ScreenWrapper from '../../utils/ScreenWrapper';

// --- Local Pop Button Component ---
const PopScaleButton = ({ children, onPress, disabled, style }: any) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.9,
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
      disabled={disabled}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function SupportScreen() {
  const { user } = useUser();
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);

  // 🚨 State to track if WebSocket is actually alive
  const [isSocketActive, setIsSocketActive] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const THEME_GRADIENT = ['#ff00aa', '#9000ff'];

  // --- FETCH MESSAGES FUNCTION ---
  const fetchMessages = async (convId: number) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    } catch (err) {
      console.log('Fetch error:', err);
    }
  };

  // 1. Initialize Chat
  useEffect(() => {
    let isMounted = true;
    const initChat = async () => {
      try {
        if (!user) return;

        const { data: existingConv, error: fetchError } = await supabase
          .from('conversations')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'open')
          .maybeSingle();

        if (fetchError) throw fetchError;

        let convId = existingConv?.id;

        if (!convId) {
          const { data: newConv, error: createError } = await supabase
            .from('conversations')
            .insert([{ user_id: user.id }])
            .select()
            .single();

          if (createError) throw createError;
          convId = newConv.id;
        }

        if (isMounted && convId) {
          setConversationId(convId);
          await fetchMessages(convId);
        }
      } catch (error: any) {
        console.error('Chat Init Error:', error.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initChat();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // 2. REALTIME WEBSOCKET SUBSCRIPTION
  useEffect(() => {
    if (!conversationId) return;

    const channelName = `chat_room_${conversationId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        payload => {
          if (
            payload.new &&
            String(payload.new.conversation_id) === String(conversationId)
          ) {
            setMessages(current => {
              const exists = current.some(
                m => String(m.id) === String(payload.new.id),
              );
              if (!exists) return [...current, payload.new];
              return current;
            });
            // Auto scroll on new message
            setTimeout(
              () => flatListRef.current?.scrollToEnd({ animated: true }),
              200,
            );
          }
        },
      )
      .subscribe(status => {
        // Track if the socket is actually connected
        if (status === 'SUBSCRIBED') {
          setIsSocketActive(true);
        } else {
          setIsSocketActive(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // 3. 🚨 SMART FALLBACK: If socket dies or quotas are hit, silently pull messages every 4 seconds
  useEffect(() => {
    if (!conversationId || isSocketActive) return; // Don't poll if socket works!

    const interval = setInterval(() => {
      fetchMessages(conversationId);
    }, 4000);

    return () => clearInterval(interval);
  }, [conversationId, isSocketActive]);

  // 4. AppState recovery (Wake up from background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && conversationId) {
        fetchMessages(conversationId);
      }
    });
    return () => subscription.remove();
  }, [conversationId]);

  // 5. Auto-Scroll logic
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        if (messages.length > 0) {
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      },
    );

    if (messages.length > 0 && loading === false) {
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        200,
      );
    }
    return () => keyboardDidShowListener.remove();
  }, [messages, loading]);

  // 6. Send Message
  const sendMessage = async () => {
    if (!input.trim() || !conversationId) return;

    const msgText = input.trim();
    setInput('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversationId,
            sender_id: user.id,
            sender_type: 'user',
            message_text: msgText,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages(prev => {
          const exists = prev.some(m => String(m.id) === String(data.id));
          if (!exists) {
            setTimeout(
              () => flatListRef.current?.scrollToEnd({ animated: true }),
              100,
            );
            return [...prev, data];
          }
          return prev;
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
      setInput(msgText);
    }
  };

  const renderItem = ({ item }: any) => {
    const isUser = item.sender_type === 'user';
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.adminBubble,
        ]}
      >
        <Text style={[styles.messageText, !isUser && styles.adminText]}>
          {item.message_text}
        </Text>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <LinearGradient
        colors={['#ffffff', '#fafafa', '#f0f0f0']}
        style={styles.container}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* --- HEADER --- */}
        <View style={styles.headerContainer}>
         
          <View style={styles.headerContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.headerTitle}>LIVE SUPPORT</Text>
              {loading && (
                <ActivityIndicator
                  size="small"
                  color="#ff00aa"
                  style={{ marginLeft: 10 }}
                />
              )}
            </View>
            {/* Small subtle dot to let you know if it's using Socket (Green) or Backup Sync (Yellow) */}
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isSocketActive ? '#00ffaa' : '#ffaa00' },
              ]}
            />
          </View>
        </View>

        {/* --- CHAT AREA --- */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="height"
          keyboardVerticalOffset={20}
        >
          <View style={styles.listContainer}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => String(item.id)}
              renderItem={renderItem}
              contentContainerStyle={{ padding: s(15), paddingBottom: vs(20) }}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
              onLayout={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
              ListEmptyComponent={
                !loading ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>SECURE LINE ACTIVE</Text>
                  </View>
                ) : null
              }
            />
          </View>

          {/* --- INPUT AREA --- */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Transmitting message..."
                placeholderTextColor="rgba(0,0,0,0.4)"
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                multiline={false}
              />
              <PopScaleButton
                onPress={sendMessage}
                disabled={loading || !input.trim()}
              >
                <LinearGradient
                  colors={THEME_GRADIENT}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.sendButton, !input.trim() && { opacity: 0.5 }]}
                >
                  <Text style={styles.sendButtonText}>➤</Text>
                </LinearGradient>
              </PopScaleButton>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    paddingTop: vs(20),
    paddingBottom: vs(10),
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  headerLine: {
    height: vs(2),
    width: '30%',
    alignSelf: 'center',
    borderRadius: ms(2),
    marginBottom: vs(10),
    opacity: 0.7,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: ms(20),
    fontWeight: '900',
    color: '#030303b2',
    letterSpacing: ms(1),
    textTransform: 'uppercase',
  },
  statusDot: {
    width: s(6),
    height: s(6),
    borderRadius: s(3),
    marginLeft: s(8),
  },
  listContainer: { flex: 1 },
  emptyContainer: { alignItems: 'center', marginTop: vs(50), opacity: 0.5 },
  emptyText: {
    color: '#ff00aa',
    fontSize: ms(14),
    fontWeight: '700',
    letterSpacing: ms(2),
  },
  messageBubble: {
    padding: s(12),
    borderRadius: ms(16),
    marginVertical: vs(4),
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: 'rgba(255, 0, 170, 0.1)',
    alignSelf: 'flex-end',
    borderBottomRightRadius: ms(2),
    borderWidth: 1,
    borderColor: '#ff00aa',
  },
  adminBubble: {
    backgroundColor: '#f9f9f9',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: ms(2),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  messageText: { fontSize: ms(14), color: '#000', lineHeight: ms(20) },
  adminText: { color: 'rgba(0, 0, 0, 0.6)' },
  inputWrapper: { padding: s(15), backgroundColor: 'rgba(0, 0, 0, 0)' },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: ms(25),
    paddingHorizontal: s(15),
    paddingVertical: vs(12),
    marginRight: s(10),
    color: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 170, 0.2)',
    fontSize: ms(14),
  },
  sendButton: {
    width: s(45),
    height: s(45),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: ms(25),
    shadowColor: '#ff00aa',
    shadowOffset: { width: 0, height: vs(2) },
    shadowOpacity: 0.3,
    shadowRadius: ms(5),
    elevation: 5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: ms(18),
    fontWeight: 'bold',
    marginBottom: vs(2),
  },
});
