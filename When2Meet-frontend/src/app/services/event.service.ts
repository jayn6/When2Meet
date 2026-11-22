import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CalendarEvent } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:8080/api/events';
  //who's asking
  private options(){
    return {headers: new HttpHeaders({ 'X-User-Id': this.userId() })}
  }
  userId(): string{
    for (const storage of [localStorage, sessionStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        try {
          const value = JSON.parse(storage.getItem(key) ?? '');
          if (value && value.userId != null) {
            return String(value.userId);
          }
        } catch {
          //skip if key not JSON
        }
      }
  }
  return '';
  }


  getEvents(): Observable<CalendarEvent[]> {
    return this.http.get<CalendarEvent[]>(this.apiUrl, this.options());
  }

  createEvent(event: CalendarEvent): Observable<CalendarEvent> {
    return this.http.post<CalendarEvent>(this.apiUrl, event, this.options());
  }

  updateEvent(id: number, event: CalendarEvent): Observable<CalendarEvent> {
    return this.http.put<CalendarEvent>(`${this.apiUrl}/${id}`, event, this.options());
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.options());
  }
}