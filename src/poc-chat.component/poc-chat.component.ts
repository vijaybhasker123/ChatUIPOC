import {ChangeDetectorRef, Component} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {ChatStreamService, SseEvent} from '../chat-stream.service';


type ChatMsg = { role: 'user' | 'assistant' | 'system'; text: string };

@Component({
  selector: 'app-poc-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './poc-chat.component.html',
  styleUrl: './poc-chat.component.css',
})
export class PocChatComponent {
  question = 'Top 5 customers by total sales';
  apiKey = '';
  isStreaming = false;
  error = '';
  meta: any = null;

  messages: ChatMsg[] = [
    { role: 'system', text: 'Ask a question. The backend will generate SQL, run it, then stream the answer.' }
  ];

  constructor(private chat: ChatStreamService, private cdr: ChangeDetectorRef) {}

  async send() {
    this.error = '';
    this.meta = null;

    const q = this.question.trim();
    if (!q) return;

    this.messages.push({ role: 'user', text: q });

    // Placeholder assistant message to stream into
    const assistantMsg: ChatMsg = { role: 'assistant', text: '' };
    this.messages.push(assistantMsg);

    this.isStreaming = true;

    try {
      const gen = this.chat.stream(q, this.apiKey.trim() || undefined, 'agent');

      for await (const evt of gen) {
        this.handleEvent(evt, assistantMsg);

        if (evt.type === 'done') {
          break; // ✅ ensures we exit and re-enable Send
        }
      }
    } catch (e: any) {
      this.error = e?.message ?? 'Unexpected error';
    } finally {
      this.isStreaming = false;
      this.cdr.detectChanges();
    }
  }

  clear() {
    this.meta = null;
    this.error = '';
    this.messages = [{ role: 'system', text: 'Cleared. Ask another question.' }];
    this.question = '';
  }

  private handleEvent(evt: SseEvent, assistantMsg: ChatMsg) {
    if (evt.type === 'token') {
      assistantMsg.text += evt.data;
      this.cdr.detectChanges(); // 👈 important
    } else if (evt.type === 'meta') {
      this.meta = evt.data;
      this.cdr.detectChanges();
    } else if (evt.type === 'error') {
      this.error = evt.data;
      this.cdr.detectChanges();
    }
  }

}
