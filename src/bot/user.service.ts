import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UserService {
  private readonly storagePath = path.join(process.cwd(), 'data', 'greeted_users.json');
  private greetedUsers: Set<number> = new Set();

  constructor() {
    this.loadUsers();
  }

  private loadUsers() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf8');
        const usersArray = JSON.parse(data);
        this.greetedUsers = new Set(usersArray);
        console.log(`✅ UserService: Loaded ${this.greetedUsers.size} greeted users from storage.`);
      }
    } catch (error) {
      console.error('❌ Error loading greeted users:', error);
      this.greetedUsers = new Set();
    }
  }

  private async saveUsers() {
    try {
      const data = JSON.stringify(Array.from(this.greetedUsers));
      // Ensure data directory exists
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.storagePath, data, 'utf8');
    } catch (error) {
      console.error('❌ Error saving greeted users:', error);
    }
  }

  async hasBeenGreeted(userId: number): Promise<boolean> {
    return this.greetedUsers.has(userId);
  }

  async markAsGreeted(userId: number): Promise<void> {
    if (!this.greetedUsers.has(userId)) {
      this.greetedUsers.add(userId);
      await this.saveUsers();
    }
  }
}
