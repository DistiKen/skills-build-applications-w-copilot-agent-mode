import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type TeamRecord = { name?: string; members?: string[] };

export default function Teams() {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadTeams() {
      setLoading(true);
      setError(null);

      try {
        const response = await getJson<{ teams: TeamRecord[] }>('/api/teams');
        if (active) setTeams(response.teams ?? []);
      } catch {
        if (active) setError('Unable to load teams.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadTeams();
    return () => { active = false; };
  }, []);

  if (loading) {
    return <section><h2>Teams</h2><p role="status">Loading teams...</p></section>;
  }

  if (error) {
    return <section><h2>Teams</h2><p role="alert">{error}</p></section>;
  }

  if (teams.length === 0) {
    return <section><h2>Teams</h2><p>No teams</p></section>;
  }

  return <section><h2>Teams</h2><ul>{teams.map((team, index) => <li key={`${team.name ?? 'team'}-${index}`}>{team.name ?? 'Team'} ({(team.members ?? []).length} members)</li>)}</ul></section>;
}
