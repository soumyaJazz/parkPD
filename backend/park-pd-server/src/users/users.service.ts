import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL, Queryable } from '../common/database.module';

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
    // between, and older rows never had them at all. The spare contact detail
    // is asked for in the same sitting, and is declared with its pair above
    // rather than here.
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
 *
 * The same rule is spelled a second time in the schema, as the generated
 * `phone_national` column that carries the unique index. It has to be: only the
 * database can refuse two rows at once, and only this can answer without a
 * round trip. They are checked against each other by `findByPhone`, which
 * computes the value here and looks it up there.
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

/**
 * What every read selects.
 *
 * `dob` is shaped by Postgres rather than in TypeScript: a `date` comes back
 * from the driver as a JS Date at local midnight, and formatting that in a zone
 * behind UTC hands back the day before. `to_char` has no timezone to get wrong.
 *
 * The timestamps are left as Dates and turned into ISO strings below, which is
 * the one format the client has ever been sent.
 */
const USER_COLUMNS = `
  id, created_at, email, phone, verified_with,
  full_name, gender, to_char(dob, 'DD/MM/YYYY') AS dob,
  p_duration, first_symptom, first_affected_part,
  recc_falls, recc_falls_type, psychiatric, addiction, rem, non_motor_symptoms,
  diabetes_yrs, hypertension_yrs, thyroid_yrs,
  family_p_history, walk_independent, assistance_needed, dose_mode,
  profile_completed_at, profile_updated_at`;

/**
 * The columns `update` will write, and the only strings it will ever put into
 * a statement. A patch key that is not here is dropped rather than interpolated
 * - column names cannot be parameterised, so this list is what stands between a
 * caller-supplied key and the SQL.
 */
const WRITABLE_COLUMNS = new Set([
    'email',
    'phone',
    'full_name',
    'gender',
    'dob',
    'p_duration',
    'first_symptom',
    'first_affected_part',
    'recc_falls',
    'recc_falls_type',
    'psychiatric',
    'addiction',
    'rem',
    'non_motor_symptoms',
    'diabetes_yrs',
    'hypertension_yrs',
    'thyroid_yrs',
    'family_p_history',
    'walk_independent',
    'assistance_needed',
    'dose_mode',
    'profile_completed_at',
    'profile_updated_at',
]);

/**
 * The six answers whose null is itself an answer - "no history", as opposed to
 * "never asked". They are written once, together, by profile setup, so they are
 * read back as explicit nulls only on a profile that has actually been saved.
 */
const NULL_IS_AN_ANSWER = [
    'recc_falls',
    'recc_falls_type',
    'addiction',
    'diabetes_yrs',
    'hypertension_yrs',
    'thyroid_yrs',
] as const;

/** A row as Postgres hands it back, before the shaping below. */
type UserRow = Record<string, unknown> & {
    id: string;
    created_at: Date;
    profile_completed_at: Date | null;
    profile_updated_at: Date | null;
};

/**
 * A row in the shape the API has always returned.
 *
 * Postgres has one word for an unanswered question and the client has two: a
 * null column is a key that simply is not there, which is what a caller reading
 * `user.full_name` has always seen on an account that has not finished setup.
 * The six above are the exception, and only once there is a profile for them to
 * be part of.
 */
function rowToUser(row: UserRow): User {
    const user: Record<string, unknown> = {};
    const hasProfile = row.profile_completed_at !== null;

    for (const [column, value] of Object.entries(row)) {
        if (value instanceof Date) {
            user[column] = value.toISOString();
            continue;
        }
        if (value !== null) {
            user[column] = value;
            continue;
        }
        if (hasProfile && NULL_IS_AN_ANSWER.includes(column as never)) {
            user[column] = null;
        }
    }

    return user as unknown as User;
}

/**
 * Postgres rejects a malformed uuid with an error rather than an empty result,
 * so a lookup by an id that could never exist is answered here instead of
 * becoming a 500. Every id we mint is one of these.
 */
