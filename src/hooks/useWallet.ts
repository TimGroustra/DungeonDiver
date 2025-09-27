import { useEffect } from 'react';
import { ethers } from 'ethers';
import { useWalletStore, NftToken } from '@/stores/walletStore';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client

// Contract and Network Configuration
const CONTRACT_ADDRESS = '0xcff0d88Ed5311bAB09178b6ec19A464100880984';
const CONTRACT_ABI = [{"inputs":[{"internalType":"uint256","name":"_initialMintPrice","type":"uint256"},{"internalType":"uint256","name":"_maxSupply","type":"uint256"},{"internalType":"address","name":"initialOwner","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"ERC721EnumerableForbiddenBatchMint","type":"error"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"address","name":"owner","type":"address"}],"name":"ERC721IncorrectOwner","type":"error"},{"inputs":[{"internalType":"address","name":"operator","internalType":"address"},{"internalType":"uint256","name":"tokenId","internalType":"uint256"}],"name":"ERC721InsufficientApproval","type":"error"},{"inputs":[{"internalType":"address","name":"approver","type":"address"}],"name":"ERC721InvalidApprover","type":"error"},{"inputs":[{"internalType":"address","name":"operator","type":"address"}],"name":"ERC721InvalidOperator","type":"error"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"ERC721InvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"}],"name":"ERC721InvalidReceiver","type":"error"},{"inputs":[{"internalType":"address","name":"sender","type":"address"}],"name":"ERC721InvalidSender","type":"error"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ERC721NonexistentToken","type":"error"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"ERC721OutOfBoundsIndex","type":"error"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"MintPriceChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bool","name":"isMintable","type":"bool"}],"name":"MintableStatusChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","internalType":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"baseTokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"quantity","type":"uint256"}],"name":"canMint","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"isMintable","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"maxSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"quantity","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"mintPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"mintableCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"remainingSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"safeMint","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_newMintPrice","type":"uint256"}],"name":"setMintPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"_isMintable","type":"bool"}],"name":"setMintable","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenOfOwnerByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"newBaseURI","type":"string"}],"name":"updateBaseURI","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}];
const ELECTRONEUM_NETWORK = {
  chainId: '0xCB2E', // 52014
  chainName: 'Electroneum',
  nativeCurrency: {
    name: 'Electroneum',
    symbol: 'ETN',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.ankr.com/electroneum'],
  blockExplorerUrls: ['https://blockexplorer.electroneum.com'],
};

// Helper to get the injected provider (e.g., MetaMask)
const getProvider = () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
};

