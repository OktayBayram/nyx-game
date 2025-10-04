import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, ImageBackground, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import storyData from '../assets/story.json';
import { AchievementsContext } from '../shared/AchievementsContext';
import { SettingsContext } from '../shared/SettingsContext';

export default function GameScreen({ route }) {
  const { socket, roomCode, username } = route.params;
  const [currentPassage, setCurrentPassage] = useState('Uyanış');
  const [voted, setVoted] = useState(false);
  const [voteCount, setVoteCount] = useState({ votes: 0, total: 0 });
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [votersByChoice, setVotersByChoice] = useState({});
  const [typedText, setTypedText] = useState('');
  const [showChoices, setShowChoices] = useState(false);
  const [lastChoice, setLastChoice] = useState(null);
  const { typeSpeedMs, setTypeSpeedMs } = useContext(SettingsContext);
  const { addAchievement } = useContext(AchievementsContext);
  const typerRef = useRef(null);
  const scrollViewRef = useRef(null);
  const [textOpacity, setTextOpacity] = useState(0.3);

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
      setVoteCount({ votes, total });
      if (votersMap) setVotersByChoice(votersMap);
      Animated.timing(progressAnim, {
        toValue: total > 0 ? votes / total : 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });

    socket.on('voteResult', ({ choice, voteCounts, votersByChoice: votersMap, nextPassage, achievement }) => {
      console.log('GameScreen: voteResult received', { choice, voteCounts, votersMap, nextPassage, achievement });
      if (votersMap) setVotersByChoice(votersMap);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (achievement?.key) {
        addAchievement(achievement.key, achievement.label);
      }
      
      // Kazanan seçimi mesaj bubble'ında göster
      setLastChoice(choice);
      
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
        Animated.timing(passageFade, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start(() => {
          setCurrentPassage(choice);
          setVoted(false);
          setSelectedChoice(null);
          setVoteCount({ votes: 0, total: 0 });
          setVotersByChoice({});
          progressAnim.setValue(0);

          Animated.timing(passageFade, {
            toValue: 1,
            duration: 240,
            useNativeDriver: true,
          }).start();
        });
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

  // Smooth daktilo efekti (öbek öbek) + suspense
  useEffect(() => {
    const text = decodeHtmlEntities(passage?.content || '');
    setTypedText('');
    setShowChoices(false); // Yeni passage'da seçimleri gizle
    setTextOpacity(1.0); // Sabit opacity
    if (typerRef.current) clearInterval(typerRef.current);
    let i = 0;
    
    // Eğer metin zaten tamamlanmışsa tekrar yazma
    if (text === typedText) {
      setShowChoices(true);
      return;
    }
    
    // Kısa metinleri hemen göster
    if (text.length < 50) {
      setTypedText(text);
      setShowChoices(true);
      return;
    }
    
    // Daktilo efekti başlat
    typerRef.current = setInterval(() => {
      if (i < text.length) {
        // Öbek öbek yaz (3-5 karakter)
        const chunkSize = Math.floor(Math.random() * 3) + 3;
        const nextI = Math.min(i + chunkSize, text.length);
        
        setTypedText(text.substring(0, nextI));
        
        // Scroll to bottom
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
        
        // Random suspense noktaları ekle
        if (Math.random() < 0.3 && nextI < text.length) {
          setTypedText(text.substring(0, nextI) + '...');
          setTimeout(() => {
            setTypedText(text.substring(0, nextI));
          }, 200);
        }
        
        i = nextI;
      } else {
        // Metin tamamlandı
        clearInterval(typerRef.current);
        typerRef.current = null;
        setShowChoices(true); // Seçenekleri göster
      }
    }, Math.max(50, typeSpeedMs));
    return () => {
      if (typerRef.current) {
        clearInterval(typerRef.current);
        typerRef.current = null;
      }
    };
  }, [currentPassage, typeSpeedMs]);

  const vote = async (target) => {
    if (!voted) {
      console.log('GameScreen: vote called', { target, roomCode });
      setSelectedChoice(target);
      // Son seçimi sakla
      const choiceText = passage?.links.find(link => link.target === target)?.text;
      setLastChoice(choiceText);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      socket.emit('vote', { roomCode, choice: target });
      setVoted(true);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground source={{ uri: bgImage }} style={styles.bg} resizeMode="cover">
        <View style={[styles.bgTint, { backgroundColor: 'rgba(0,0,0,0.85)' }]} pointerEvents="none" />

      <View style={styles.headerRow}>
        {lastChoice ? (
          <View style={styles.messageBubbleRight}>
            <Text style={styles.messageText}>"{lastChoice}"</Text>
          </View>
        ) : (
          <Text style={styles.passageTitle}>{currentPassage}</Text>
        )}
      </View>

      <Animated.View style={[styles.storyContainer, { opacity: passageFade }]}>
        {Platform.OS === 'web' ? (
          <View style={{ flex: 1, overflow: 'auto', maxHeight: '60vh' }}>
            <Text style={styles.storyText}>{typedText}</Text>
          </View>
        ) : (
          <ScrollView 
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.storyText}>{typedText}</Text>
          </ScrollView>
        )}
      </Animated.View>

      {voteCount.total > 0 && (
        <View style={styles.progressBox}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.progressLabel}>Oylar: {voteCount.votes} / {voteCount.total}</Text>
        </View>
      )}

      <View style={styles.typeControls}>
        <View style={styles.speedRow}>
          {[{label:'Yavaş',ms:28},{label:'Orta',ms:12},{label:'Hızlı',ms:6}].map((opt, idx) => {
            const active = typeSpeedMs === opt.ms;
            return (
              <TouchableOpacity key={idx} style={[styles.speedPill, active && styles.speedPillActive]} onPress={() => setTypeSpeedMs(opt.ms)}>
                <Text style={[styles.speedText, active && styles.speedTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

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
  }
});