const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class UsersService {
    constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

    async findById(id: string): Promise<User | undefined> {
        if (!UUID.test(id)) {
            return undefined;
        }
        const { rows } = await this.pool.query<UserRow>(
            `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
            [id],
        );
        return rows[0] && rowToUser(rows[0]);
    }

    async findByEmail(email: string): Promise<User | undefined> {
        // Foo@x.com and foo@x.com are the same mailbox; without normalising
        // you get two accounts for one person
        const wanted = email.trim().toLowerCase();
        const { rows } = await this.pool.query<UserRow>(
            `SELECT ${USER_COLUMNS} FROM users WHERE email = $1`,
            [wanted],
        );
        return rows[0] && rowToUser(rows[0]);
    }

    async findByPhone(phone: string): Promise<User | undefined> {
        // The same number typed with a space, a dash or a country code is one
        // number, and two accounts for it is one too many. `phone_national` is
        // the column that holds exactly what `phoneIdentity` computes, so the
        // match is an index lookup rather than a scan comparing every row.
        const { rows } = await this.pool.query<UserRow>(
            `SELECT ${USER_COLUMNS} FROM users
              WHERE phone IS NOT NULL AND phone_national = $1`,
            [phoneIdentity(phone)],
        );
        return rows[0] && rowToUser(rows[0]);
    }

    /** Whoever holds this detail, in either slot. Used to refuse duplicates. */
    async findByContact(
        contact: string,
        method: AuthMethod,
    ): Promise<User | undefined> {
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
    async findByPrimary(
        contact: string,
        method: AuthMethod,
    ): Promise<User | undefined> {
        const holder = await this.findByContact(contact, method);
        return holder && verifiedWith(holder) === method ? holder : undefined;
    }

    /**
     * Applies a patch to one user, or undefined when there is no such user.
     *
     * A key set to undefined clears the column, which is how the profile screen
     * removes a spare contact detail: the caller writes the key and leaves the
     * value out, exactly as it did when this wrote a JSON file and
     * `JSON.stringify` dropped it. A key that is simply not in the patch is not
     * touched.
     */
    async update(
        id: string,
        patch: Partial<Omit<User, 'id' | 'created_at'>>,
        db: Queryable = this.pool,
    ): Promise<User | undefined> {
        if (!UUID.test(id)) {
            return undefined;
        }

        const columns = Object.keys(patch).filter((key) =>
            WRITABLE_COLUMNS.has(key),
        );
        if (columns.length === 0) {
            return this.findById(id);
        }

        const values: unknown[] = [id];
        const assignments = columns.map((column) => {
            values.push((patch as Record<string, unknown>)[column] ?? null);
            const placeholder = `$${values.length}`;
            // The one column the client's spelling is not the column's: the
            // form sends DD/MM/YYYY and the column is a real date.
            return column === 'dob'
                ? `dob = to_date(${placeholder}, 'DD/MM/YYYY')`
                : `${column} = ${placeholder}`;
        });

        const { rows } = await db.query<UserRow>(
            `UPDATE users SET ${assignments.join(', ')}
              WHERE id = $1
          RETURNING ${USER_COLUMNS}`,
            values,
        );
        return rows[0] && rowToUser(rows[0]);
    }

    /**
     * `verifiedWith` is required rather than defaulted: which detail proved the
     * account is not something to be assumed at the one moment it is actually
     * known, and a default would quietly write the wrong answer the day a
     * second way of signing up exists.
     */
    async create(contact: string, verifiedWith: AuthMethod): Promise<User> {
        // Into the slot the method names, and only that one. The other is
        // offered during setup, and is the user's to change afterwards.
        const isPhone = verifiedWith === 'phone';
        const { rows } = await this.pool.query<UserRow>(
            `INSERT INTO users (verified_with, email, phone)
             VALUES ($1, $2, $3)
          RETURNING ${USER_COLUMNS}`,
            [
                verifiedWith,
                isPhone ? null : contact.toLowerCase(),
                isPhone ? contact : null,
            ],
        );
        return rowToUser(rows[0]);
    }
}
