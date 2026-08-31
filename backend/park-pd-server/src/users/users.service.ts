import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/** How the user describes themselves on the profile form. */
export type Gender = 'male' | 'female';

export interface User {
    id: string;
    email: string;
    createdAt: string;
    // Everything below is filled in by profile setup, which runs once straight
    // after sign-up - so an account exists without them for the minute in
    // between, and older rows in the file never had them at all.
    fullName?: string;
    phone?: string;
    gender?: Gender;
    /** DD/MM/YYYY - the single field the profile form sends. */
    dob?: string;
    /** Set once, when setup is saved. Absent means the form is still owed. */
    profileCompletedAt?: string;
}

/** Compares numbers by their digits, so +91 98765 43210 matches 919876543210. */
function phoneDigits(phone: string): string {
    return phone.replace(/\D/g, '');
}

@Injectable()
export class UsersService {

    private readonly filePath = path.join(process.cwd(), 'users.json');

    constructor() {
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify([]));
        }
    }

    private readAll(): User[] {
        try {
            return JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as User[];
        } catch {
            return [];
        }
    }

    private writeAll(users: User[]): void {
        fs.writeFileSync(this.filePath, JSON.stringify(users, null, 2));
    }

    findById(id: string): User | undefined {
        return this.readAll().find((u) => u.id === id);
    }

    findByEmail(email: string): User | undefined {
        // Foo@x.com and foo@x.com are the same mailbox; without normalising
        // you get two accounts for one person
        return this.readAll().find((u) => u.email === email.toLowerCase());
    }

    findByPhone(phone: string): User | undefined {
        // Matched on digits alone: the same number typed with a space, a dash
        // or a country code is one number, and two accounts for it is one too many
        const digits = phoneDigits(phone);
        return this.readAll().find(
            (u) => u.phone !== undefined && phoneDigits(u.phone) === digits,
        );
    }

    /**
     * Applies a patch to one user and writes the file back, or undefined when
     * there is no such user. The read and the write are one synchronous run, so
     * nothing can interleave between them and lose the other's change.
     */
    update(
        id: string,
        patch: Partial<Omit<User, 'id' | 'createdAt'>>,
    ): User | undefined {
        const users = this.readAll();
        const index = users.findIndex((u) => u.id === id);
        if (index === -1) {
            return undefined;
        }

        users[index] = { ...users[index], ...patch };
        this.writeAll(users);
        return users[index];
    }

    create(email: string): User {
        const user: User = {
            id: crypto.randomUUID(),
            email: email.toLowerCase(),
            createdAt: new Date().toISOString(),
        };
        this.writeAll([...this.readAll(), user]);
        return user;
    }
}
