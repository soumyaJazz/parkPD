import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { dataFile } from '../common/data-store';

/** How the user describes themselves on the profile form. */
export type Gender = 'male' | 'female';

/** Every yes/no answer in the questionnaire is stored as 0 or 1, not a boolean. */
export type Flag = 0 | 1;

/** How the user wants to be asked for their daily dose log. */
export type DoseMode = 'pages' | 'scroll';

export interface User {
    id: string;
    email: string;
    created_at: string;
    // Everything below is filled in by profile setup, which runs once straight
    // after sign-up - so an account exists without them for the minute in
    // between, and older rows in the file never had them at all.
    full_name?: string;
    phone?: string;
    gender?: Gender;
    /** DD/MM/YYYY - the single field the profile form sends. */
    dob?: string;
    // The clinical questionnaire, asked in the same sitting and saved in the
    // same write. Field names are the agreed wire contract, mixed casing and
    // all - renaming them here would only move the mismatch somewhere else.
    /** How long they have had Parkinson's, in months. */
    p_duration?: number;
    first_symptom?: string[];
    first_affected_part?: string[];
    /**
     * Falls in the last year, or null for no history of them. The count is the
     * whole answer - and null is not 0, which means "a history of falls, but
     * none in the last year".
     */
    recc_falls?: number | null;
    /** Null whenever `recc_falls` is: there were no falls to characterise. */
    recc_falls_type?: string[] | null;
    psychiatric?: Flag;
    /**
     * What they use, or null for no history. An empty array is a third answer:
     * a history the user chose not to break down.
     */
    addiction?: string[] | null;
    rem?: Flag;
    non_motor_symptoms?: string[];
    /**
     * Null means the condition was answered "no". 0 is a different answer -
     * diagnosed, but under a year ago - so the two are not interchangeable.
     */
    diabetes_yrs?: number | null;
    hypertension_yrs?: number | null;
    thyroid_yrs?: number | null;
    family_p_history?: Flag;
    walk_independent?: Flag;
    assistance_needed?: Flag;
    dose_mode?: DoseMode;
    /** Set once, when setup is saved. Absent means the form is still owed. */
    profile_completed_at?: string;
}

/** Compares numbers by their digits, so +91 98765 43210 matches 919876543210. */
function phoneDigits(phone: string): string {
    return phone.replace(/\D/g, '');
}

@Injectable()
export class UsersService {

    private readonly filePath = dataFile('users.json');

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
            created_at: new Date().toISOString(),
        };
        this.writeAll([...this.readAll(), user]);
        return user;
    }
}
