import { FrequencySet, EqComparable } from "./FrequencySet"
import { dbMocker } from "./DatabaseMocker"
export { DatabaseQuerier, Serializable }

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

    addTransition(fromElement: T, toElement: T): void {
        let stringFrom = fromElement.serialize();
        let stringTo = toElement.serialize();
        dbMocker.addTransition(this.chainId, stringFrom, stringTo);
    };

    getTransitionsFrom(element: T): FrequencySet<T> {
        let transitions = new FrequencySet<T>();
        let transitionsAsStrings = dbMocker.getTransitionsFrom(this.chainId, element.serialize());
        transitionsAsStrings.forEach(string =>
            transitions.addAppearence(element.deserialize(string))
        );
        return transitions;
    }

    getTransitionsTo(element: T): FrequencySet<T> {
        let transitions = new FrequencySet<T>();
        let transitionsAsStrings = dbMocker.getTransitionsTo(this.chainId, element.serialize());
        transitionsAsStrings.forEach(string =>
            transitions.addAppearence(element.deserialize(string))
        );
        return transitions;
    }
}
