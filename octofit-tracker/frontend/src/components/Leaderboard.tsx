import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type LeaderboardRow = { teamName?: string; totalPoints?: number; rank?: number };

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadLeaderboard() {
      setLoading(true);
      setError(null);

      try {
        const response = await getJson<{ leaderboard: LeaderboardRow[] }>('/api/leaderboard');
        if (active) setLeaderboard(response.leaderboard ?? []);
      } catch {
        if (active) setError('Unable to load leaderboard.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadLeaderboard();
    return () => { active = false; };
  }, []);

  if (loading) {
    return <section><h2>Leaderboard</h2><p role="status">Loading leaderboard...</p></section>;
  }

  if (error) {
    return <section><h2>Leaderboard</h2><p role="alert">{error}</p></section>;
  }

  if (leaderboard.length === 0) {
    return <section><h2>Leaderboard</h2><p>No leaderboard</p></section>;
  }

  return <section><h2>Leaderboard</h2><ol>{leaderboard.map((entry, index) => <li key={`${entry.teamName ?? 'team'}-${index}`}>{entry.teamName ?? 'Team'}: {entry.totalPoints ?? 0} pts (rank {entry.rank ?? index + 1})</li>)}</ol></section>;
}
