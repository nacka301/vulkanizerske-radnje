/**
 * SMS provajder sucelje (poglavlje 6). Novi provajderi se dodaju
 * implementacijom ovog sucelja, bez izmjene ostatka workera.
 */
export interface SmsProvider {
  send(to: string, body: string, senderId: string): Promise<{ id: string }>;
}
