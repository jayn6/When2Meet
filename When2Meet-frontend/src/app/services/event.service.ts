import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CalendarEvent } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:8080/api/events';

  getEvents(): Observable<CalendarEvent[]> {
    return this.http.get<CalendarEvent[]>(this.apiUrl);
  }

  createEvent(event: CalendarEvent): Observable<CalendarEvent> {
    return this.http.post<CalendarEvent>(this.apiUrl, event);
  }
}