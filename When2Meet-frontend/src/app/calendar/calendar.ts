import { Component, OnInit, inject } from '@angular/core';
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

  private eventService = inject(EventService);

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
      },
      error: (error) => {
        console.error('Could not load events:', error);
      }
    });
  }

  openModal(): void {
    this.resetForm();

    const today = new Date();

    this.eventDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0')
    ].join('-');

    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  resetForm(): void {
    this.title = '';
    this.description = '';
    this.location = '';
    this.category = 'CLASS';
    this.visibility = 'PRIVATE';
    this.startTime = '09:00';
    this.endTime = '10:00';
    
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

    const newEvent: CalendarEvent = {
      title: this.title,
      description: this.description,
      startDateTime: `${this.eventDate}T${this.startTime}:00`,
      endDateTime: `${this.eventDate}T${this.endTime}:00`,
      location: this.location,
      type: this.visibility,
      category: this.category
    };

    this.eventService.createEvent(newEvent).subscribe({
      next: (savedEvent) => {
        this.events = [...this.events, savedEvent];
        this.closeModal();
      },
      error: (error) => {
        console.error('Could not save event:', error);
        alert('Could not save the event. Check that the backend is running.');
      }
    });
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
}