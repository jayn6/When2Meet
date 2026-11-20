import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Friend {
  id: number;
  fullName: string;
  email: string;
}

export interface FriendRequest {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class FriendshipService {

  private apiUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  // SEARCH USERS
  searchUsers(query: string): Observable<Friend[]> {
    return this.http.get<Friend[]>(
      `${this.apiUrl}/users/search`,
      { params: { query } }
    );
  }

  // SEND FRIEND REQUEST
  sendRequest(userId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/friends/requests/${userId}`,
      {}
    );
  }

  // GET INCOMING REQUESTS
  getReceivedRequests(): Observable<FriendRequest[]> {
    return this.http.get<FriendRequest[]>(
      `${this.apiUrl}/friends/requests/received`
    );
  }

  // GET SENT REQUESTS
  getSentRequests(): Observable<FriendRequest[]> {
    return this.http.get<FriendRequest[]>(
      `${this.apiUrl}/friends/requests/sent`
    );
  }

  // ACCEPT REQUEST
  acceptRequest(requestId: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/friends/requests/${requestId}/accept`,
      {}
    );
  }

  // REJECT REQUEST
  rejectRequest(requestId: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/friends/requests/${requestId}/reject`,
      {}
    );
  }

  // GET FRIENDS
  getFriends(): Observable<Friend[]> {
    return this.http.get<Friend[]>(
      `${this.apiUrl}/friends`
    );
  }

  // REMOVE FRIEND
  unfriend(friendId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/friends/${friendId}`
    );
  }
}