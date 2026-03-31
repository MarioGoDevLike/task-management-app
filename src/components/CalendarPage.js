import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ChevronLeft, ChevronRight, Search, Settings, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getDb } from '../firebase/app';
import { useAuth } from '../contexts/AuthContext';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

const Container = styled.div`
  min-height: 100vh;
  background: #f5f7fb;
  padding: 8px 10px;
`;

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 10px 14px;
`;

const TopLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const TopRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AppTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  color: #374151;
`;

const CalendarBadge = styled.div`
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: linear-gradient(160deg, #4285f4, #1a73e8);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const TodayButton = styled.button`
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
  border-radius: 8px;
  height: 34px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`;

const IconButton = styled.button`
  width: 34px;
  height: 34px;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #4b5563;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

const MainTitle = styled.h2`
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: #111827;
`;

const ViewSelect = styled.select`
  height: 34px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
`;

const AddButton = styled.button`
  background: #1a73e8;
  color: #fff;
  border: none;
  border-radius: 16px;
  padding: 0 16px;
  height: 38px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(26, 115, 232, 0.24);
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 8px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const SidePanel = styled.aside`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  height: fit-content;
`;

const PanelTitle = styled.h3`
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 700;
  color: #374151;
`;

const MiniHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;

  button {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    background: #fff;
    color: #4b5563;
    cursor: pointer;
  }
`;

const MiniLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #111827;
`;

const SearchPeople = styled.button`
  margin-top: 10px;
  width: 100%;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  color: #4b5563;
  border-radius: 8px;
  height: 34px;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 0 10px;
  cursor: pointer;
`;

const Weekdays = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 6px;
  font-size: 11px;
  color: #6b7280;

  span {
    text-align: center;
  }
`;

const MiniGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
`;

const DayCell = styled.button`
  border: none;
  border-radius: 8px;
  min-height: 32px;
  background: ${(p) => (p.$isSelected ? '#1a73e8' : p.$isToday ? '#e8f0fe' : '#fff')};
  color: ${(p) => (p.$isSelected ? '#fff' : p.$isCurrentMonth ? '#111827' : '#9ca3af')};
  font-size: 12px;
  cursor: pointer;
`;

const SectionDivider = styled.div`
  height: 1px;
  background: #e5e7eb;
  margin: 12px 0;
`;

const ListSection = styled.div`
  .heading {
    font-size: 12px;
    font-weight: 700;
    color: #374151;
    margin-bottom: 8px;
  }
`;

const CalendarListItem = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #374151;
  margin-bottom: 6px;
  input {
    accent-color: #1a73e8;
  }
`;

const UpcomingList = styled.div`
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const UpcomingItem = styled.button`
  text-align: left;
  border: 1px solid #e5e7eb;
  border-left: 4px solid #1a73e8;
  background: #fff;
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;

  .t {
    font-size: 12px;
    font-weight: 700;
    color: #111827;
  }

  .d {
    font-size: 11px;
    color: #6b7280;
    margin-top: 3px;
  }
`;

const CalendarShell = styled.section`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 10px;
  min-width: 0;

  .fc {
    --fc-border-color: #e5e7eb;
    --fc-page-bg-color: #ffffff;
    --fc-today-bg-color: #e8f0fe;
    --fc-neutral-bg-color: #f8fafc;
    --fc-event-bg-color: #1a73e8;
    --fc-event-border-color: #1557b0;
    --fc-button-bg-color: #ffffff;
    --fc-button-border-color: #d1d5db;
    --fc-button-text-color: #374151;
    --fc-button-hover-bg-color: #f3f4f6;
    --fc-button-hover-border-color: #cbd5e1;
    --fc-button-active-bg-color: #e8f0fe;
    --fc-button-active-border-color: #bfdbfe;
    --fc-button-active-text-color: #1a73e8;
    font-size: 13px;
  }

  .fc .fc-toolbar.fc-header-toolbar {
    margin-bottom: 0.9rem;
  }

  .fc .fc-toolbar-title {
    font-size: 20px;
    color: #1f2937;
    font-weight: 700;
  }

  .fc .fc-button {
    border-radius: 10px;
    box-shadow: none;
    font-weight: 600;
    text-transform: capitalize;
  }

  .fc .fc-col-header-cell-cushion {
    color: #4b5563;
    font-weight: 600;
    padding: 10px 2px;
  }

  .fc-daygrid-day-number {
    color: #1f2937;
    font-weight: 500;
    padding: 6px 7px;
  }

  .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
    background: #1a73e8;
    color: #fff;
    border-radius: 999px;
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .fc .fc-event {
    border-radius: 8px;
    border-width: 1px;
    padding: 1px 4px;
    font-size: 12px;
  }

  /* Increase vertical spacing between hour slots (Google-like breathing room) */
  .fc .fc-timegrid-slot {
    height: 72px;
  }
