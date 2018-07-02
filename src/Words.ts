import { EqComparable } from "./FrequencySet"
import { Serializable } from "./DatabaseQuerier"
import { MarkovChain, MarkovChainProperties } from "./MarkovChain"
export { Word, InitialWord, TerminalWord, Phraser }

/**
 * Represents a word that can be used as a state for a Markov chain.
 */
class Word implements EqComparable<Word>, Serializable<Word> {
    public string: string;

    constructor(string: string) {
        if (string) this.string = string.toLowerCase();
    }

    /**
     * Determines if this is a special word marking the beginning of a phrase.
     */
    isInitial(): boolean {
        return false;
    }

    /**
     * Determines if this is a special word marking the end of a phrase.
     */
    isTerminal(): boolean {
        return false;
    }

    /**
     * Determines whether two words are the same or not.
     * @param other The other word to compare.
     */
    equals(other: Word): boolean {
        return !other.isInitial() && !other.isTerminal()
            && this.string == other.string;
    }

    /**
     * Returns a string representation of this word.
     */
    serialize(): string {
        return this.string.replace("INIT", "_INIT").replace("TERM", "_TERM");
    }

    /**
     * Returns a Word object from its string representation.
     */
    deserialize(aString: string): Word {
        if (aString == "INIT") return new InitialWord();
        else if (aString == "TERM") return new TerminalWord();
        else return new Word(aString
            .replace("_INIT", "INIT")
            .replace("_TERM", "TERM"));
    }
}

/**
 * A special word marking the beginning of a phrase.
 */
class InitialWord extends Word {
    constructor() { super(undefined); }
    isInitial() { return true; }
    equals(other: Word) { return other.isInitial(); }
    serialize(): string { return "INIT" };
}

/**
 * A special word marking the end of a phrase.
 */
class TerminalWord extends Word {
    constructor() { super(undefined); }
    isTerminal() { return true; }
    equals(other: Word) { return other.isTerminal(); }
    serialize(): string { return "TERM" };
}

/**
 * Uses Markov chains whose states are words to generate random phrases.
 * A Phraser can be fed with phrases, which are used for augmenting the
 * Markov chains, therefore affecting the phrases that will be generated
 * later.
 * A Phraser can keep several different Markov chains, using numerical
 * identifiers to distinguish between them.
 */
class Phraser {
    chainProperties: MarkovChainProperties<Word>

    /**
     * The properties of the Markov chains used by this Phraser.
     */
    constructor(chainProperties: MarkovChainProperties<Word>) {
        this.chainProperties = chainProperties;
    }

    /**
     * Generates a random phrase using the Markov chain whose identifier
     * is passed as a parameter.
     * @param chainId The identifier of the Markov chain to be used.
     */
    generatePhrase(chainId: number): string {
        let chain = new MarkovChain<Word>(chainId, this.chainProperties);
        return chain.getRandomWalk(
            new InitialWord(),
            word => word.isTerminal()
        ).join(" ");
    }

    /**
     * Randomly extends a phrase with words generated using the Markov chain
     * whose identifier is passed as a parameter.
     * @param chainId The identifier of the Markov chain to be used.
     * @param phrase The phrase to be extended.
     * @param addWordsBefore Whether words should or should not be prepended
     * to the phrase.
     * @param addWordsAfter Whether words should or should not be appended
     * to the phrase.
     */
    extendPhrase(
        chainId: number,
        phrase: string,
        addWordsBefore: boolean,
        addWordsAfter: boolean
    ): string {
        let chain = new MarkovChain<Word>(chainId, this.chainProperties);
        let words = phrase.split(" ")[0];
        let extendePhrase = phrase;
        if (words.length > 0) {
            if (addWordsBefore) {
                extendePhrase = chain.getRandomWalk(
                    new Word(words[0]),
                    word => word.isTerminal(),
                    "backwards"
                ).join(" ") + extendePhrase;
            }
            if (addWordsAfter) {
                extendePhrase = extendePhrase + chain.getRandomWalk(
                    new Word(words[words.length - 1]),
                    word => word.isTerminal(),
                ).join(" ");
            }
        }
        return extendePhrase;
    }

    /**
     * Feeds the Markov chain passed as a parameter with a new phrase.
     * @param chainId The Markov chain to feed.
     * @param phrase The phrase to add to the Markov chain.
     */
    storePhrase(chainId: number, phrase: string) {
        let chain = new MarkovChain<Word>(chainId, this.chainProperties);
        let words = [new InitialWord()].concat(
            phrase.split(/\s+/).map(string => new Word(string)),
            [new TerminalWord()]
        );
        chain.addTransitions(words);
    }

    /**
     * A list of all the transitions out of a certain word in the Markov
     * chain passed as a parameter.
     * @param chainId The Markov chain to be used.
     * @param word The word from which the transitions come out.
     */
    transitionsFrom(chainId: number, word: string): [string, number][] {
        let chain = new MarkovChain<Word>(chainId, this.chainProperties);
        return chain.transitionsFrom(new Word(word)).map(p => [p[0].string, p[1]] as [string, number]);
    }

    /**
     * A list of all the transitions into a certain word in the Markov
     * chain passed as a parameter.
     * @param chainId The Markov chain to be used.
     * @param word The word to which the transitions arrive.
     */
    transitionsTo(chainId: number, word: string): [string, number][] {
        let chain = new MarkovChain<Word>(chainId, this.chainProperties);
        return chain.transitionsTo(new Word(word)).map(p => [p[0].string, p[1]] as [string, number]);
    }
}
