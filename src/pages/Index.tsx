"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const Index = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [scoreTime, setScoreTime] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [etnLeaderboard, setEtnLeaderboard] = useState([]);

  useEffect(() => {
    fetchLeaderboard();
    fetchEtnLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('score_time', { ascending: true })
      .limit(10);
    if (error) {
      toast.error('Error fetching leaderboard: ' + error.message);
    } else {
      setLeaderboard(data);
    }
  };

  const fetchEtnLeaderboard = async () => {
    const { data, error } = await supabase
      .from('etn_leaderboard')
      .select('*')
      .order('score_time', { ascending: true })
      .limit(10);
    if (error) {
      toast.error('Error fetching ETN leaderboard: ' + error.message);
    } else {
      setEtnLeaderboard(data);
    }
  };

  const handleSubmitLeaderboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName || !scoreTime) {
      toast.error('Player Name and Score Time are required.');
      return;
    }

    const { error } = await supabase
      .from('leaderboard')
      .insert([{ player_name: playerName, score_time: parseFloat(scoreTime) }]);

    if (error) {
      toast.error('Error submitting score: ' + error.message);
    } else {
      toast.success('Score submitted successfully!');
      setPlayerName('');
      setScoreTime('');
      fetchLeaderboard();
    }
  };

  const handleSubmitEtnLeaderboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress || !scoreTime) {
      toast.error('Wallet Address and Score Time are required.');
      return;
    }

    const { error } = await supabase
      .from('etn_leaderboard')
      .insert([{ wallet_address: walletAddress, score_time: parseFloat(scoreTime) }]);

    if (error) {
      toast.error('Error submitting ETN score: ' + error.message);
    } else {
      toast.success('ETN Score submitted successfully!');
      setWalletAddress('');
      setScoreTime('');
      fetchEtnLeaderboard();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white font-sans relative overflow-hidden">
      {/* Background elements for visual interest */}
      <div className="absolute top-0 left-0 w-full h-full z-0 opacity-10">
        <div className="absolute w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob top-10 left-1/4"></div>
        <div className="absolute w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000 top-1/2 left-1/2"></div>
        <div className="absolute w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000 bottom-10 right-1/4"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="flex flex-col items-center text-center">
          <h1
            className="font-cinzel text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 mb-6 shadow-lg shadow-black/50"
            style={{ textShadow: "2px 2px 8px rgba(0,0,0,0.7)", transform: "translateY(-2cm)" }}
          >
            ETHEREUM NFT GAME
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl">
            Dive into the world of decentralized gaming. Collect unique NFTs, compete for high scores, and earn rewards on the Ethereum blockchain.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="text-yellow-400">Explore NFTs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">Discover rare and unique NFT assets within the game. Each NFT has special attributes.</p>
              <Link to="/nft-collections">
                <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900">View Collections</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="text-yellow-400">Compete & Earn</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">Challenge other players on the leaderboard and earn exclusive rewards.</p>
              <Link to="/game">
                <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900">Play Game</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="text-yellow-400">Creator Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">Create your own NFT collections and gates for unique experiences.</p>
              <Link to="/creator-dashboard">
                <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900">Creator Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="text-yellow-400">Submit Your Score (General)</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitLeaderboard} className="space-y-4">
                <div>
                  <Label htmlFor="playerName" className="text-gray-300">Player Name</Label>
                  <Input
                    id="playerName"
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <Label htmlFor="scoreTime" className="text-gray-300">Score Time (seconds)</Label>
                  <Input
                    id="scoreTime"
                    type="number"
                    step="0.01"
                    value={scoreTime}
                    onChange={(e) => setScoreTime(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                    placeholder="e.g., 120.50"
                  />
                </div>
                <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900">Submit Score</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="text-yellow-400">Submit Your Score (ETN)</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitEtnLeaderboard} className="space-y-4">
                <div>
                  <Label htmlFor="walletAddress" className="text-gray-300">Wallet Address</Label>
                  <Input
                    id="walletAddress"
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                    placeholder="0x..."
                  />
                </div>
                <div>
                  <Label htmlFor="etnScoreTime" className="text-gray-300">Score Time (seconds)</Label>
                  <Input
                    id="etnScoreTime"
                    type="number"
                    step="0.01"
                    value={scoreTime}
                    onChange={(e) => setScoreTime(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                    placeholder="e.g., 120.50"
                  />
                </div>
                <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900">Submit ETN Score</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="text-yellow-400">Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-gray-400">No scores yet. Be the first!</p>
              ) : (
                <ul className="space-y-2">
                  {leaderboard.map((entry: any) => (
                    <li key={entry.id} className="flex justify-between items-center text-gray-300">
                      <span>{entry.player_name}</span>
                      <span className="font-mono">{entry.score_time.toFixed(2)}s</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="text-yellow-400">ETN Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              {etnLeaderboard.length === 0 ? (
                <p className="text-gray-400">No ETN scores yet. Be the first!</p>
              ) : (
                <ul className="space-y-2">
                  {etnLeaderboard.map((entry: any) => (
                    <li key={entry.id} className="flex justify-between items-center text-gray-300">
                      <span>{entry.wallet_address.substring(0, 6)}...{entry.wallet_address.substring(entry.wallet_address.length - 4)}</span>
                      <span className="font-mono">{entry.score_time.toFixed(2)}s</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;