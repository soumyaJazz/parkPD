import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { dataFile } from '../common/data-store';

/**
 * Which detail a code was sent to, and so which one proved the account.
 *
 * Lives here rather than in the auth module because it is a column of the row
 * below before it is anything else - and because both the OTP store and the
 * auth service need to name it, neither of which can import the other.
 */
export type AuthMethod = 'email' | 'phone';

/** How the user describes themselves on the profile form. */
export type Gender = 'male' | 'female';

/** Every yes/no answer in the questionnaire is stored as 0 or 1, not a boolean. */
export type Flag = 0 | 1;

/** How the user wants to be asked for their daily dose log. */
export type DoseMode = 'pages' | 'scroll';

export interface User {
    id: string;
    created_at: string;
    /**
     * The two ways of reaching a person. Which one is *the account* is decided
     * by `verified_with` below, not by which of them happens to be filled in:
     * the other is a detail the profile screen may change or remove, and both
     * are set once the user has volunteered the second.
     *
     * Both optional, because only one of them exists between signing up and
     * finishing setup - and which one that is depends on how they signed up.
     */
    email?: string;
    phone?: string;
    /**
     * Which detail was verified to create this account - the one a code was
     * actually delivered to. It is what the account *is*, so it is the one
     * detail the profile screen will not let the user change.
     *
     * Optional only for rows written before it was recorded; `verifiedWith`
     * below is the one place that decides what those mean, so nothing else has
     * to remember. Every row written from now on carries it.
     */
    verified_with?: AuthMethod;
    // Everything below is filled in by profile setup, which runs once straight
    // after sign-up - so an account exists without them for the minute in
    // between, and older rows in the file never had them at all. The spare
    // contact detail is asked for in the same sitting, and is declared with
    // its pair above rather than here.
    full_name?: string;
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
    /**
     * Last time the profile screen saved. Absent on a profile nobody has been
     * back to since setup - which is why it is separate from the one above
     * rather than being moved forward by both.
     */
    profile_updated_at?: string;
}

/**
 * Which detail proved this account.
 *
 * A row without the field predates it being recorded, and every one of those
 * was created by email - phone verification has never been switched on, so
 * there is no other way an older account could have been made. Read through
 * this rather than off the field, so that assumption lives in one place.
 */
export function verifiedWith(user: User): AuthMethod {
    return user.verified_with ?? 'email';
}

/**
 * The detail this account signs in with - the one a code is sent to.
 *
 * This is the account's identity, and the one thing about it that never
 * changes: it is what was proved at sign-up, and the profile screen refuses to
 * move it. The other slot, if filled, is a way of contacting the person and
 * nothing more.
 */
export function primaryContact(user: User): string {
    // The empty string is unreachable on a row written by `create`, which fills
    // the slot it names. It is here so callers get a string rather than having
    // to handle an impossible undefined at every use.
    return (verifiedWith(user) === 'phone' ? user.phone : user.email) ?? '';
}

/**
 * The digits that identify a number: the last ten.
 *
 * Two spellings of one phone are one phone. Someone who signs up as
 * "+91 98765 43210" and later types "9876543210" to log in has not changed
 * number, and refusing them would be a bug they cannot see the cause of - so
 * the country code is not part of what makes a number itself here.
 *
 * The cost is that two numbers in different countries sharing their last ten
 * digits would read as one account. That is the trade this makes, and the
 * place to revisit if parkPD is ever used outside one dialling code.
 */
const NATIONAL_DIGITS = 10;

function phoneIdentity(phone: string): string {
    return phone.replace(/\D/g, '').slice(-NATIONAL_DIGITS);
}

/**
 * Reduces a number to the form we store: digits, keeping a leading '+' for the
 * country code. Two spellings of one number normalise to the same string.
 */
export function normalizePhone(input: string): string {
    const digits = input.replace(/\D/g, '');
    return input.trimStart().startsWith('+') ? `+${digits}` : digits;
}

/** True when two written numbers are the same phone. */
export function sameNumber(a: string, b: string): boolean {
    return phoneIdentity(a) === phoneIdentity(b);
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
        const wanted = email.trim().toLowerCase();
        return this.readAll().find((u) => u.email === wanted);
    }

    findByPhone(phone: string): User | undefined {
        // The same number typed with a space, a dash or a country code is one
        // number, and two accounts for it is one too many
        return this.readAll().find(
            (u) => u.phone !== undefined && sameNumber(u.phone, phone),
        );
    }

    /** Whoever holds this detail, in either slot. Used to refuse duplicates. */
    findByContact(contact: string, method: AuthMethod): User | undefined {
        return method === 'phone'
            ? this.findByPhone(contact)
            : this.findByEmail(contact);
    }

    /**
     * The account that *signs in* with this detail.
     *
     * Narrower than `findByContact` on purpose: an email sitting in the spare
     * slot of an account that signs in by phone is a way of reaching that
     * person, not a way of becoming them. Sign-in only ever matches the detail
     * that was actually verified.
     */
    findByPrimary(contact: string, method: AuthMethod): User | undefined {
        const holder = this.findByContact(contact, method);
        return holder && verifiedWith(holder) === method ? holder : undefined;
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

    /**
     * `verifiedWith` is required rather than defaulted: which detail proved the
     * account is not something to be assumed at the one moment it is actually
     * known, and a default would quietly write the wrong answer the day a
     * second way of signing up exists.
     */
    create(contact: string, verifiedWith: AuthMethod): User {
        const user: User = {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            verified_with: verifiedWith,
            // Into the slot the method names, and only that one. The other is
            // offered during setup, and is the user's to change afterwards.
            ...(verifiedWith === 'phone'
                ? { phone: contact }
                : { email: contact.toLowerCase() }),
        };
        this.writeAll([...this.readAll(), user]);
        return user;
    }
}
