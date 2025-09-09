"use client";

import { SoundType } from "@/lib/game";

const soundFiles: Record<SoundType, string> = {
  sword: '/audio/hit-sword.mp3',
  fist: '/audio/hit.mp3',
  trap: '/audio/hit.mp3',
  enemy: '/audio/hit-enemy.mp3',
};

class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private isMuted = true;
  private audioBuffers: Map<SoundType, AudioBuffer> = new Map();
  private isLoading = false;

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private async initAudioContext() {
    if (this.audioContext && this.audioContext.state === 'running') {
      return;
    }
    if (this.isLoading) return;
    this.isLoading = true;
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      await this.loadAllSounds();
    } catch (e) {
      console.error("Web Audio API is not supported or could not be initialized.", e);
      this.audioContext = null;
    } finally {
      this.isLoading = false;
    }
  }

  private async loadSound(type: SoundType, url: string): Promise<void> {
    if (!this.audioContext || this.audioBuffers.has(type)) {
      return;
    }
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(type, audioBuffer);
    } catch (e) {
      console.error(`Failed to load sound: ${type}`, e);
    }
  }

  private async loadAllSounds() {
    const promises: Promise<void>[] = [];
    for (const key in soundFiles) {
      const type = key as SoundType;
      promises.push(this.loadSound(type, soundFiles[type]));
    }
    await Promise.all(promises);
  }

  public async playSound(type: SoundType) {
    if (this.isMuted || !this.audioContext || !this.audioBuffers.has(type)) {
      return;
    }
    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = this.audioBuffers.get(type)!;
      source.connect(this.audioContext.destination);
      source.start(0);
    } catch (e) {
      console.error(`Error playing sound: ${type}`, e);
    }
  }

  public async toggleMute(): Promise<boolean> {
    this.isMuted = !this.isMuted;
    if (!this.isMuted && !this.audioContext) {
      await this.initAudioContext();
    } else if (!this.isMuted && this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }
}

export const audioManager = AudioManager.getInstance();