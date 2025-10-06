import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useContext, useState } from 'react';
import { Alert, Animated, ImageBackground, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import io from 'socket.io-client';
import { playHome, stopHome } from '../shared/AudioManager';
import { SettingsContext } from '../shared/SettingsContext';

// Not: Telefon/Expo Go için localhost çalışmaz. Mac'in yerel IP'sini kullan.
// IP'ni öğren: `ipconfig getifaddr en0` (Wi‑Fi)
const SOCKET_URL = Platform.select({
  web: 'https://nyx-backend-production.up.railway.app',
  default: 'http://192.168.1.115:3002', // BURAYI kendi Mac IP'n ile değiştir
});
const BG_URL = 'https://img.freepik.com/free-photo/halloween-day-celebration-with-costume_23-2151880079.jpg?semt=ais_hybrid&w=740&q=80';
const CREATE_BG = 'https://img.freepik.com/free-photo/door-stretching-into-fantasy-world_23-2151661272.jpg?semt=ais_incoming&w=740&q=80';
const JOIN_BG = 'https://w0.peakpx.com/wallpaper/240/814/HD-wallpaper-journey-with-little-friend-fantasy-artist-artwork-digital-art.jpg';

export default function HomeScreen({ navigation }) {
  const { musicEnabled } = useContext(SettingsContext);
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [capacity, setCapacity] = useState(1); // Geçici olarak tek kişilik test için
  const [activeTab, setActiveTab] = useState('create');
  const [showSplash, setShowSplash] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [slideAnim] = useState(new Animated.Value(0));
  const [formFadeAnim] = useState(new Animated.Value(0));
  const [expanding, setExpanding] = useState(null);
  const [expandScale] = useState(new Animated.Value(1));
  const [expandOpacity] = useState(new Animated.Value(0));
  const homeSoundRef = React.useRef(null); // deprecated, using AudioManager

  const createRoom = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Enter your name');
      return;
    }

    try {
      console.log('Creating room with:', { username: username.trim(), capacity });
      console.log('Connecting to:', SOCKET_URL);
      const socket = io(SOCKET_URL);
      
      socket.on('connect', () => {
        console.log('Socket connected!');
        socket.emit('createRoom', { username: username.trim(), capacity });
      });
      
      socket.on('disconnect', () => {
        console.log('Socket disconnected!');
      });
      
      socket.on('roomCreated', ({ roomCode: newRoomCode, room }) => {
        console.log('Room created:', { roomCode: newRoomCode, room });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.navigate('Lobby', { 
          socket, 
          roomCode: newRoomCode, 
          username: username.trim(), 
          isHost: true,
          room,
          capacity
        });
      });

      socket.on('error', ({ message }) => {
        console.log('Socket error:', message);
        Alert.alert('Error', message);
      });
    } catch (error) {
      console.log('Connection error:', error);
      Alert.alert('Error', 'Cannot connect to server');
    }
  };

  const joinRoom = async () => {
    if (!username.trim() || !roomCode.trim()) {
      Alert.alert('Error', 'Enter name and room code');
      return;
    }

    try {
      console.log('Joining room with:', { roomCode: roomCode.trim().toUpperCase(), username: username.trim() });
      const socket = io(SOCKET_URL);
      
      socket.emit('joinRoom', { roomCode: roomCode.trim().toUpperCase(), username: username.trim() });
      
      socket.on('roomJoined', ({ room }) => {
        console.log('Room joined:', { room });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.navigate('Lobby', { 
          socket, 
          roomCode: roomCode.trim().toUpperCase(), 
          username: username.trim(), 
          isHost: false,
          room,
          capacity: room.capacity
        });
      });

      socket.on('error', ({ message }) => {
        console.log('Socket error:', message);
        Alert.alert('Error', message);
      });
    } catch (error) {
      console.log('Connection error:', error);
      Alert.alert('Error', 'Cannot connect to server');
    }
  };

  const startJourney = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setShowSplash(false);
    });
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    
    // Kartları sola kaydır
    Animated.timing(slideAnim, {
      toValue: -1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowForm(true);
      // Form'u fade in yap
      Animated.timing(formFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleSelect = (tab) => {
    setActiveTab(tab);
    // Smooth geçiş yap
    Animated.timing(slideAnim, {
      toValue: -1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowForm(true);
      // Form'u fade in yap
      Animated.timing(formFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const goBack = () => {
    // Form'u fade out yap
    Animated.timing(formFadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowForm(false);
      setUsername('');
      setRoomCode('');
      // Kartları geri getir
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  React.useEffect(() => {
    if (showSplash) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();

      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      // fog removed
    }
  }, [showSplash]);

// Keep home music across screens; only play while splash or non-Game screens
React.useEffect(() => {
  const run = async () => {
    if (musicEnabled) {
      await playHome();
    } else {
      await stopHome();
    }
  };
  run();
  return () => {};
}, [musicEnabled]);

  if (showSplash) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <StatusBar style="light" hidden={true} />
        <ImageBackground source={{ uri: BG_URL }} resizeMode="cover" style={styles.bg}>
          <View style={styles.bgOverlay} />
          {/* fog removed */}
          
          {/* Settings Button */}
          <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Animated.View style={[styles.splashContent, { opacity: fadeAnim }]}>
            <Text style={styles.splashTitle}>NYX</Text>
            <Text style={styles.splashSubtitle}>The Awakening</Text>
            <Animated.Text 
              style={[styles.startButtonText, { 
                transform: [{ scale: pulseAnim }] 
              }]} 
              onPress={startJourney}
            >
              Start Journey
            </Animated.Text>
          </Animated.View>
        </ImageBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar style="light" hidden={true} />
      <ImageBackground source={{ uri: BG_URL }} resizeMode="cover" style={styles.bg} blurRadius={showForm ? 6 : 0}>
        <View style={styles.bgOverlay} />

        {/* Fixed Back Button (kart sahnesinde) */}
        {!showForm && (
          <TouchableOpacity style={styles.headerBackButton} onPress={() => {
            setShowSplash(true);
            setShowForm(false);
            setUsername('');
            setRoomCode('');
          }}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Fixed Back Button (form açıkken) */}
        {showForm && (
          <TouchableOpacity style={styles.headerBackButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Main Content */}
        <View style={styles.mainContent}>
          {!showForm ? (
            <>
            <Animated.View style={[styles.cardsContainerFull, {
              transform: [{ 
                translateX: slideAnim.interpolate({
                  inputRange: [-1, 0],
                  outputRange: [-400, 0]
                })
              }],
              opacity: slideAnim.interpolate({
                inputRange: [-1, 0],
                outputRange: [0, 1]
              })
            }]}>
              <Animated.View style={styles.actionCardFull}>
                <TouchableOpacity 
                  style={styles.cardTouchable}
                  onPress={() => handleSelect('create')}
                  activeOpacity={0.9}
                >
                <ImageBackground source={{ uri: CREATE_BG }} style={styles.cardImage} imageStyle={styles.cardImageRadius}>
                  <View style={styles.bwMask} />
                  <View style={styles.cardContentFull}>
                    <Text style={styles.cardTitleFull}>Create Room</Text>
                    <Text style={styles.cardSubtitleFull}>Start a new game</Text>
                  </View>
                </ImageBackground>
                </TouchableOpacity>
              </Animated.View>
              
              <Animated.View style={styles.actionCardFull}>
                <TouchableOpacity 
                  style={styles.cardTouchable}
                  onPress={() => handleSelect('join')}
                  activeOpacity={0.9}
                >
                <ImageBackground source={{ uri: JOIN_BG }} style={styles.cardImage} imageStyle={styles.cardImageRadius}>
                  <View style={styles.bwMask} />
                  <View style={styles.cardContentFull}>
                    <Text style={styles.cardTitleFull}>Join Room</Text>
                    <Text style={styles.cardSubtitleFull}>Enter existing room</Text>
                  </View>
                </ImageBackground>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
            </>
          ) : (
            <View style={styles.formContent}>
              {/* Form */}
              <Animated.View style={[styles.formContainer, {
                opacity: formFadeAnim,
                transform: [{ 
                  translateX: formFadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [400, 0]
                  })
                }]
              }]}>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>
                    {activeTab === 'create' ? 'Create Room' : 'Join Room'}
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Your Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-circle-outline" size={20} color="#9aa0a6" />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your name"
                      placeholderTextColor="#9aa0a6"
                      value={username}
                      onChangeText={setUsername}
                    />
                  </View>
                </View>

                {activeTab === 'create' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Player Count</Text>
                    <View style={styles.capacityContainer}>
                      {[1, 2, 3, 5].map((cap) => (
                        <TouchableOpacity
                          key={cap}
                          style={[styles.capacityButton, capacity === cap && styles.capacityButtonActive]}
                          onPress={() => setCapacity(cap)}
                        >
                          <Text style={[styles.capacityText, capacity === cap && styles.capacityTextActive]}>{cap}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {activeTab === 'join' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Room Code</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="key-outline" size={20} color="#9aa0a6" />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter room code"
                        placeholderTextColor="#9aa0a6"
                        value={roomCode}
                        onChangeText={setRoomCode}
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>
                )}

                <TouchableOpacity 
                  style={[
                    styles.submitButton, 
                    ((activeTab === 'create' && !username.trim()) || 
                     (activeTab === 'join' && (!username.trim() || !roomCode.trim()))) && styles.submitButtonDisabled
                  ]} 
                  onPress={activeTab === 'create' ? createRoom : joinRoom}
                  disabled={(activeTab === 'create' && !username.trim()) || (activeTab === 'join' && (!username.trim() || !roomCode.trim()))}
                >
                  <Ionicons 
                    name={activeTab === 'create' ? 'add-circle' : 'enter'} 
                    size={24} 
                    color="#fff" 
                  />
                  <Text style={styles.submitButtonText}>
                    {activeTab === 'create' ? 'Create' : 'Join'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}
        </View>
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
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)'
  },
  // fog removed
  splashContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  splashTitle: {
    fontSize: 68,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  splashSubtitle: {
    fontSize: 32,
    fontWeight: '300',
    color: '#c7c9cc',
    textAlign: 'center',
    marginBottom: 320,
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  formContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 90,
    paddingBottom: 40,
  },
  cardsContainerFull: {
    flex: 1,
    gap: 0,
  },
  actionCardFull: {
    flex: 1,
    backgroundColor: 'rgba(32, 33, 36, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTouchable: {
    flex: 1,
  },
  actionCardNoBorder: {
    borderWidth: 0,
  },
  cardImage: {
    flex: 1,
  },
  cardImageRadius: {
    // üst kart ve alt kart için radius yok; fullscreen etkisi için düz bırak
  },
  bwMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    // siyah-beyaz için üstte gri bir overlay kullanıyoruz
    // grayscale efekti RN'de direkt yok; bu nedenle koyu overlay ile taklit
    // kart genişlerken opacity 0'a iniyor
  },
  cardContentFull: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  cardTitleFull: {
    color: '#e8eaed',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  cardSubtitleFull: {
    color: '#9aa0a6',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  formHeader: {
    marginBottom: 24,
  },
  formTitle: {
    color: '#e8eaed',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    color: '#e8eaed',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1,
    color: '#e8eaed',
    fontSize: 16,
    marginLeft: 12,
  },
  capacityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  capacityButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  capacityButtonActive: {
    backgroundColor: '#6c5ce7',
    borderColor: '#6c5ce7',
  },
  capacityText: {
    color: '#9aa0a6',
    fontSize: 24,
    fontWeight: '700',
  },
  capacityTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#6c5ce7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.5)',
    shadowColor: '#6c5ce7',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#4a4a4a',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  settingsButton: {
    position: 'absolute',
    top: 20,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  headerBackButton: {
    position: 'absolute',
    top: 20,
    left: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  expandOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});