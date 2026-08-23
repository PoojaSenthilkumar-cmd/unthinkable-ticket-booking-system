import { useNavigate } from 'react-router-dom';

function formatDate(date) {
  if (!date) return 'Date to be announced';

  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function EventCard({ event }) {
  const navigate = useNavigate();
  const eventId = event._id || event.id;

  return (
    <article className="event-card">
      <div>
        <span className="event-type">{event.type || 'Event'}</span>
        <h2>{event.title}</h2>
      </div>

      <div className="event-meta">
        <p>{event.venue}</p>
        <p>
          {formatDate(event.date)} · {event.time || 'Time to be announced'}
        </p>
      </div>

      <button
        className="btn btn-primary"
        type="button"
        onClick={() => navigate(`/events/${eventId}`)}
      >
        View Details
      </button>
    </article>
  );
}

export default EventCard;
