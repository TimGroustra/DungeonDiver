import { create } from 'zustand';

export interface NftToken {
  id: string;
  name: string;
  description: string;
  image: string;
}

interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: number | null;
  isLoading: boolean;
  error: string | null;
  tokens: NftToken[];
  selectedTokenIndex: number;
  setConnection: (isConnected: boolean, address: string | null) => void;
  setBalance: (balance: number | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setTokens: (tokens: NftToken[]) => void;
  setSelectedTokenIndex: (index: number) => void;
  reset: () => void;
}

const initialState = {
  isConnected: false,
  address: null,
  balance: null,
  isLoading: false,
  error: null,
  tokens: [],
  selectedTokenIndex: 0,
};

export const useWalletStore = create<WalletState>((set) => ({
  ...initialState,
  setConnection: (isConnected, address) => set({ isConnected, address }),
  setBalance: (balance) => set({ balance }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setTokens: (tokens) => set({ tokens, selectedTokenIndex: 0 }),
  setSelectedTokenIndex: (index) => set({ selectedTokenIndex: index }),
  reset: () => set(initialState),
}));