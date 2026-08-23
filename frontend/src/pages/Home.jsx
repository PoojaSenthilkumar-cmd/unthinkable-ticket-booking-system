import { useEffect, useState } from 'react';
import api from '../api/axios';
import EventCard from '../components/EventCard';

function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await api.get('/events');
        setEvents(response.data.events || response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load events.');
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  return (
    <main className="page">
      <section className="page-heading">
        <p className="eyebrow">Book live experiences</p>
        <h1>Discover events worth showing up for.</h1>
        <p>
          Browse concerts, conferences, shows, and local experiences from one
          simple place.
        </p>
      </section>

      {loading && <p className="state-message">Loading events...</p>}
      {error && <p className="state-message error">{error}</p>}

      {!loading && !error && (
        <section className="event-grid">
          {events.length > 0 ? (
            events.map((event) => (
              <EventCard key={event._id || event.id} event={event} />
            ))
          ) : (
            <p className="state-message">No events are available yet.</p>
          )}
        </section>
      )}
    </main>
  );
}

export default Home;
