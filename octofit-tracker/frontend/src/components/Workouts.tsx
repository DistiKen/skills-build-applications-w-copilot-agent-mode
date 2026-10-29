import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type WorkoutSuggestion = { title?: string; reason?: string; focus?: string };

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSuggestions() {
      setLoading(true);
      setError(null);

      try {
        const response = await getJson<{ suggestions: WorkoutSuggestion[] }>('/api/workouts/suggestions/mona@example.com');
        if (active) setSuggestions(response.suggestions ?? []);
      } catch {
        if (active) setError('Unable to load workout suggestions.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSuggestions();
    return () => { active = false; };
  }, []);

  if (loading) {
    return <section><h2>Workout suggestions</h2><p role="status">Loading workouts...</p></section>;
  }

  if (error) {
    return <section><h2>Workout suggestions</h2><p role="alert">{error}</p></section>;
  }

  if (suggestions.length === 0) {
    return <section><h2>Workout suggestions</h2><p>No workout suggestions</p></section>;
  }

  return <section><h2>Workout suggestions</h2><ul>{suggestions.map((suggestion, index) => <li key={`${suggestion.title ?? 'workout'}-${index}`}>{suggestion.title ?? 'Workout'} {suggestion.reason ? `- ${suggestion.reason}` : ''}</li>)}</ul></section>;
}
