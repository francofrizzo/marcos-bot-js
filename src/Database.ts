import * as sqlite from "sqlite"
import { FrequencySet, EqComparable } from "./FrequencySet"
export { DatabaseQuerier, Serializable, createSchema }

const dbPromise: Promise<sqlite.Database> = sqlite.open("local/marcos.sqlite3");

var createSchema = async function() {
    const db: sqlite.Database = await dbPromise;
    db.run(`CREATE TABLE IF NOT EXISTS transitions (
        id           INTEGER  PRIMARY KEY  AUTOINCREMENT,
        chainId      INTEGER  NOT NULL,
        fromState    TEXT     NOT NULL,
        toState      TEXT     NOT NULL,
        frequency    INTEGER  NOT NULL,
        CONSTRAINT uniqueTransitions UNIQUE (chainid, fromState, toState)
    )`)
};

createSchema();

interface Serializable<T> {
    serialize(): string;
    deserialize(serialized: string): T; // Language shortcoming: this should
    // ideally be a static method
}

class DatabaseQuerier<T extends Serializable<T> & EqComparable<T>> {
    chainId: number;

    constructor(chainId: number) {
        this.chainId = chainId;
    }

    async addTransition(fromState: T, toState: T): Promise<void> {
        const db: sqlite.Database = await dbPromise;
        let queryArgs = {
            $chainId: this.chainId,
            $fromState: fromState.serialize(),
            $toState: toState.serialize()
        }
        await db.run(`
            INSERT OR IGNORE INTO transitions(chainId, fromState, toState, frequency)
                VALUES ($chainId, $fromState, $toState, 0);
        `, queryArgs);
        await db.run(`
            UPDATE transitions
                SET frequency = frequency + 1
                WHERE chainId = $chainId AND fromState = $fromState AND toState = $toState
        `, queryArgs);
    };

    async getTransitionsFrom(state: T): Promise<FrequencySet<T>> {
        const db: sqlite.Database = await dbPromise;
        let transitions = new FrequencySet<T>();
        let rows = await db.all(`
            SELECT toState, frequency FROM transitions
                WHERE chainId = $chainId AND fromState = $fromState
        `, { $chainId: this.chainId, $fromState: state.serialize() });
        rows.forEach(row => {
            transitions.addAppearences(state.deserialize(row.toState), row.frequency);
        });
        return transitions;
    }

    async getTransitionsTo(state: T): Promise<FrequencySet<T>> {
        const db: sqlite.Database = await dbPromise;
        let transitions = new FrequencySet<T>();
        let rows = await db.all(`
            SELECT fromState, frequency FROM transitions
                WHERE chainId = $chainId AND toState = $toState
        `, { $chainId: this.chainId, $toState: state.serialize() });
        rows.forEach(row => {
            transitions.addAppearences(state.deserialize(row.fromState), row.frequency);
        });
        return transitions;
    }
}