export const useWallet = () => {
  const {
    setConnection,
    setBalance,
    setIsLoading,
    setError,
    reset,
    setTokens,
  } = useWalletStore();

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      // MetaMask is locked or the user has disconnected all accounts
      disconnectWallet(); // This will show the "Wallet disconnected" toast
    } else {
      // User switched accounts, let's reconnect with the new one
      connectWallet();
    }
  };

  const handleChainChanged = () => {
    // A chain change can be disruptive, reloading the app is the simplest way
    // to ensure a clean state.
    toast.info('Network changed. Reloading...');
    window.location.reload();
  };

  useEffect(() => {
    const ethereum = window.ethereum;
    if (ethereum) {
      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);

      // On initial load, check if already connected
      const checkConnection = async () => {
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          connectWallet();
        }
      };
      checkConnection();
    }

    return () => {
      if (ethereum) {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
        ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const switchOrAddNetwork = async (provider: ethers.BrowserProvider): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      await provider.send('wallet_switchEthereumChain', [{ chainId: ELECTRONEUM_NETWORK.chainId }]);
      return { success: true, message: 'Switched to Electroneum network.' };
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await provider.send('wallet_addEthereumChain', [ELECTRONEUM_NETWORK]);
          return { success: true, message: 'Electroneum network added and selected.' };
        } catch (addError: any) {
          return { success: false, error: addError.message || 'Failed to add Electroneum network.' };
        }
      }
      return { success: false, error: switchError.message || 'Failed to switch network.' };
    }
  };

  const connectWallet = async () => {
    setIsLoading(true);
    setError(null);
    setTokens([]);

    const provider = getProvider();
    if (!provider) {
      setError('Wallet not found. Please install MetaMask.');
      toast.error('Wallet not found. Please install MetaMask.');
      setIsLoading(false);
      return;
    }

    let finalMessage = 'Wallet connected successfully.';
    let isError = false;

    try {
      // 1. Request account access
      const accounts = await provider.send('eth_requestAccounts', []);
      const address = accounts[0];

      // 2. Check and switch network if necessary
      const network = await provider.getNetwork();
      if (network.chainId.toString() !== parseInt(ELECTRONEUM_NETWORK.chainId, 16).toString()) {
        const networkSwitchResult = await switchOrAddNetwork(provider);
        if (!networkSwitchResult.success) {
          isError = true;
          finalMessage = networkSwitchResult.error || 'Failed to switch network.';
          return; // Exit early if network switch fails
        }
        if (networkSwitchResult.message) {
          finalMessage += ` ${networkSwitchResult.message}`;
        }
      }

      // 3. Authenticate with Supabase via Edge Function
      const { data: authData, error: authError } = await supabase.functions.invoke('auth-wallet', {
        body: { wallet_address: address },
      });

      if (authError) {
        console.error("Error from auth-wallet Edge Function:", authError);
        throw new Error(`Authentication failed: ${authError.message}`);
      }

      const { access_token } = authData;

      // Sign in with the ID token received from the Edge Function
      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: 'jwt',
        token: access_token,
      });

      if (signInError) {
        console.error("Error signing in with ID token:", signInError);
        throw new Error(`Failed to sign in with Supabase: ${signInError.message}`);
      }

      // 4. Fetch NFT balance
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const balanceBigInt = await contract.balanceOf(address);
      const balance = Number(balanceBigInt);

      // 5. Update store
      setConnection(true, address);
      setBalance(balance);

      // 6. If balance > 0, fetch all token details
      if (balance > 0) {
        try {
          const tokenPromises = Array.from({ length: balance }, (_, i) =>
            (async (): Promise<NftToken | null> => {
              try {
                const tokenId = await contract.tokenOfOwnerByIndex(address, i);
                const tokenURI = await contract.tokenURI(tokenId);

                let metadataUrl = tokenURI;
                if (metadataUrl.startsWith('ipfs://')) {
                  metadataUrl = `https://ipfs.io/ipfs/${metadataUrl.substring(7)}`;
                }

                const metadataResponse = await fetch(metadataUrl);
                if (!metadataResponse.ok) {
                  console.error(`Failed to fetch metadata for token ${tokenId} from ${metadataUrl}`);
                  return null;
                }
                const metadata = await metadataResponse.json();

                let imageUrl = metadata.image;
                if (imageUrl.startsWith('ipfs://')) {
                  imageUrl = `https://ipfs.io/ipfs/${imageUrl.substring(7)}`;
                }

                return {
                  id: tokenId.toString(),
                  name: metadata.name,
                  description: metadata.description,
                  image: imageUrl,
                };
              } catch (e) {
                console.error(`Error processing token at index ${i}:`, e);
                return null;
              }
            })(),
          );

          const tokens = (await Promise.all(tokenPromises)).filter((t): t is NftToken => t !== null);
          setTokens(tokens);
          if (tokens.length > 0) {
            finalMessage += ` Found ${tokens.length} ElectroGem(s).`;
          } else if (balance > 0) {
            isError = true;
            finalMessage += " (Failed to load ElectroGem metadata.)";
          }
        } catch (tokenError: any) {
          console.error("Error fetching token details:", tokenError);
          isError = true;
          finalMessage += ` (Failed to load ElectroGem details: ${tokenError.message})`;
        }
      }
    } catch (err: any) {
      isError = true;
      finalMessage = err.message || 'An unknown error occurred during connection.';
      setError(finalMessage);
      reset();
    } finally {
      setIsLoading(false);
      if (isError) {
        toast.error(finalMessage);
      } else {
        toast.success(finalMessage);
      }
    }
  };

  const disconnectWallet = async () => {
    await supabase.auth.signOut(); // Sign out from Supabase
    reset();
    toast.info('Wallet disconnected.');
  };

  return { connectWallet, disconnectWallet };
};