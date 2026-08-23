import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const PREMIUM_PRICE = 500;
const STANDARD_PRICE = 250;
const MAX_SELECTED_SEATS = 6;

function formatDate(date) {
  if (!date) return 'Date to be announced';

  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return `${minutes}:${seconds}`;
}

function getId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
}

function getSeatCategory(row) {
  return ['A', 'B'].includes(row) ? 'Premium' : 'Standard';
}

function getSeatPrice(seat) {
  return seat.price || (getSeatCategory(seat.row) === 'Premium' ? PREMIUM_PRICE : STANDARD_PRICE);
}

function SeatSelection() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = getId(user);
  const heldSeatIdsRef = useRef([]);

  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [heldSeats, setHeldSeats] = useState([]);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchSeats = useCallback(async () => {
    const response = await api.get(`/events/${eventId}/seats`);
    setSeats(response.data.seats || []);
  }, [eventId]);

  useEffect(() => {
    async function loadSeatSelection() {
      try {
        setLoading(true);
        setError('');

        const [eventResponse, seatsResponse] = await Promise.all([
          api.get(`/events/${eventId}`),
          api.get(`/events/${eventId}/seats`),
        ]);

        setEvent(eventResponse.data.event || eventResponse.data);
        setSeats(seatsResponse.data.seats || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load seat selection.');
      } finally {
        setLoading(false);
      }
    }

    loadSeatSelection();
  }, [eventId]);

  useEffect(() => {
    heldSeatIdsRef.current = heldSeats.map((seat) => seat._id);
  }, [heldSeats]);

  useEffect(() => {
    return () => {
      const seatIds = heldSeatIdsRef.current;

      if (seatIds.length === 0) return;

      api.post(`/events/${eventId}/seats/release`, { seatIds }).catch(() => {
        // Best-effort cleanup only. Navigation should not break if release fails.
      });
    };
  }, [eventId]);

  useEffect(() => {
    if (!holdExpiresAt) {
      setRemainingTime(0);
      return undefined;
    }

    const updateRemainingTime = () => {
      const millisecondsLeft = new Date(holdExpiresAt).getTime() - Date.now();

      if (millisecondsLeft <= 0) {
        setRemainingTime(0);
        setSelectedSeatIds([]);
        setHeldSeats([]);
        setHoldExpiresAt(null);
        setNotice('Your seat hold has expired');
        fetchSeats().catch(() => {
          setError('Unable to refresh seats after the hold expired.');
        });
        return;
      }

      setRemainingTime(millisecondsLeft);
    };

    updateRemainingTime();
    const timerId = window.setInterval(updateRemainingTime, 1000);

    return () => window.clearInterval(timerId);
  }, [fetchSeats, holdExpiresAt]);

  const seatsByRow = useMemo(() => {
    return seats.reduce((rows, seat) => {
      const rowName = seat.row || 'Other';

      if (!rows[rowName]) {
        rows[rowName] = [];
      }

      rows[rowName].push(seat);
      rows[rowName].sort((firstSeat, secondSeat) => firstSeat.column - secondSeat.column);

      return rows;
    }, {});
  }, [seats]);

  const selectedSeats = useMemo(() => {
    return seats.filter((seat) => selectedSeatIds.includes(seat._id));
  }, [seats, selectedSeatIds]);

  const totalPrice = useMemo(() => {
    return selectedSeats.reduce((total, seat) => total + getSeatPrice(seat), 0);
  }, [selectedSeats]);

  const getSeatState = (seat) => {
    const selected = selectedSeatIds.includes(seat._id);
    const heldByCurrentUser = userId && getId(seat.heldBy) === userId;

    if (selected) return 'selected';
    if (seat.status === 'booked') return 'booked';
    if (seat.status === 'held' && !heldByCurrentUser) return 'held';
    if (seat.status === 'held' && heldByCurrentUser) return 'own-held';

    return 'available';
  };

  const handleSeatClick = (seat) => {
    setNotice('');
    setError('');

    setSelectedSeatIds((currentSeatIds) => {
      if (currentSeatIds.includes(seat._id)) {
        return currentSeatIds.filter((seatId) => seatId !== seat._id);
      }

      if (getSeatState(seat) !== 'available') {
        return currentSeatIds;
      }

      if (currentSeatIds.length >= MAX_SELECTED_SEATS) {
        setNotice('You can select a maximum of 6 seats.');
        return currentSeatIds;
      }

      return [...currentSeatIds, seat._id];
    });
  };

  const handleHoldSeats = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setHolding(true);
      setError('');
      setNotice('');

      const response = await api.post(`/events/${eventId}/seats/hold`, {
        seatIds: selectedSeatIds,
      });

      setHeldSeats(response.data.heldSeats || []);
      setHoldExpiresAt(response.data.holdExpiresAt);
      setNotice(response.data.message || 'Seats held successfully');
      await fetchSeats();
    } catch (err) {
      if (err.response?.status === 409) {
        setNotice('One or more selected seats are no longer available.');
        setSelectedSeatIds([]);
        setHeldSeats([]);
        setHoldExpiresAt(null);
        await fetchSeats();
        return;
      }

      setError(err.response?.data?.message || 'Unable to hold seats. Please try again.');
    } finally {
      setHolding(false);
    }
  };

  const handleCancelSelection = async () => {
    const seatIdsToRelease = heldSeats.map((seat) => seat._id);

    try {
      setReleasing(true);
      setError('');

      if (seatIdsToRelease.length > 0) {
        await api.post(`/events/${eventId}/seats/release`, {
          seatIds: seatIdsToRelease,
        });
      }

      setSelectedSeatIds([]);
      setHeldSeats([]);
      setHoldExpiresAt(null);
      setNotice('Selection cancelled.');
      await fetchSeats();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to cancel selection.');
    } finally {
      setReleasing(false);
    }
  };

  if (loading) {
    return <p className="state-message page">Loading seat map...</p>;
  }

  if (error && !event) {
    return <p className="state-message error page">{error}</p>;
  }

  return (
    <main className="page seat-page">
      <Link className="back-link" to={`/events/${eventId}`}>
        Back to event
      </Link>

      <section className="seat-header">
        <div>
          <p className="eyebrow">Seat selection</p>
          <h1>{event?.title || 'Choose your seats'}</h1>
          <p>
            {event?.venue || 'Venue to be announced'} · {formatDate(event?.date)} ·{' '}
            {event?.time || 'Time to be announced'}
          </p>
        </div>

        {holdExpiresAt && (
          <div className="hold-timer">
            <span>Hold expires in</span>
            <strong>{formatCountdown(remainingTime)}</strong>
          </div>
        )}
      </section>

      {error && <p className="form-error">{error}</p>}
      {notice && <p className="seat-notice">{notice}</p>}

      <div className="seat-content">
        <section className="seat-map-panel">
          <div className="screen-stage">
            <span>Screen / Stage</span>
          </div>

          <div className="seat-legend">
            <span><i className="legend-dot available" />Available</span>
            <span><i className="legend-dot selected" />Selected</span>
            <span><i className="legend-dot held" />Held/Unavailable</span>
            <span><i className="legend-dot booked" />Booked</span>
          </div>

          <div className="price-legend">
            <span>Premium ₹500</span>
            <span>Standard ₹250</span>
          </div>

          <div className="seat-grid" aria-label="Seat map">
            {['A', 'B', 'C', 'D', 'E'].map((rowName) => (
              <div className="seat-row" key={rowName}>
                <span className="row-label">
                  {rowName}
                  <small>{getSeatCategory(rowName)}</small>
                </span>

                <div className="seat-row-buttons">
                  {(seatsByRow[rowName] || []).map((seat) => {
                    const seatState = getSeatState(seat);
                    const disabled = seatState !== 'available' && seatState !== 'selected';

                    return (
                      <button
                        className={`seat-button ${seatState}`}
                        type="button"
                        key={seat._id}
                        disabled={disabled}
                        onClick={() => handleSeatClick(seat)}
                        title={`${seat.seatNumber} - ${seatState}`}
                      >
                        {seat.seatNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="booking-summary">
          <h2>Selection summary</h2>

          {selectedSeats.length > 0 ? (
            <div className="selected-list">
              {selectedSeats.map((seat) => (
                <div className="selected-seat" key={seat._id}>
                  <span>{seat.seatNumber}</span>
                  <small>{getSeatCategory(seat.row)}</small>
                  <strong>₹{getSeatPrice(seat)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-selection">No seats selected yet.</p>
          )}

          <div className="summary-total">
            <span>Total</span>
            <strong>₹{totalPrice}</strong>
          </div>

          <button
            className="btn btn-primary full-width"
            type="button"
            disabled={selectedSeatIds.length === 0 || holding}
            onClick={handleHoldSeats}
          >
            {holding ? 'Holding seats...' : 'Hold Seats'}
          </button>

          <button
            className="btn btn-outline full-width"
            type="button"
            disabled={(selectedSeatIds.length === 0 && heldSeats.length === 0) || releasing}
            onClick={handleCancelSelection}
          >
            {releasing ? 'Cancelling...' : 'Cancel Selection'}
          </button>
        </aside>
      </div>
    </main>
  );
}

export default SeatSelection;
