import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EventService } from '../services/event.service';
import { CalendarEvent } from '../models/event.model';
@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css'
})
export class CalendarComponent implements OnInit {
  selectedEvent: CalendarEvent | null = null;
  draggedEvent: CalendarEvent | null = null;

  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);

  currentDate = new Date();
  events: CalendarEvent[] = [];

  showModal = false;

  title = '';
  description = '';
  eventDate = '';
  startTime = '09:00';
  endTime = '10:00';
  location = '';
  category = 'CLASS';
  visibility: 'PRIVATE' | 'SHARED' = 'PRIVATE';

  weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  ngOnInit(): void {
    this.loadEvents();
  }

  get monthYear(): string {
    return this.currentDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  }

  get calendarDays(): (Date | null)[] {

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const firstDay = new Date(year, month, 1);

    // Monday = 0, Tuesday = 1, ..., Sunday = 6
    const offset = (firstDay.getDay() + 6) % 7;

    const numberOfDays = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];

    for (let i = 0; i < offset; i++) {
      days.push(null);
    }

    for (let day = 1; day <= numberOfDays; day++) {
      days.push(new Date(year, month, day));
    }

    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }

  previousMonth(): void {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() - 1,
      1
    );
  }

  nextMonth(): void {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1,
      1
    );
  }

  goToToday(): void {
    this.currentDate = new Date();
  }

  loadEvents(): void {
    this.eventService.getEvents().subscribe({
      next: (data) => {
        this.events = data;
        this.cdr.detectChanges();

      },
      error: (error) => {
        console.error('Could not load events:', error);
      }
    });
  }

  openModal(day?: Date): void {
    this.resetForm();

    const selectedDay =day || new Date();

    this.eventDate = [
      selectedDay.getFullYear(),
      String(selectedDay.getMonth() + 1).padStart(2, '0'),
      String(selectedDay.getDate()).padStart(2, '0')
    ].join('-');

    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.cdr.detectChanges();
  }

  editEvent(event: CalendarEvent): void {
    this.selectedEvent = event;
    this.title = event.title;
    this.description = event.description || '';
    this.location = event.location || '';
    this.category = event.category;
    this.visibility = event.type;
    this.eventDate = event.startDateTime.substring(0, 10);
    this.startTime = event.startDateTime.substring(11, 16);
    this.endTime = event.endDateTime.substring(11, 16);
   

    this.showModal = true;
  }

  resetForm(): void {
    this.title = '';
    this.description = '';
    this.location = '';
    this.category = 'CLASS';
    this.visibility = 'PRIVATE';
    this.startTime = '09:00';
    this.endTime = '10:00';
    this.selectedEvent = null;
    
  }

  saveEvent(): void {

    if (!this.title.trim() || !this.eventDate) {
      alert('Please enter an event title and date.');
      return;
    }

    if (this.endTime <= this.startTime) {
      alert('End time must be later than start time.');
      return;
    }

    const eventData: CalendarEvent = {
      title: this.title,
      description: this.description,
      startDateTime: `${this.eventDate}T${this.startTime}:00`,
      endDateTime: `${this.eventDate}T${this.endTime}:00`,
      location: this.location,
      type: this.visibility,
      category: this.category
    };

    if (this.selectedEvent && this.selectedEvent.id) {

      this.eventService.updateEvent(this.selectedEvent.id, eventData).subscribe({
        next: (updatedEvent) => {
          this.events = this.events.map(event =>
            event.id === updatedEvent.id ? updatedEvent : event

          );
            this.cdr.detectChanges();

          this.selectedEvent = null;
          this.closeModal();
        },
        error: (error) => {
          console.error('Could not save event:', error);
          alert('Could not update the event.');
        }
      });

    }else {

      this.eventService.createEvent(eventData).subscribe({
        next: (savedEvent) => {
          this.events = [...this.events, savedEvent];
          this.closeModal();
        },
        error: (error) => {
          console.error('Could not save event:', error);
          alert('Could not save the event.');
        }
      });

      } 
  }

  deleteEvent(): void {
    if(!this.selectedEvent?.id){
      return;
    }

    if(!confirm('Are you sure you want to delete this event?')){
      return;
    }

    this.eventService.deleteEvent(this.selectedEvent.id).subscribe({
      next: () => {
        this.events = this.events.filter(
          event => event.id !== this.selectedEvent?.id
        );
        this.selectedEvent = null;
        this.closeModal();
      },
      error: (error) => {
        console.error('Could not delete event:', error);
        alert('Could not delete the event.');
      }
    })
  }
  getEventsForDay(day: Date): CalendarEvent[] {

    const date = this.formatDate(day);

    return this.events.filter(event =>
      event.startDateTime.substring(0, 10) === date
    );
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  isToday(day: Date): boolean {
    return this.formatDate(day) === this.formatDate(new Date());
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  }

  onDragStart(event: CalendarEvent, e: DragEvent): void {
    this.draggedEvent = event;
    e.dataTransfer?.setData('text/plain', String(event.id));
    e.dataTransfer!.effectAllowed = 'move';
  }
  onDrop(day: Date): void {
    console.log('drop', day, this.draggedEvent);
    const ev= this.draggedEvent;
    this.draggedEvent = null;
    if (!ev || !ev.id) return;

    const newDate = this.formatDate(day);

    if (ev.startDateTime.substring(0, 10) === newDate) return;

    const moved: CalendarEvent = {
      ...ev,
      startDateTime: newDate+ ev.startDateTime.substring(10),
      endDateTime: newDate+ ev.endDateTime.substring(10)
    };
    
    this.eventService.updateEvent(ev.id, moved).subscribe({
      next: (updatedEvent) => {
        this.events = this.events.map(e => e.id === updatedEvent.id ? updatedEvent : e);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Could not move event:', error);
        alert('Could not move the event.');
      }
    })
  }
  
  trackById(index: number, event: CalendarEvent) {
    return event.id;
  }
  trackByIndex(index: number) {
    return index;
  }

}