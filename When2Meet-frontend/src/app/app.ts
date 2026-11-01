import { Component, signal } from '@angular/core';
import { CalendarComponent } from './calendar/calendar';

@Component({
  imports: [CalendarComponent],
  selector: 'app-root',
    standalone: true,

  styleUrl: './app.css',
  template: '<app-calendar></app-calendar>',
})
export class App {
  protected readonly title = signal('When2Meet-frontend');
}
