import { FrequencySet, Serializable } from "../MarkovChain/FrequencySet"
export { DatabaseMocker, dbMocker }

class DatabaseMocker {
    transitions: {[id: number]: [string, string][]} = {};

    private isDefined(dbId: number) {
        return this.transitions.hasOwnProperty(dbId);
    }

    private defineIdIfUndefined(dbId: number) {
        if (! this.isDefined(dbId)) this.transitions[dbId] = [];
    }

    addTransition(dbId: number , elementFrom: string, elementTo: string) {
        this.defineIdIfUndefined(dbId);
        this.transitions[dbId].push([elementFrom, elementTo]);
    }

    getTransitionsFrom(dbId: number, element: string): string[] | undefined {
        if (this.isDefined(dbId)) {
            return this.transitions[dbId]
                .filter(transition => transition[0] == element)
                .map(transition => transition[1]);
        }
    }

    getTransitionsTo(dbId: number, element: string): string[] | undefined {
        if (this.isDefined(dbId)) {
            return this.transitions[dbId]
                .filter(transition => transition[1] == element)
                .map(transition => transition[0]);
        }
    }
}

const dbMocker = new DatabaseMocker();

class MockDatabaseQuerier<T extends Serializable<T>> {
    chainId: number;

    constructor(chainId: number) {
        this.chainId = chainId;
    }

    addTransition(fromElement: T, toElement: T): void {
        let stringFrom = fromElement.serialize();
        let stringTo = toElement.serialize();
        dbMocker.addTransition(this.chainId, stringFrom, stringTo);
    };

    getTransitionsFrom(element: T): FrequencySet<T> {
        let transitions = new FrequencySet<T>();
        let transitionsAsStrings = dbMocker.getTransitionsFrom(this.chainId, element.serialize());
        if (transitionsAsStrings) {
            transitionsAsStrings.forEach(string =>
                transitions.addAppearence(element.deserialize(string))
            );
        }
        return transitions;
    }

    getTransitionsTo(element: T): FrequencySet<T> {
        let transitions = new FrequencySet<T>();
        let transitionsAsStrings = dbMocker.getTransitionsTo(this.chainId, element.serialize());
        if (transitionsAsStrings) {
            transitionsAsStrings.forEach(string =>
                transitions.addAppearence(element.deserialize(string))
            );
        }
        return transitions;
    }
}
