import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, ImageBackground, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LobbyScreen({ route, navigation }) {
  const { socket, roomCode, username, isHost, capacity, room } = route.params;
  const [players, setPlayers] = useState(room?.players || []);
  const [gameStarted, setGameStarted] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [readyInfo, setReadyInfo] = useState({ ready: 0, total: (capacity || room?.players?.length || 0) });
  const [countdown, setCountdown] = useState(null);
  // Home (splash) ekranındaki görsel ile aynı BG
  const BG_URL = 'https://img.freepik.com/free-photo/halloween-day-celebration-with-costume_23-2151880079.jpg?semt=ais_hybrid&w=740&q=80';

  const colorPalette = useMemo(() => ['#8ab4f8','#f28b82','#fdd663','#81c995','#cf9ef1','#f6a5c0','#78d9ec'], []);
  const colorFor = (name) => {
    if (!name || !name.length) return '#5f6368';
    const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
    return colorPalette[code % colorPalette.length];
  };

  useEffect(() => {
    console.log('LobbyScreen: Setting up socket listeners for', username);
    console.log('LobbyScreen: Socket connected?', socket.connected);
    
    socket.on('connect', () => {
      console.log('LobbyScreen: Socket connected for', username);
    });
    
    socket.on('disconnect', () => {
      console.log('LobbyScreen: Socket disconnected for', username);
    });
    socket.on('readyUpdate', ({ ready, total }) => {
      setReadyInfo({ ready, total });
    });

    socket.on('kicked', () => {
      Alert.alert('Removed', 'You were removed by the host.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    });

    socket.on('countdown', ({ seconds }) => {
      setCountdown(seconds);
    });
    
    socket.on('playerJoined', ({ room }) => {
      console.log('LobbyScreen: playerJoined event received', room);
      setPlayers(room.players);
      if (room.capacity) setGameStarted(room.gameStarted || false);
    });

    socket.on('playerLeft', ({ room }) => {
      console.log('LobbyScreen: playerLeft event received', room);
      setPlayers(room.players);
    });

    socket.on('gameStarted', () => {
      console.log('LobbyScreen: gameStarted event received for', username);
      setGameStarted(true);
      navigation.navigate('Game', { socket, roomCode, username });
    });

    return () => {
      console.log('LobbyScreen: Cleaning up socket listeners for', username);
      socket.off('playerJoined');
      socket.off('playerLeft');
      socket.off('gameStarted');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('readyUpdate');
      socket.off('countdown');
      socket.off('kicked');
    };
  }, []);

  const startGame = async () => {
    console.log('LobbyScreen: startGame called by', username, 'for room', roomCode);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    socket.emit('startGame', { roomCode });
  };

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    const msg = { id: `${Date.now()}-${Math.random()}`, user: username, text, time: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, msg]);
    try { socket.emit('lobbyChat', { roomCode, user: username, text: msg.text, time: msg.time }); } catch {}
    setChatInput('');
  };

  const toggleReady = () => {
    const next = !isReady;
    setIsReady(next);
    try { socket.emit('ready', { roomCode, ready: next }); } catch {}
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar style="light" hidden={true} />
      <ImageBackground source={{ uri: BG_URL }} style={styles.bg} resizeMode="cover" blurRadius={1}>
        <View style={styles.bgOverlay} />
        {/* Fixed Back Button */}
        <TouchableOpacity style={styles.headerBackButton} onPress={() => {
          Alert.alert('Are you sure?', 'Do you want to leave the lobby?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Confirm', style: 'destructive', onPress: () => { try { socket.emit('leaveRoom', { roomCode }); } catch(e){}; navigation.goBack(); } },
          ]);
        }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.pageContent}>
        <View style={styles.lobbyCard}>
        <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Lobby</Text>
          <View style={styles.codeChip}>
            <Ionicons name="key-outline" size={14} color="#c7c9cc" />
            <Text style={styles.codeText}>{roomCode}</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>Players ({players.length}{(capacity || route.params?.capacity) ? ` / ${capacity || route.params?.capacity}` : ''}) • Ready {readyInfo.ready}/{readyInfo.total}</Text>

        <FlatList
          data={players}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => {
            const isHostItem = !!item.isHost;
            return (
              <View style={styles.playerItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.avatar, { backgroundColor: colorFor(item.username) }]}> 
                    <Text style={styles.avatarText}>{(item.username || '?').slice(0,1).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.playerName}>{item.username}</Text>
                </View>
                {isHostItem && (
                  <View style={styles.hostPill}>
                    <Text style={styles.hostBadge}>HOST</Text>
                  </View>
                )}
                {!isHostItem && isHost && (
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert('Kick player?', `Remove ${item.username} from lobby?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Kick', style: 'destructive', onPress: () => socket.emit('kick', { roomCode, targetId: item.id }) }
                      ]);
                    }}
                    style={styles.kickBtn}
                  >
                    <Ionicons name="close-circle" size={18} color="#ff6b6b" />
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
        </View>

      {isHost ? (
          <TouchableOpacity 
            style={[styles.button, (countdown !== null || (((capacity || route.params?.capacity) ? players.length < (capacity || route.params?.capacity) : players.length < 2))) && styles.buttonDisabled]}
            onPress={startGame}
            disabled={countdown !== null || ((capacity || route.params?.capacity) ? players.length < (capacity || route.params?.capacity) : players.length < 2)}
          >
            <Text style={styles.buttonText}>
              {countdown !== null ? `Starting in ${countdown}` : ((((capacity || route.params?.capacity) ? players.length < (capacity || route.params?.capacity) : players.length < 2)) ? 'Waiting for players' : 'Start Game')}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.waitingBox}>
            <Ionicons name="timer-outline" size={16} color="#9aa0a6" style={{ marginRight: 8 }} />
          <Text style={styles.waitingText}>Host will start the game...</Text>
          </View>
        )}

        {/* Ready toggle - only for non-host players */}
        {!isHost && (
          <TouchableOpacity style={[styles.readyBtn, isReady && styles.readyBtnOn]} onPress={toggleReady}>
            <Text style={[styles.readyText, isReady && styles.readyTextOn]}>{isReady ? 'Ready ✓' : 'I\'m Ready'}</Text>
          </TouchableOpacity>
        )}

        {/* Chat FAB */}
        <TouchableOpacity style={styles.chatFab} onPress={() => setShowChat(true)}>
          <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Lobby Chat Modal/Panel */}
        <Modal visible={showChat} animationType="slide" transparent onRequestClose={() => setShowChat(false)}>
          <View style={styles.chatOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.chatPanel}>
              <View style={styles.chatPanelHeader}>
                <Text style={styles.chatTitle}>Lobby Chat</Text>
                <TouchableOpacity onPress={() => setShowChat(false)}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 12, paddingHorizontal: 12 }}
                style={styles.chatList}
                renderItem={({ item }) => (
                  <View style={styles.msgRow}>
                    <Text style={styles.msgUser}>{item.user}:</Text>
                    <Text style={styles.msgText}>{item.text}</Text>
                    <Text style={styles.msgTime}>{item.time}</Text>
                  </View>
                )}
              />
              <View style={[styles.chatInputRow, { paddingHorizontal: 12, paddingBottom: 12 }]}>
                <TextInput
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Type a message"
                  placeholderTextColor="#9aa0a6"
                  style={styles.chatInput}
                  onSubmitEditing={sendChat}
                  returnKeyType="send"
                />
                <TouchableOpacity style={styles.chatSendBtn} onPress={sendChat}>
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: '#0f1115',
  },
  bg: {
    flex: 1,
  },
  pageContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  chatCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginTop: 12,
  },
  chatTitle: {
    color: '#f1f3f4',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  chatList: { maxHeight: 160 },
  msgRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6, flexWrap: 'wrap' },
  msgUser: { color: '#d0d6ff', fontWeight: '700', marginRight: 6 },
  msgText: { color: '#e8eaed', flexShrink: 1 },
  msgTime: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginLeft: 6 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  chatInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#e8eaed',
  },
  chatSendBtn: {
    backgroundColor: '#6c5ce7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.4)'
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)'
  },
  lobbyCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 18,
    marginTop: 90,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    color: '#f1f3f4',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  codeText: {
    color: '#e8eaed',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    marginLeft: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#cbd1d8',
    marginBottom: 12,
    fontWeight: '600',
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)'
  },
  crownContainer: {
    position: 'absolute',
    right: -8,
    top: -8,
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    borderWidth: 0,
    zIndex: 10,
  },
  avatarText: {
    color: '#111',
    fontWeight: '800',
    fontSize: 14,
  },
  playerName: {
    fontSize: 16,
    color: '#e2e6ea',
    flex: 1,
    fontWeight: '600',
  },
  hostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 92, 231, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: -55,
  },
  hostBadge: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  button: {
    backgroundColor: '#6c5ce7',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.5)',
    shadowColor: '#6c5ce7',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  buttonDisabled: {
    backgroundColor: '#444',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kickBtn: { marginLeft: -20, marginRight: 10 },
  waitingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  waitingText: {
    color: '#9aa0a6',
    fontSize: 13,
    textAlign: 'center',
  },
  chatFab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#6c5ce7',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.5)'
  },
  chatOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  chatPanel: {
    backgroundColor: '#202124',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    minHeight: '50%',
  },
  chatPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerBackButton: {
    position: 'absolute',
    top: 20,
    left: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  readyBtn: {
    marginTop: 10,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.5)',
    backgroundColor: 'rgba(108, 92, 231, 0.15)'
  },
  readyBtnOn: {
    backgroundColor: 'rgba(108, 92, 231, 0.35)'
  },
  readyText: { color: '#d6d9ff', fontWeight: '800' },
  readyTextOn: { color: '#fff' }
});