import { Injectable } from '@angular/core';
import {WebSocketSubject} from "rxjs/internal/observable/dom/WebSocketSubject";
import {webSocket} from "rxjs/webSocket";

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private readonly socket$: WebSocketSubject<any> | undefined;

  constructor() {
    this.socket$ = webSocket('wss://84cc-2402-800-629c-f724-cc90-fa49-7dd5-5def.ngrok-free.app/ws');
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
