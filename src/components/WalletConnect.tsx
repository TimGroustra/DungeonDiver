import React from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Helper to truncate wallet address
const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const WalletConnect: React.FC = () => {
  const { isConnected, address, balance, isLoading, error, tokens, selectedTokenIndex, setSelectedTokenIndex } = useWalletStore();
  const { connectWallet, disconnectWallet } = useWallet();

  const handlePrevToken = () => {
    setSelectedTokenIndex((selectedTokenIndex - 1 + tokens.length) % tokens.length);
  };

  const handleNextToken = () => {
    setSelectedTokenIndex((selectedTokenIndex + 1) % tokens.length);
  };

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
              ElectroGems: <span className="font-bold">{balance ?? '...'}</span>
            </p>
          </div>

          {tokens.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-2">
              {tokens.length > 1 && (
                <Button onClick={handlePrevToken} size="icon" variant="outline" className="bg-stone-700 border-amber-700 hover:bg-stone-600">
                  <ChevronLeft className="h-4 w-4 text-amber-300" />
                </Button>
              )}
              <div className="w-24 h-24 rounded-md overflow-hidden border-2 border-amber-500 flex-shrink-0">
                <img src={tokens[selectedTokenIndex].image} alt={tokens[selectedTokenIndex].name} className="w-full h-full object-cover" />
              </div>
              {tokens.length > 1 && (
                <Button onClick={handleNextToken} size="icon" variant="outline" className="bg-stone-700 border-amber-700 hover:bg-stone-600">
                  <ChevronRight className="h-4 w-4 text-amber-300" />
                </Button>
              )}
            </div>
          )}

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