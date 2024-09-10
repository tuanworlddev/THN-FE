import { Injectable } from '@angular/core';
import {WebSocketSubject} from "rxjs/internal/observable/dom/WebSocketSubject";
import {webSocket} from "rxjs/webSocket";

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private readonly socket$: WebSocketSubject<any> | undefined;

  constructor() {
    this.socket$ = webSocket('wss://localhost:8080/ws');
  }

  sendMessage(message: any) {
    if (this.socket$) {
      this.socket$!.next(message);
    }
  }

  getMessages() {
    return this.socket$!.asObservable();
  }

}
