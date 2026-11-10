import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  TimetableExtraction,
  ConfirmTimetable
} from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class TimetableService {

  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:8080/api/ai/timetable';

  extractTimetable(file: File): Observable<TimetableExtraction> {

    const formData = new FormData();

    formData.append('file', file);

    return this.http.post<TimetableExtraction>(
      `${this.apiUrl}/extract`,
      formData
    );
  }

  confirmTimetable(data: ConfirmTimetable): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/confirm`,
      data
    );
  }
}