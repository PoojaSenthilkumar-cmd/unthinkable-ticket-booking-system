import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';

function formatDate(date) {
  if (!date) return 'Date to be announced';

  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getOrganiserName(organiser) {
  if (!organiser) return 'TicketSphere partner';
  if (typeof organiser === 'string') return organiser;
  return organiser.name || 'TicketSphere partner';
}

function EventDetails() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchEvent() {
      try {
        const response = await api.get(`/events/${id}`);
        setEvent(response.data.event || response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load event details.');
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [id]);

  if (loading) {
    return <p className="state-message page">Loading event details...</p>;
  }

  if (error) {
    return <p className="state-message error page">{error}</p>;
  }

  if (!event) {
    return <p className="state-message page">Event not found.</p>;
  }

  return (
    <main className="page">
      <Link className="back-link" to="/">
        Back to events
      </Link>

      <section className="details-panel">
        <span className="event-type">{event.type || 'Event'}</span>
        <h1>{event.title}</h1>
        <p className="description">
          {event.description || 'More details will be announced soon.'}
        </p>

        <div className="details-grid">
          <div>
            <span>Venue</span>
            <strong>{event.venue}</strong>
          </div>
          <div>
            <span>Date</span>
            <strong>{formatDate(event.date)}</strong>
          </div>
          <div>
            <span>Time</span>
            <strong>{event.time || 'Time to be announced'}</strong>
          </div>
          <div>
            <span>Organiser</span>
            <strong>{getOrganiserName(event.organiser || event.organizer)}</strong>
          </div>
        </div>

        <Link className="btn btn-primary select-seats" to={`/events/${id}/seats`}>
          Select Seats
        </Link>
      </section>
    </main>
  );
}

export default EventDetails;
