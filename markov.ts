class Word {
    constructor(public string: string) {}
}

class PhraseWord {
    public content: Word;
    public phrase: Phrase;
    public previousWord: PhraseWord;
    public nextWord: PhraseWord;

    constructor(
        content: Word,
        phrase: Phrase,
        previousWord?: PhraseWord,
    ) {
        this.content = content;
        if (previousWord) {

        }
    }

    isFirstWord(): boolean {
        return this.previousWord === null;
    }

    isLastWord(): boolean {
        return this.nextWord === null;
    }

    // setNextWord(word: Word): void {
    //     this.nextWord = word;
    // }
}

class Phrase {
    private words: PhraseWord[] = [];

    constructor(firstWord?: Word) {
        if (firstWord) {
            this.addWord(firstWord);
        }
    }

    addWord(word: Word) {
        let wordToAdd: PhraseWord;
        if (this.words.length > 0) {
            wordToAdd = new PhraseWord(word, this, null);
        }
        else {
            wordToAdd = new PhraseWord(word, this, this.words[this.words.length]);
        }
    }

    
}

/**
 * Represents a node in a Markov chain that contains elements of type T.
 */
class MarkovChainNode<T> {
    // IMPORTANT. The neccessary information about frequencies should not be
    // stores in memory in these nodes, because it is way too large.
    // Instead, a connection to the database will be performed every time that
    // a successor element (or any other query) is required.

    content: T;
    chain: MarkovChain<T>;

    constructor(content: T, chain: MarkovChain<T>) {
        this.content = content;
        this.chain = chain;
    }

    getRandomSuccessor(): MarkovChainNode<T> {
        let databaseServer = new DatabaseChainServer<T>(new DatabaseChainKey());
        let successors = databaseServer.getSuccessors(this.content);
        return new MarkovChainNode<T>(successors.getRandomElement(), this.chain);
    };

    addTransitionTo(element: T): void {

    }

    addTerminalTransition(): void {

    }

    isTerminal(): boolean { return false };
}

class MarkovChainTerminalNode<T> extends MarkovChainNode<T> {
    constructor(chain: MarkovChain<T>) {
        super(undefined, chain);
    }

    getRandomSuccessor(): MarkovChainNode<T> { return null; }

    isTerminal(): boolean { return true };
}

class MarkovChain<T> {
    private elements: FrequencySet<T> = new FrequencySet<T>();
    private dbKey: DatabaseChainKey;

    constructor(dbKey: DatabaseChainKey) {
        this.dbKey = dbKey;
    }

    private generateNode(element: T): MarkovChainNode<T> {
        return new MarkovChainNode<T>(element, this);
    }

    private generateNodeAndDo<S>(element: T, callback: (node: MarkovChainNode<T>) => S): S {
        let node = this.generateNode(element);
        return callback(node);
    } 

    addInitialAppearence(element: T): void {
        this.elements.addAppearence(element);
    }

    /**
     * Adds a transition from the first element passed as parameter
     * to the second element passed as parameter. Requires the first
     * element to have at least one appareance in the chain. Adds one
     * to the appearence count of the second element.
     */
    addTransition(fromElement: T, toElement: T): void {
        this.generateNodeAndDo(fromElement, fromNode => fromNode.addTransitionTo(toElement));
        this.elements.addAppearence(toElement);
    }

    /**
     * Adds a transition from the element passed as parameter
     * to the terminal node of the chain. Requires the element
     * element to have at least one appareance in the chain.
     */
    addTerminalTransition(fromElement: T): void {
        this.generateNodeAndDo(fromElement, fromNode => fromNode.addTerminalTransition());
    }

    /**
     * Adds a transition between each pair of consecutive elements in the array
     * passed as a parameter, plus a trasition from the last element in the array
     * to the terminal node of the chain. Also, adds one to the appearence count
     * of every element in the array.
     */
    addPath(elements: T[]): void {
        if (elements.length > 0) {
            this.addInitialAppearence(elements[0]);
            for (let index = 1; index < elements.length; index++) {
                this.addTransition(elements[index - 1], elements[index]);
            }
            this.addTerminalTransition(elements[elements.length - 1]);
        }
    }
    
    private getRandomNode(): MarkovChainNode<T> {
        return this.generateNode(this.getRandomElement());
    }

    getRandomElement(): T {
        return this.elements.getRandomElement();
    }

    getRandomSuccessor(element: T): T {
        return this.generateNodeAndDo(element, node => node.getRandomSuccessor().content);
    }

