import { Injectable } from '@angular/core';

export type SseEvent =
  | { type: 'token'; data: string }
  | { type: 'meta'; data: any }
  | { type: 'done'; data: any }
  | { type: 'error'; data: string };

@Injectable({ providedIn: 'root' })
export class ChatStreamService {
  private apiBase = 'https://localhost:7252'; // change if needed

  /**
   * Streams SSE using fetch so we can send headers (x-api-key).
   */
  // stream(question: string, apiKey?: string): AsyncGenerator<SseEvent> {
  //   const url = `${this.apiBase}/api/poc/stream?question=${encodeURIComponent(question)}`;
  //
  //   return this.fetchSse(url, apiKey ? { 'x-api-key': apiKey } : {});
  // }

  stream(question: string, apiKey?: string, mode: 'poc'|'agent' = 'agent') {
   // const path = mode === 'agent' ? '/api/agent/stream' : '/api/poc/stream';
   const path = `/api/chat/stream`;
    const url = `${this.apiBase}${path}?question=${encodeURIComponent(question)}`;
    return this.fetchSse(url, apiKey ? { 'x-api-key': apiKey } : {});
  }


  private async *fetchSse(url: string, headers: Record<string, string>): AsyncGenerator<SseEvent> {
    const controller = new AbortController();

    let resp: Response;
    try {
      resp = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          ...headers,
        },
        signal: controller.signal,
      });
    } catch (e: any) {
      yield { type: 'error', data: e?.message ?? 'Network error' };
      return;
    }

    if (!resp.ok || !resp.body) {
      yield { type: 'error', data: `HTTP ${resp.status}: ${await resp.text()}` };
      console.log(resp);
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let buffer = '';
    let eventName = 'message';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE frames end with a blank line (\n\n)
        while (true) {
          const idx = buffer.indexOf('\n\n');
          if (idx === -1) break;

          const rawFrame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          // Parse one SSE frame
          // Example:
          // event: token
          // data: hello
          const lines = rawFrame.split('\n');

          let dataLines: string[] = [];
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventName = line.slice('event:'.length).trim();
            } else if (line.startsWith('data:')) {
              // Per SSE spec, "data:" may have a single optional leading space. Remove only one.
              let v = line.slice('data:'.length);
              if (v.startsWith(' ')) v = v.slice(1);
              dataLines.push(v); // <-- no trim!
            }
          }

          const dataStr = dataLines.join('\n');

          // Your backend replaces newlines with \n, so convert back
          const normalized = dataStr.replace(/\\n/g, '\n');

          if (eventName === 'token') {
            yield { type: 'token', data: normalized };
          } else if (eventName === 'meta') {
            yield { type: 'meta', data: safeJsonParse(normalized) };
          } else if (eventName === 'done') {
            yield { type: 'done', data: safeJsonParse(normalized) };
            return;
          } else {
            // Unknown events => pass as error/info
            yield { type: 'error', data: `Unknown SSE event: ${eventName} (${normalized})` };
          }
        }
      }
    } catch (e: any) {
      yield { type: 'error', data: e?.message ?? 'Stream error' };
    } finally {
      controller.abort();
      try { reader.releaseLock(); } catch {}
    }
  }
}

function safeJsonParse(s: string): any {
  try { return JSON.parse(s); } catch { return s; }
}
