"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const Index = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [scoreTime, setScoreTime] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [deaths, setDeaths] = useState(0);
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
      toast.error("Error fetching leaderboard: " + error.message);
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
      toast.error("Error fetching ETN leaderboard: " + error.message);
    } else {
      setEtnLeaderboard(data);
    }
  };

  const handleSubmitLeaderboard = async () => {
    if (!playerName || !scoreTime) {
      toast.error("Player Name and Score Time are required.");
      return;
    }
    const { error } = await supabase
      .from('leaderboard')
      .insert([{ player_name: playerName, score_time: parseFloat(scoreTime), deaths: deaths }]);
    if (error) {
      toast.error("Error submitting leaderboard entry: " + error.message);
    } else {
      toast.success("Leaderboard entry submitted successfully!");
      fetchLeaderboard();
      setPlayerName('');
      setScoreTime('');
      setDeaths(0);
    }
  };

  const handleSubmitEtnLeaderboard = async () => {
    if (!walletAddress || !scoreTime) {
      toast.error("Wallet Address and Score Time are required.");
      return;
    }
    const { error } = await supabase
      .from('etn_leaderboard')
      .insert([{ wallet_address: walletAddress, score_time: parseFloat(scoreTime) }]);
    if (error) {
      toast.error("Error submitting ETN leaderboard entry: " + error.message);
    } else {
      toast.success("ETN Leaderboard entry submitted successfully!");
      fetchEtnLeaderboard();
      setWalletAddress('');
      setScoreTime('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background elements for visual flair */}
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500 rounded-full mix-blend-lighten filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-yellow-500 rounded-full mix-blend-lighten filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-pink-500 rounded-full mix-blend-lighten filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl">
        <div className="flex flex-col items-center text-center">
          <h1
            className="font-cinzel text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 mb-6"
            style={{ textShadow: "4px 4px 16px rgba(0,0,0,0.9)", transform: "translateY(-2cm)" }}
          >
            ETERNAL GATES
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl">
            A thrilling adventure awaits. Conquer the gates, defeat your foes, and etch your name in history.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {/* Leaderboard Section */}
          <div className="bg-gray-800 bg-opacity-70 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-gray-700">
            <h2 className="text-3xl font-bold text-yellow-400 mb-4">Leaderboard</h2>
            <ul className="space-y-2 mb-6">
              {leaderboard.length > 0 ? (
                leaderboard.map((entry, index) => (
                  <li key={entry.id} className="flex justify-between items-center bg-gray-700 bg-opacity-50 p-3 rounded-md">
                    <span className="font-medium text-lg">{index + 1}. {entry.player_name}</span>
                    <span className="text-yellow-300">{entry.score_time}s ({entry.deaths} deaths)</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-400">No entries yet. Be the first!</li>
              )}
            </ul>

            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded">
                  Submit Score
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-yellow-400">Submit Your Score</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Enter your player name, score time, and number of deaths to join the leaderboard.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="playerName" className="text-right text-gray-300">
                      Player Name
                    </Label>
                    <Input
                      id="playerName"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="col-span-3 bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="scoreTime" className="text-right text-gray-300">
                      Score Time (s)
                    </Label>
                    <Input
                      id="scoreTime"
                      type="number"
                      value={scoreTime}
                      onChange={(e) => setScoreTime(e.target.value)}
                      className="col-span-3 bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="deaths" className="text-right text-gray-300">
                      Deaths
                    </Label>
                    <Input
                      id="deaths"
                      type="number"
                      value={deaths}
                      onChange={(e) => setDeaths(parseInt(e.target.value))}
                      className="col-span-3 bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleSubmitLeaderboard} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                    Submit Score
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* ETN Leaderboard Section */}
          <div className="bg-gray-800 bg-opacity-70 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-gray-700">
            <h2 className="text-3xl font-bold text-purple-400 mb-4">ETN Leaderboard</h2>
            <ul className="space-y-2 mb-6">
              {etnLeaderboard.length > 0 ? (
                etnLeaderboard.map((entry, index) => (
                  <li key={entry.id} className="flex justify-between items-center bg-gray-700 bg-opacity-50 p-3 rounded-md">
                    <span className="font-medium text-lg">{index + 1}. {entry.wallet_address.substring(0, 6)}...{entry.wallet_address.substring(entry.wallet_address.length - 4)}</span>
                    <span className="text-purple-300">{entry.score_time}s</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-400">No ETN entries yet. Be the first!</li>
              )}
            </ul>

            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                  Submit ETN Score
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-purple-400">Submit Your ETN Score</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Enter your wallet address and score time to join the ETN leaderboard.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="walletAddress" className="text-right text-gray-300">
                      Wallet Address
                    </Label>
                    <Input
                      id="walletAddress"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="col-span-3 bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="etnScoreTime" className="text-right text-gray-300">
                      Score Time (s)
                    </Label>
                    <Input
                      id="etnScoreTime"
                      type="number"
                      value={scoreTime}
                      onChange={(e) => setScoreTime(e.target.value)}
                      className="col-span-3 bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleSubmitEtnLeaderboard} className="bg-purple-600 hover:bg-purple-700 text-white">
                    Submit ETN Score
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;