    private getRandomNodePath(): MarkovChainNode<T>[] {
        let path: MarkovChainNode<T>[] = [];
        let lastNodeAdded: MarkovChainNode<T> = this.getRandomNode();
        while (! lastNodeAdded.isTerminal()) {
            path.push(lastNodeAdded);
            lastNodeAdded = lastNodeAdded.getRandomSuccessor();
        }
        return path;
    }

    getRandomPath(): T[] {
        return this.getRandomNodePath().map(node => node.content);
    }
    
    getFrequency(element: T): number {
        return this.elements.getFrequency(element);
    }

    getProbability(element: T): number {
        return this.elements.getProbability(element);
    }
}

class FrequencySetElementWrapper<T> {
    element: T;
    frequency: number;

    constructor(element: T, frequency: number = 0) {
        this.element = element;
        this.frequency = frequency;
    }

    addAppearences(count: number): number {
        this.frequency += count;
        return this.frequency;
    }

    removeAppearences(count: number): number {
        let effectiveCount = Math.min(count, this.frequency);
        this.frequency -= effectiveCount;
        return this.frequency;
    }

    addApearence(): number {
        return this.addAppearences(1);
    }

    removeApearence(): number {
        return this.removeAppearences(1);
    }
}

class FrequencySet<T> {
    public elementWrappers: FrequencySetElementWrapper<T>[] = [];
    public totalAppearences: number = 0;

    /**
     * Returns the wrapper of the element passed as a parameter, if it is already part of the set.
     * Otherwise, creates a wrapper for the element and adds it to the set or returns `undefined`,
     * depending on the value of the parameter `createIfUnexistent`.
     */
    private getWrapperFor(element: T, createIfUnexistent: boolean = true): FrequencySetElementWrapper<T> {
        let wrapper = this.elementWrappers.find(
            (wrapper: FrequencySetElementWrapper<T>) => wrapper.element == element
        );
        if (wrapper === undefined && createIfUnexistent) {
            wrapper = new FrequencySetElementWrapper<T>(element);
            this.elementWrappers.push(wrapper);
        }
        return wrapper;
    }

    private getWrapperAndDo<S>(
        element: T,
        callback: (wrapper: FrequencySetElementWrapper<T>) => S
    ) {
        let wrapper = this.getWrapperFor(element);
        return callback(wrapper);
    }

    private ifWrapperExistsDo<S>(
        element: T,
        callback: (wrapper: FrequencySetElementWrapper<T>) => S,
        elseCallback?: S | (() => S)
    ): S {
        let wrapper = this.getWrapperFor(element, false);
        if (wrapper) return callback(wrapper);
        else if (elseCallback) {
            if (elseCallback instanceof Function) return elseCallback();
            else return elseCallback;
        }
        else return undefined;
    }

    getFrequency(element: T): number {
        return this.ifWrapperExistsDo(element, wrapper => wrapper.frequency, 0);
    }

    getProbability(element: T): number {
        if (this.totalAppearences > 0)
            return this.getFrequency(element) / this.totalAppearences;
        else
            return 0;
    }

    private getRandomWrapper(): FrequencySetElementWrapper<T> {
        // This algorithm should be thoroughly tested.
        let dice: number = Math.random() * this.totalAppearences;
        let currentPosition: number = 0;
        let appearencesCount: number = 0;
        while (appearencesCount <= dice) {
            appearencesCount += this.elementWrappers[currentPosition].frequency;
            currentPosition += 1;
        }
        return this.elementWrappers[currentPosition - 1];
    }

    getRandomElement(): T {
        return this.getRandomWrapper().element;
    }


    /**
     * Adds `count` to the appearence count of the element passed as a parameter.
     */
    addAppearences(element: T, count: number): void {
        this.getWrapperAndDo(element, wrapper => wrapper.addAppearences(count));
        this.totalAppearences += count;
    }

    /**
     * Substracts `count` from the appearence count of the element passed as a parameter.
     */
    removeAppearences(element: T, count: number): void {
        this.ifWrapperExistsDo(element, (wrapper) => {
            let effectiveCount = Math.min(count, wrapper.frequency);
            wrapper.removeAppearences(effectiveCount);
            this.totalAppearences -= count;
        });
    }

    /**
     * Adds one to the appearence count of the element passed as a parameter.
     */
    addAppearence(element: T): void {
        this.addAppearences(element, 1);
    }

    /**
     * Substracts one from the appearence count of the element passed as a parameter.
     */
    removeAppearence(element: T): void {
        this.removeAppearences(element, 1);
    }
}


class DatabaseChainKey {

}

class DatabaseChainServer<T> {
    dbKey: DatabaseChainKey;

    constructor(dbKey: DatabaseChainKey) {
        this.dbKey = DatabaseChainKey;
    }

    getSuccessors(element: T): FrequencySet<T> {
        return undefined;
    }
}
