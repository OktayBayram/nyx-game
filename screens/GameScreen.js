import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { memo, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import storyData from '../assets/story.json';
import { AchievementsContext } from '../shared/AchievementsContext';
import { SettingsContext } from '../shared/SettingsContext';

// Memoized Text component - blink önleme
const MemoizedText = memo(({ children, style }) => (
  <Text style={style}>{children}</Text>
));

export default function GameScreen({ route, navigation }) {
  const { socket, roomCode, username } = route.params;
  const [currentPassage, setCurrentPassage] = useState('Uyanış');
  const [voted, setVoted] = useState(false);
  const [voteCount, setVoteCount] = useState({ votes: 0, total: 0 });
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [votersByChoice, setVotersByChoice] = useState({});
  const [typedText, setTypedText] = useState('');
  const [showChoices, setShowChoices] = useState(false); // KAPALI - metin bitince gelecek
  const [lastChoice, setLastChoice] = useState(null);
  const [showSkipButton, setShowSkipButton] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [passageHistory, setPassageHistory] = useState([]); // Chat geçmişi
  const [showTyping, setShowTyping] = useState(false); // "Yazıyor" animasyonu
  const [typingAnimation, setTypingAnimation] = useState(0); // Animasyon durumu
  const [messageCount, setMessageCount] = useState(0); // Mesaj sayacı
  const [lastChoiceHeight, setLastChoiceHeight] = useState(0); // Sarı rozet yüksekliği
  const [bottomBarHeight, setBottomBarHeight] = useState(0); // Alt çubuk yüksekliği
  const isSkippedRef = useRef(false); // Skip durumu - ref ile
  const { typeSpeedMs, setTypeSpeedMs } = useContext(SettingsContext);
  const [speedMode, setSpeedMode] = useState('medium'); // 'slow' | 'medium' | 'fast'
  const speedModeRef = useRef('medium');
  useEffect(() => { speedModeRef.current = speedMode; }, [speedMode]);
  const { addAchievement } = useContext(AchievementsContext);
  const typerRef = useRef(null);
  const scrollViewRef = useRef(null);
  const insets = useSafeAreaInsets();
  const [textOpacity, setTextOpacity] = useState(0.3);
  const currentTextRef = useRef('');
  const isTypingRef = useRef(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const passageFade = useRef(new Animated.Value(1)).current;

  const passage = storyData[currentPassage];
  // Tek background görsel + düşük opacity
  const bgImage = 'https://img.freepik.com/free-photo/halloween-day-celebration-with-costume_23-2151880079.jpg?semt=ais_hybrid&w=1200&q=80';
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  useEffect(() => {
    console.log('GameScreen: Setting up socket listeners for', username);
    console.log('GameScreen: Socket connected?', socket.connected);
    socket.on('voteUpdate', ({ votes, total, votersByChoice: votersMap }) => {
      console.log('voteUpdate received:', { votes, total, votersMap });
      // setVoteCount({ votes, total }); // Gizlendi - blink önleme
      // if (votersMap) setVotersByChoice(votersMap); // Gizlendi - blink önleme
      // Animated.timing(progressAnim, { // Gizlendi - blink önleme
      //   toValue: total > 0 ? votes / total : 0,
      //   duration: 300,
      //   easing: Easing.out(Easing.cubic),
      //   useNativeDriver: false,
      // }).start();
    });


    socket.on('voteResult', ({ choice, voteCounts, votersByChoice: votersMap, nextPassage, achievement }) => {
      console.log('GameScreen: voteResult received', { choice, voteCounts, votersMap, nextPassage, achievement });
      if (votersMap) setVotersByChoice(votersMap);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (achievement?.key) {
        addAchievement(achievement.key, achievement.label);
      }
      // Sağ üst rozete kazanan seçimi yaz (decode edilmiş)
      if (choice) setLastChoice(decodeHtmlEntities(choice));
      
      // Kazanan seçimi geçmişe ekle (WhatsApp gibi) - tırnak işareti olmadan
      const choiceMessage = {
        id: `choice-${Date.now()}-${Math.random()}`,
        title: '',
        content: choice,
        timestamp: new Date().toLocaleTimeString(),
        isUserChoice: true
      };
      setPassageHistory(prev => [...prev, choiceMessage]);
      
      // Hikayeyi ilerlet
      if (nextPassage !== undefined) {
        console.log('Setting currentPassage to:', nextPassage);
        setCurrentPassage(nextPassage);
      }

      // Beraberlik kontrolü (en yüksek oy sayısı birden fazla seçenek)
      const maxCount = voteCounts ? Math.max(...Object.values(voteCounts)) : 0;
      const topChoices = voteCounts ? Object.keys(voteCounts).filter(k => voteCounts[k] === maxCount) : [];
      const isTie = topChoices.length > 1;

      const proceedTransition = () => {
        // passageFade animasyonu kaldırıldı - blink önleme
        setCurrentPassage(nextPassage);
        setVoted(false);
        setSelectedChoice(null);
        setVoteCount({ votes: 0, total: 0 });
        setVotersByChoice({});
        progressAnim.setValue(0);
      };

      if (isTie) {
        // Splash yazısı
        setShowFateSplash(true);
        setTimeout(() => {
          setShowFateSplash(false);
          // Zar animasyonu
          setShowDice(true);
          diceSpin.setValue(0);
          Animated.loop(
            Animated.timing(diceSpin, {
              toValue: 1,
              duration: 600,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            { iterations: 3 }
          ).start(() => {
            setShowDice(false);
            proceedTransition();
          });
        }, 900);
      } else {
        // Direkt geçiş
        setTimeout(() => {
          proceedTransition();
        }, 1000);
      }
    });

    // Zar mekaniği kaldırıldı - artık sadece normal voteResult kullanılıyor

    return () => {
      socket.off('voteUpdate');
      socket.off('voteResult');
    };
  }, []);


  // HTML entity'lerini decode et
  const decodeHtmlEntities = (text) => {
    const entities = {
      '&quot;': '"',
      '&apos;': "'",
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&nbsp;': ' ',
      '&#39;': "'",
      '&ldquo;': '"',
      '&rdquo;': '"',
      '&lsquo;': "'",
      '&rsquo;': "'"
    };
    
    return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
      return entities[entity] || entity;
    });
  };

  // Typewriter effect - tek useEffect
  useEffect(() => {
    const text = decodeHtmlEntities(passage?.content || '');
    setTypedText('');
    setDisplayText('');
    setShowChoices(false); // Seçenekler kapalı - metin bitince gelecek
    setShowSkipButton(true);
    isTypingRef.current = true;
    
    // "Yazıyor" animasyonu sadece özel duraklama anlarında gösterilecek
    setShowTyping(false);
    setShowChoices(false);
    setShowSkipButton(true);
    isSkippedRef.current = false; // Her yeni pasajda reset
    
    // Üç nokta animasyonu bu effectte değil, showTyping'e bağlı ayrı effectte yönetilecek
    
    // Doğal paragraf akışı: boşlukları ve satır sonlarını KORUYARAK token bazlı yazım
    const tokens = text.match(/\s+|\S+/g) || [];
    let tokenIndex = 0;

    const typeNextToken = () => {
      if (isSkippedRef.current) return;

      if (tokenIndex < tokens.length) {
        const token = tokens[tokenIndex];
        const tokenTrim = token.trim();

        // Eğer tek başına "..." ya da "…" ise: animasyonu göster, 3.5s bekle, yazmaya devam et
        if (tokenTrim === '...' || tokenTrim === '…') {
          setShowTyping(true);
          setTimeout(() => {
            setShowTyping(false);
            tokenIndex++; // '...' karakterlerini ekrana yazmadan atla
            // '...' sonrasında gelen tek newline'ı da yutarak ekstra boş satırı engelle
            const nextToken = tokens[tokenIndex];
            if (nextToken && /\n/.test(nextToken)) {
              tokenIndex++;
            }
            setTimeout(typeNextToken, 0);
          }, 3500);
          return;
        }

        setDisplayText(prev => (prev || '') + token);
        tokenIndex++;

        // Scroll to bottom
        if (scrollViewRef.current) {
          setTimeout(() => {
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollToEnd({ animated: true });
            }
          }, 50);
        }

        // Ortalama insan yazışı: kelime/karakter temposu
        const isSpace = /\s+/.test(token);
        const baseRaw = isSpace ? 10 : 45; // boşluklar daha hızlı
        const mode = speedModeRef.current;
        const factor = mode === 'slow' ? 1.8 : mode === 'fast' ? 0.5 : 1.0;
        const base = Math.max(1, Math.round(baseRaw * factor));
        setTimeout(typeNextToken, base);
      } else {
        setShowTyping(false);
        setShowChoices(true);
        setShowSkipButton(false);
      }
    };
    
    // Yazımı başlat: her pasaj başında kısa bir "yazıyor" beklemesi
    // İlk anlamlı token '...' ise, onun akışı zaten özel bekleme yapacak; aksi halde kısa intro beklemesi uygula
    const firstNonWsIndex = tokens.findIndex(t => t.trim().length > 0);
    const firstNonWsIsDots = firstNonWsIndex >= 0 && (tokens[firstNonWsIndex].trim() === '...' || tokens[firstNonWsIndex].trim() === '…');
    if (!firstNonWsIsDots) {
      setShowTyping(true);
      setTimeout(() => {
        setShowTyping(false);
        typeNextToken();
      }, 800);
    } else {
      setTimeout(typeNextToken, 500);
    }
    return () => {
      isTypingRef.current = false;
      setShowSkipButton(false);
    };
  }, [currentPassage]);

  // Üç nokta animasyonu: showTyping açıkken sırayla yanacak şekilde döngü
  useEffect(() => {
    if (!showTyping) return;
    let isActive = true;
    let timer;
    const tick = () => {
      if (!isActive) return;
      setTypingAnimation((prev) => (prev + 1) % 3);
      timer = setTimeout(tick, 600); // tercih edilen hız
    };
    // hemen başlat
    timer = setTimeout(tick, 0);
    return () => {
      isActive = false;
      if (timer) clearTimeout(timer);
    };
  }, [showTyping]);

  // Skip text function
  const skipText = () => {
    // Skip butonu görünüyorsa çalış
    if (showSkipButton) {
      isTypingRef.current = false;
      isSkippedRef.current = true; // Skip durumunu işaretle - ref ile
      setShowTyping(false);
      setShowSkipButton(false);
      setShowChoices(true);
      
      // Tüm metni tek konteynerde hemen göster (paragrafları KORU)
      const fullText = decodeHtmlEntities(passage?.content || '');
      setDisplayText(fullText);
      
      // Scroll to bottom - WhatsApp gibi
      if (scrollViewRef.current) {
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
      
      // Backend'e skip bildir
      socket.emit('skipText', { roomCode, currentPassage });
    }
  };

  const vote = async (target) => {
    if (!voted) {
      console.log('GameScreen: vote called', { target, roomCode });
      setSelectedChoice(target);
      // Son seçimi sakla - sadece sarı bubble için
      const choiceText = passage?.links.find(link => link.target === target)?.text;
      setLastChoice(choiceText);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      socket.emit('vote', { roomCode, choice: target });
      setVoted(true);
    }
  };



  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar style="light" hidden={true} />
      <ImageBackground source={{ uri: bgImage }} style={styles.bg} resizeMode="cover">
        <View style={[styles.bgTint, { backgroundColor: 'rgba(0,0,0,0.85)' }]} pointerEvents="none" />

      {/* Geri (Lobby) butonu - onay diyaloglu */}
      <TouchableOpacity
        style={styles.headerBackButton}
        onPress={() => {
          Alert.alert('Emin misin?', 'Lobiye dönmek istiyor musun?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Confirm', style: 'destructive', onPress: () => navigation.goBack() },
          ]);
        }}
      >
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>

      {lastChoice && (
        <View style={styles.lastChoicePill} onLayout={(e) => setLastChoiceHeight(e.nativeEvent.layout.height)}>
          <Text style={styles.lastChoiceText}>{lastChoice}</Text>
        </View>
      )}

      {/* Scroll alanı için sabit üst boşluk: rozet pozisyonu (68) + yüksekliği + tampon */}
      <View
        pointerEvents="none"
        style={{ height: lastChoice ? (68 + lastChoiceHeight + 16) : 16 }}
      />

      {/* Tek konteyner hikaye görünümü */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.storyContainer}
        contentContainerStyle={{ paddingBottom: bottomBarHeight + (insets?.bottom || 0) + 32, paddingTop: 0 }}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          isTypingRef.current = false;
        }}
      >
        <Text style={styles.storyText}>
          {displayText}
          {showTyping && (
            <Text>
              <Text style={[styles.typingDot, { opacity: typingAnimation === 0 ? 1 : 0.3 }]}>.</Text>
              <Text style={[styles.typingDot, { opacity: typingAnimation === 1 ? 1 : 0.3 }]}>.</Text>
              <Text style={[styles.typingDot, { opacity: typingAnimation === 2 ? 1 : 0.3 }]}>.</Text>
            </Text>
          )}
        </Text>
        {/* Alt çubuğun altında kalmaması için ekstra spacer */}
        {showSkipButton && <View style={{ height: bottomBarHeight + (insets?.bottom || 0) + 16 }} />}
      </ScrollView>

      {/* Progress bar gizlendi - blink önleme */}
      {false && voteCount.total > 0 && (
        <View style={styles.progressBox}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.progressLabel}>Oylar: {voteCount.votes} / {voteCount.total}</Text>
        </View>
      )}

      {/* Skip Button */}
      {showSkipButton && (
        <View style={styles.bottomBar} onLayout={(e) => setBottomBarHeight(e.nativeEvent.layout.height)}>
          <View style={styles.speedRowBar}>
            <TouchableOpacity onPress={() => setSpeedMode('slow')} activeOpacity={0.8} style={[styles.speedPillBar, speedMode === 'slow' && styles.speedPillBarActive]}>
              <Text style={[styles.speedTextBar, speedMode === 'slow' && styles.speedTextBarActive]}>Yavaş</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSpeedMode('medium')} activeOpacity={0.8} style={[styles.speedPillBar, speedMode === 'medium' && styles.speedPillBarActive]}>
              <Text style={[styles.speedTextBar, speedMode === 'medium' && styles.speedTextBarActive]}>Orta</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSpeedMode('fast')} activeOpacity={0.8} style={[styles.speedPillBar, speedMode === 'fast' && styles.speedPillBarActive]}>
              <Text style={[styles.speedTextBar, speedMode === 'fast' && styles.speedTextBarActive]}>Hızlı</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.skipFab} onPress={skipText}>
            <Text style={styles.skipFabText}>Hızlı Geç</Text>
          </TouchableOpacity>
        </View>
      )}

      {showChoices && (
        <View style={styles.choicesContainer}>
          {passage?.links.map((link, index) => {
            const isSelected = selectedChoice === link.target;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.choiceButton, voted && styles.choiceButtonDisabled, isSelected && styles.choiceSelected]}
                onPress={() => vote(link.target)}
                disabled={voted}
                activeOpacity={0.9}
              >
                <View style={styles.choiceRow}>
                  <Text style={styles.choiceText}>{link.text}</Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color="#d0d6ff" />
                  )}
                </View>
                {!!votersByChoice[link.target]?.length && (
                  <View style={styles.avatarRow}>
                    {votersByChoice[link.target].map((name, i) => (
                      <View key={i} style={[styles.avatar, { marginLeft: i === 0 ? 0 : -8 }]}>
                        <Text style={styles.avatarText}>{name.slice(0, 2).toUpperCase()}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  bg: {
    flex: 1,
  },
  bgTint: {
    ...StyleSheet.absoluteFillObject,
  },
  storyContainer: {
    flex: 1,
    padding: 20,
  },
  storyText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    opacity: 1,
  },
  votingInfo: {
    padding: 15,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
  },
  votingText: {
    color: '#6c5ce7',
    fontSize: 16,
    fontWeight: 'bold',
  },
  choicesContainer: {
    padding: 20,
  },
  progressBox: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#202124',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: '#6c5ce7',
    borderRadius: 8,
  },
  progressLabel: {
    color: '#9aa0a6',
    fontSize: 12,
    marginTop: 6,
  },
  typeControls: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedPill: {
    backgroundColor: '#202124',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  speedPillActive: {
    backgroundColor: '#6c5ce7',
    borderColor: '#6c5ce7',
  },
  speedText: {
    color: '#c7c9cc',
    fontSize: 12,
    fontWeight: '600',
  },
  speedTextActive: {
    color: '#fff',
  },
  revealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d6d9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  revealText: {
    color: '#111',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  choiceButton: {
    backgroundColor: '#6c5ce7',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  choiceButtonDisabled: {
    backgroundColor: '#444',
  },
  choiceText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  avatar: {
    backgroundColor: '#303134',
    borderWidth: 1,
    borderColor: '#3a3b3e',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#c7c9cc',
    fontSize: 10,
    fontWeight: '700',
  },
  resultsOverlay: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    ...StyleSheet.absoluteFillObject,
  },
  resultsCard: {
    backgroundColor: '#1c1d20',
    width: '100%',
    borderRadius: 14,
    padding: 16,
  },
  resultsTitle: {
    color: '#e8eaed',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultChoice: {
    color: '#c7c9cc',
    fontSize: 14,
    flex: 0.35,
  },
  resultBarTrack: {
    flex: 0.5,
    height: 10,
    backgroundColor: '#202124',
    borderRadius: 999,
    flexDirection: 'row',
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  resultBarFill: {
    backgroundColor: '#6c5ce7',
  },
  resultCount: {
    color: '#e8eaed',
    fontSize: 12,
    textAlign: 'right',
    flex: 0.15,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashText: {
    color: '#e8eaed',
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dice: {
    width: 84,
    height: 84,
    backgroundColor: '#e9ecff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  pipRow: {
    flexDirection: 'row',
  },
  pip: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2b2d42',
    margin: 8,
  },
  messageBubble: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    maxWidth: '80%',
    alignSelf: 'flex-start',
    marginRight: 20,
  },
  messageBubbleRight: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.4)',
    maxWidth: '80%',
    alignSelf: 'flex-end',
    marginRight: 10,
    marginTop: 5,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 1,
  },
  skipContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speedRowBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedPillBar: {
    backgroundColor: 'rgba(32,33,36,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  speedPillBarActive: {
    backgroundColor: '#6c5ce7',
    borderColor: '#6c5ce7',
  },
  speedTextBar: {
    color: '#c7c9cc',
    fontSize: 12,
    fontWeight: '600',
  },
  speedTextBarActive: {
    color: '#fff',
  },
  skipFab: {
    backgroundColor: 'rgba(108, 92, 231, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.5)',
  },
  skipFabText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  skipButton: {
    backgroundColor: 'rgba(108, 92, 231, 0.8)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.4)',
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(108, 92, 231, 0.6)',
  },
  currentMessage: {
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    borderLeftColor: '#6c5ce7',
  },
  choiceMessage: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderLeftColor: '#ffc107',
    alignSelf: 'flex-end',
    maxWidth: '80%',
    marginLeft: 20,
    marginRight: 0,
  },
  typingMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#2a2a2a',
    borderColor: '#4a4a4a',
    borderWidth: 1,
    marginRight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    color: '#888',
    fontSize: 20,
    marginHorizontal: 2,
    fontWeight: 'bold',
  },
  headerBackButton: {
    position: 'absolute',
    top: 20,
    left: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastChoicePill: {
    position: 'absolute',
    top: 68,
    right: 16,
    backgroundColor: 'rgba(255, 193, 7, 0.18)',
    borderColor: '#ffc107',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 10,
    maxWidth: '70%',
  },
  lastChoiceText: {
    color: '#ffd54f',
    fontSize: 12,
    fontWeight: '700',
  },
  messageTitle: {
    color: '#d0d6ff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageContent: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  messageTime: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    alignSelf: 'flex-end',
  },
});