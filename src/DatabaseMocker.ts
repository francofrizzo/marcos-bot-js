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

    getTransitionsFrom(dbId: number, element: string): string[] {
        if (this.isDefined(dbId)) {
            return this.transitions[dbId]
                .filter(transition => transition[0] == element)
                .map(transition => transition[1]);
        }
    }

    getTransitionsTo(dbId: number, element: string): string[] {
        if (this.isDefined(dbId)) {
            return this.transitions[dbId]
                .filter(transition => transition[1] == element)
                .map(transition => transition[0]);
        }
    }
}

var dbMocker = new DatabaseMocker();
