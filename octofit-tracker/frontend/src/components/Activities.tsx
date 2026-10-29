import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type ActivityRecord = { type?: string; minutes?: number; points?: number };

export default function Activities() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadActivities() {
      setLoading(true);
      setError(null);

      try {
        const response = await getJson<{ activities: ActivityRecord[] }>('/api/activities');
        if (active) setActivities(response.activities ?? []);
      } catch {
        if (active) setError('Unable to load activities.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadActivities();
    return () => { active = false; };
  }, []);

  if (loading) {
    return <section><h2>Activities</h2><p role="status">Loading activities...</p></section>;
  }

  if (error) {
    return <section><h2>Activities</h2><p role="alert">{error}</p></section>;
  }

  if (activities.length === 0) {
    return <section><h2>Activities</h2><p>No activities</p></section>;
  }

  return <section><h2>Activities</h2><ul>{activities.map((activity, index) => <li key={`${activity.type ?? 'activity'}-${index}`}>{activity.type ?? 'Activity'} ({activity.minutes ?? 0} min, {activity.points ?? 0} pts)</li>)}</ul></section>;
}
