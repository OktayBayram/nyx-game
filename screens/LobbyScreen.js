import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LobbyScreen({ route, navigation }) {
  const { socket, roomCode, username, isHost, capacity, room } = route.params;
  const [players, setPlayers] = useState(room?.players || []);
  const [gameStarted, setGameStarted] = useState(false);

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
    };
  }, []);

  const startGame = async () => {
    console.log('LobbyScreen: startGame called by', username, 'for room', roomCode);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    socket.emit('startGame', { roomCode });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.lobbyCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Lobby</Text>
          <View style={styles.codeChip}>
            <Ionicons name="key-outline" size={14} color="#c7c9cc" />
            <Text style={styles.codeText}>{roomCode}</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>Oyuncular ({players.length}{(capacity || route.params?.capacity) ? ` / ${capacity || route.params?.capacity}` : ''})</Text>

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
              </View>
            );
          }}
        />
      </View>

      {isHost ? (
        <TouchableOpacity 
          style={[styles.button, (((capacity || route.params?.capacity) ? players.length < (capacity || route.params?.capacity) : players.length < 2)) && styles.buttonDisabled]}
          onPress={startGame}
          disabled={((capacity || route.params?.capacity) ? players.length < (capacity || route.params?.capacity) : players.length < 2)}
        >
          <Text style={styles.buttonText}>
            {(((capacity || route.params?.capacity) ? players.length < (capacity || route.params?.capacity) : players.length < 2)) ? 'Yeterli oyuncu bekleniyor' : 'Oyunu Başlat'}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.waitingBox}>
          <Ionicons name="timer-outline" size={16} color="#9aa0a6" style={{ marginRight: 8 }} />
          <Text style={styles.waitingText}>Host oyunu başlatacak...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  lobbyCard: {
    backgroundColor: '#202124',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    color: '#e8eaed',
    fontWeight: '700',
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  codeText: {
    color: '#e8eaed',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginLeft: 6,
  },
  subtitle: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 15,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202124',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
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
    fontSize: 18,
    color: '#e8eaed',
    flex: 1,
  },
  hostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6c5ce7',
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
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#444',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  waitingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  waitingText: {
    color: '#9aa0a6',
    fontSize: 14,
    textAlign: 'center',
  }
});