`;

const Modal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  width: min(700px, 94vw);
  max-height: 90vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.32);
  padding: 28px;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h2 {
    margin: 0;
    font-size: 20px;
    color: #1f2937;
  }
`;

const CloseButton = styled.button`
  border: none;
  background: none;
  font-size: 30px;
  cursor: pointer;
  color: #64748b;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-weight: 600;
    color: #334155;
    font-size: 14px;
  }

  input, textarea {
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    padding: 12px 14px;
    font-size: 14px;
    font-family: inherit;
    transition: all 0.2s ease;
  }

  input:focus, textarea:focus {
    outline: none;
    border-color: #1a73e8;
    box-shadow: 0 0 0 4px rgba(26, 115, 232, 0.12);
  }
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const Btn = styled.button`
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid #e2e8f0;
  background: ${(p) => (p.primary ? '#1a73e8' : '#fff')};
  color: ${(p) => (p.primary ? '#fff' : '#334155')};
  cursor: pointer;
`;

function formatEventDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getMonthMatrix(baseDate) {
  const y = baseDate.getFullYear();
  const m = baseDate.getMonth();
  const first = new Date(y, m, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const days = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const calendarRef = useRef(null);
  const ownerId = user?._id || user?.id;
  const [meetings, setMeetings] = useState([]);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState(null);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    start: '',
    end: '',
    location: '',
    notes: '',
    allDay: false,
  });
  const [miniMonthDate, setMiniMonthDate] = useState(() => new Date());
  const [viewType, setViewType] = useState('timeGridDay');
  const [titleText, setTitleText] = useState('');

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const selectedIso = useMemo(
    () => (meetingForm.start ? meetingForm.start.slice(0, 10) : todayIso),
    [meetingForm.start, todayIso]
  );
  const miniDays = useMemo(() => getMonthMatrix(miniMonthDate), [miniMonthDate]);
  const upcomingMeetings = useMemo(() => {
    return [...meetings]
      .filter((m) => new Date(m.start).getTime() >= Date.now())
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 6);
  }, [meetings]);

  useEffect(() => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;
    setTitleText(api.view?.title || '');
  }, [viewType]);

  useEffect(() => {
    if (!ownerId) return undefined;
    const db = getDb();
    const q = query(collection(db, 'meetings'), where('ownerId', '==', ownerId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            title: data.title || '',
            start: data.start,
            end: data.end,
            allDay: !!data.allDay,
            extendedProps: {
              location: data.location || '',
              notes: data.notes || '',
            },
          });
        });
        setMeetings(list);
      },
      () => toast.error('Failed to load meetings')
    );
    return () => unsub();
  }, [ownerId]);

  const openForRange = (start, end, allDay = false) => {
    setEditingMeetingId(null);
    setMeetingForm({ title: '', start, end, location: '', notes: '', allDay });
    setShowMeetingModal(true);
  };

  const openForEvent = (event) => {
    setEditingMeetingId(event.id);
    setMeetingForm({
      title: event.title || '',
      start: event.start ? new Date(event.start).toISOString().slice(0, 16) : '',
      end: event.end ? new Date(event.end).toISOString().slice(0, 16) : '',
      location: event.extendedProps?.location || '',
      notes: event.extendedProps?.notes || '',
      allDay: !!event.allDay,
    });
    setShowMeetingModal(true);
  };

  const closeModal = () => {
    setShowMeetingModal(false);
    setEditingMeetingId(null);
  };

  const saveMeeting = async (e) => {
    e.preventDefault();
    if (!meetingForm.title.trim() || !meetingForm.start || !meetingForm.end) {
      toast.error('Please provide title, start and end time');
      return;
    }
    if (new Date(meetingForm.end) < new Date(meetingForm.start)) {
      toast.error('Meeting end time must be after start time');
      return;
    }
    const db = getDb();
    const payload = {
      title: meetingForm.title.trim(),
      start: meetingForm.start,
      end: meetingForm.end,
      allDay: !!meetingForm.allDay,
      location: meetingForm.location.trim(),
      notes: meetingForm.notes.trim(),
      ownerId,
      updatedAt: serverTimestamp(),
    };
    try {
      if (editingMeetingId) {
        await updateDoc(doc(db, 'meetings', editingMeetingId), payload);
        toast.success('Meeting updated');
      } else {
        await addDoc(collection(db, 'meetings'), { ...payload, createdAt: serverTimestamp() });
        toast.success('Meeting created');
      }
      closeModal();
    } catch {
      toast.error('Failed to save meeting');
    }
  };

  const deleteMeeting = async () => {
    if (!editingMeetingId) return;
    try {
      await deleteDoc(doc(getDb(), 'meetings', editingMeetingId));
      toast.success('Meeting deleted');
      closeModal();
    } catch {
      toast.error('Failed to delete meeting');
    }
  };

  const handleDropResize = async (changeInfo) => {
    try {
      await updateDoc(doc(getDb(), 'meetings', changeInfo.event.id), {
        start: changeInfo.event.start?.toISOString(),
        end: changeInfo.event.end?.toISOString(),
        allDay: changeInfo.event.allDay,
        updatedAt: serverTimestamp(),
      });
    } catch {
      changeInfo.revert();
      toast.error('Failed to update meeting time');
    }
  };

  const goPrev = () => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;
    api.prev();
    setTitleText(api.view?.title || '');
  };

  const goNext = () => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;
    api.next();
    setTitleText(api.view?.title || '');
  };

  const goToday = () => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;
    api.today();
    setTitleText(api.view?.title || '');
  };

  const handleViewChange = (nextView) => {
    setViewType(nextView);
    const api = calendarRef.current?.getApi?.();
    if (!api) return;
    api.changeView(nextView);
    setTitleText(api.view?.title || '');
  };

  const jumpToSelectedDayTimeline = (isoDate) => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;
    api.changeView('timeGridDay', isoDate);
    setViewType('timeGridDay');
    setTitleText(api.view?.title || '');
  };

  return (
    <Container>
      <TopBar>
        <TopLeft>
          <AppTitle>
            <CalendarBadge>31</CalendarBadge>
            Calendar
          </AppTitle>
          <TodayButton type="button" onClick={goToday}>Today</TodayButton>
          <IconButton type="button" onClick={goPrev}><ChevronLeft size={16} /></IconButton>
          <IconButton type="button" onClick={goNext}><ChevronRight size={16} /></IconButton>
          <MainTitle>{titleText}</MainTitle>
        </TopLeft>
        <TopRight>
          <IconButton type="button"><Search size={16} /></IconButton>
          <IconButton type="button"><Settings size={16} /></IconButton>
          <ViewSelect value={viewType} onChange={(e) => handleViewChange(e.target.value)}>
            <option value="dayGridMonth">Month</option>
            <option value="timeGridWeek">Week</option>
            <option value="timeGridDay">Day</option>
          </ViewSelect>
        </TopRight>
      </TopBar>

      <Layout>
        <SidePanel>
          <AddButton
            type="button"
            style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}
            onClick={() => {
              const now = new Date();
              const later = new Date(now.getTime() + 60 * 60 * 1000);
              openForRange(now.toISOString().slice(0, 16), later.toISOString().slice(0, 16), false);
            }}
          >
            <Plus size={15} />
            Create
          </AddButton>

          <MiniHeader>
            <button
              type="button"
              onClick={() =>
                setMiniMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
            >
              {"<"}
            </button>
            <MiniLabel>
              {miniMonthDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
            </MiniLabel>
            <button
              type="button"
              onClick={() =>
                setMiniMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
            >
              {">"}
            </button>
          </MiniHeader>
          <Weekdays>
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
          </Weekdays>
          <MiniGrid>
            {miniDays.map((d) => {
              const iso = d.toISOString().slice(0, 10);
              const isCurrentMonth = d.getMonth() === miniMonthDate.getMonth();
              return (
                <DayCell
                  key={iso}
                  type="button"
                  $isSelected={iso === selectedIso}
                  $isToday={iso === todayIso}
                  $isCurrentMonth={isCurrentMonth}
                  onClick={() => {
                    jumpToSelectedDayTimeline(iso);
                    setMeetingForm((prev) => ({ ...prev, start: `${iso}T09:00`, end: `${iso}T10:00` }));
                  }}
                >
                  {d.getDate()}
                </DayCell>
              );
            })}
          </MiniGrid>

          <SearchPeople type="button">
            <Search size={14} />
            Search for people
          </SearchPeople>
          <SectionDivider />
          <ListSection>
            <div className="heading">My calendars</div>
            <CalendarListItem><input type="checkbox" defaultChecked /> Mario Nassar</CalendarListItem>
            <CalendarListItem><input type="checkbox" defaultChecked /> Birthdays</CalendarListItem>
            <CalendarListItem><input type="checkbox" defaultChecked /> Tasks</CalendarListItem>
          </ListSection>
          <SectionDivider />
          <ListSection>
            <div className="heading">Other calendars</div>
            <CalendarListItem><input type="checkbox" defaultChecked /> Holidays</CalendarListItem>
            <CalendarListItem><input type="checkbox" defaultChecked /> Team Events</CalendarListItem>
          </ListSection>

          <UpcomingList>
            <PanelTitle>Upcoming</PanelTitle>
            {upcomingMeetings.length === 0 ? (
              <div style={{ fontSize: 12, color: '#6b7280' }}>No upcoming meetings</div>
            ) : (
              upcomingMeetings.map((m) => (
                <UpcomingItem
                  key={m.id}
                  type="button"
                  onClick={() => openForEvent({ ...m, start: new Date(m.start), end: m.end ? new Date(m.end) : null })}
                >
                  <div className="t">{m.title || 'Untitled meeting'}</div>
                  <div className="d">{formatEventDate(m.start)}</div>
                </UpcomingItem>
              ))
            )}
          </UpcomingList>
        </SidePanel>

        <CalendarShell>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={viewType}
            headerToolbar={false}
            editable
            selectable
            selectMirror
            dayMaxEvents
            events={meetings}
            height="calc(100vh - 210px)"
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            slotDuration="01:00:00"
            slotLabelInterval="01:00:00"
            allDaySlot={false}
            nowIndicator
            scrollTime="00:00:00"
            slotLabelFormat={{
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }}
            eventDisplay="block"
            eventBackgroundColor="#1a73e8"
            eventBorderColor="#1557b0"
            eventTextColor="#ffffff"
            select={(selection) =>
              openForRange(selection.startStr.slice(0, 16), selection.endStr.slice(0, 16), selection.allDay)
            }
            eventClick={(clickInfo) => openForEvent(clickInfo.event)}
            eventDrop={handleDropResize}
            eventResize={handleDropResize}
            datesSet={(arg) => {
              setTitleText(arg.view.title);
              setViewType(arg.view.type);
            }}
          />
        </CalendarShell>
      </Layout>

      {showMeetingModal && (
        <Modal onClick={closeModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h2>{editingMeetingId ? 'Edit Meeting' : 'Create Meeting'}</h2>
              <CloseButton onClick={closeModal}>×</CloseButton>
            </ModalHeader>
            <Form onSubmit={saveMeeting}>
              <Group>
                <label>Title</label>
                <input
                  type="text"
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </Group>
              <Group>
                <label>Start</label>
                <input
                  type="datetime-local"
                  value={meetingForm.start}
                  onChange={(e) => setMeetingForm((prev) => ({ ...prev, start: e.target.value }))}
                  required
                />
              </Group>
              <Group>
                <label>End</label>
                <input
                  type="datetime-local"
                  value={meetingForm.end}
                  onChange={(e) => setMeetingForm((prev) => ({ ...prev, end: e.target.value }))}
                  required
                />
              </Group>
              <Group>
                <label>Location</label>
                <input
                  type="text"
                  value={meetingForm.location}
                  onChange={(e) => setMeetingForm((prev) => ({ ...prev, location: e.target.value }))}
                />
              </Group>
              <Group>
                <label>Notes</label>
                <textarea
                  rows={4}
                  value={meetingForm.notes}
                  onChange={(e) => setMeetingForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </Group>
              <Actions>
                <Btn type="button" onClick={closeModal}>Cancel</Btn>
                {editingMeetingId && <Btn type="button" onClick={deleteMeeting}>Delete</Btn>}
                <Btn type="submit" primary>{editingMeetingId ? 'Save changes' : 'Create meeting'}</Btn>
              </Actions>
            </Form>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
}

