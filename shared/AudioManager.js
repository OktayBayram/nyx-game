import { Audio } from 'expo-av';

let homeSound = null;
let gameSound = null;
let musicVolume = 0.7; // 0..1
let soundVolume = 0.8; // reserved for SFX

export async function playHome() {
  try {
    if (homeSound) return; // already playing
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/audio/home.mp3'),
      { isLooping: true, shouldPlay: true }
    );
    homeSound = sound;
    await sound.setVolumeAsync(musicVolume);
    await sound.playAsync();
  } catch {}
}

export async function stopHome() {
  try {
    if (homeSound) {
      await homeSound.stopAsync().catch(() => {});
      await homeSound.unloadAsync().catch(() => {});
      homeSound = null;
    }
  } catch {}
}

export async function playGame() {
  try {
    if (gameSound) return;
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/audio/game.mp3'),
      { isLooping: true, shouldPlay: true }
    );
    gameSound = sound;
    await sound.setVolumeAsync(musicVolume);
    await sound.playAsync();
  } catch {}
}

export async function stopGame() {
  try {
    if (gameSound) {
      await gameSound.stopAsync().catch(() => {});
      await gameSound.unloadAsync().catch(() => {});
      gameSound = null;
    }
  } catch {}
}

export async function setMusicVolume(v) {
  try {
    musicVolume = Math.max(0, Math.min(1, v));
    if (homeSound) await homeSound.setVolumeAsync(musicVolume);
    if (gameSound) await gameSound.setVolumeAsync(musicVolume);
  } catch {}
}

export function setSoundVolume(v) {
  soundVolume = Math.max(0, Math.min(1, v));
}


