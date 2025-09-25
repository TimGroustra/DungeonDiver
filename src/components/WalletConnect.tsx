import React from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Helper to truncate wallet address
const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const WalletConnect: React.FC = () => {
  const { isConnected, address, balance, isLoading, error } = useWalletStore();
  const { connectWallet, disconnectWallet } = useWallet();

  return (
    <div className="w-full space-y-2 text-center">
      <Separator className="my-2 bg-amber-800/60" />
      {isLoading ? (
        <Button disabled className="w-full bg-stone-600 text-white font-bold">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </Button>
      ) : isConnected && address ? (
        <div className="space-y-2">
          <div className="p-2 bg-green-900/50 border border-green-700 rounded-md text-sm">
            <p className="font-bold text-green-300">Wallet Connected</p>
            <p className="font-mono text-stone-300">{truncateAddress(address)}</p>
            <p className="text-amber-200">
              Eldoria NFTs: <span className="font-bold">{balance ?? '...'}</span>
            </p>
          </div>
          <Button onClick={disconnectWallet} variant="destructive" className="w-full font-bold">
            Disconnect
          </Button>
        </div>
      ) : (
        <Button onClick={connectWallet} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
          <Wallet className="mr-2 h-4 w-4" />
          Connect Wallet
        </Button>
      )}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      <Separator className="my-2 bg-amber-800/60" />
    </div>
  );
};