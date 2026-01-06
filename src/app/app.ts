import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {PocChatComponent} from '../poc-chat.component/poc-chat.component';

@Component({
  selector: 'app-root',
  imports: [  PocChatComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('chatbotsample');
}
