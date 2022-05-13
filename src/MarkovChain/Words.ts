import { Serializable } from "./FrequencySet";
import { MarkovChain, MarkovChainProperties } from "./MarkovChain";
import { Haiku } from "../Utils/Haiku";
export { Word, InitialWord, TerminalWord, Phraser };

/**
 * Represents a word that can be used as a state for a Markov chain.
 */
class Word implements Serializable<Word> {
  public string: string;

  constructor(string: string) {
    this.string = string.toLowerCase();
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
   * Returns a pretty printable version of the word
   */
  print(): string {
    return this.string;
  }

  /**
   * Determines whether two words are the same or not.
   * @param other The other word to compare.
   */
  equals(other: Word): boolean {
    return (
      !other.isInitial() && !other.isTerminal() && this.string == other.string
    );
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
    else
      return new Word(
        aString.replace("_INIT", "INIT").replace("_TERM", "TERM")
      );
  }
}

/**
 * A special word marking the beginning of a phrase.
 */
class InitialWord extends Word {
  constructor() {
    super("");
  }
  isInitial(): boolean {
    return true;
  }
  print(): string {
    return "<start>";
  }
  equals(other: Word): boolean {
    return other.isInitial();
  }
  serialize(): string {
    return "INIT";
  }
}

/**
 * A special word marking the end of a phrase.
 */
class TerminalWord extends Word {
  constructor() {
    super("");
  }
  isTerminal(): boolean {
    return true;
  }
  print(): string {
    return "<end>";
  }
  equals(other: Word): boolean {
    return other.isTerminal();
  }
  serialize(): string {
    return "TERM";
  }
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
  chainProperties: MarkovChainProperties<Word>;

  /**
   * The properties of the Markov chains used by this Phraser.
   */
  constructor(chainProperties: MarkovChainProperties<Word>) {
    this.chainProperties = chainProperties;
  }

  /**
   * Converts an array of Words objects into a string array.
   */
  private static wordsToStringArray(words: Word[]): string[] {
    return words
      .filter((word) => !word.isInitial() && !word.isTerminal())
      .map((word) => word.string);
  }

  /**
   * Converts an array of Words objects into a string.
   */
  private static wordsToString(words: Word[]): string {
    return this.wordsToStringArray(words).join(" ");
  }

  /**
   * Converts a string into an array of Words objects.
   */
  private static stringToWords(phrase: string): Word[] {
    return [new InitialWord()].concat(
      phrase.split(/\s+/).map((string) => new Word(string)),
      [new TerminalWord()]
    );
  }

  /**
   * Generates a random phrase using the Markov chain whose identifier
   * is passed as a parameter.
   * @param chainId The identifier of the Markov chain to be used.
   */
  async generatePhrase(chainId: number): Promise<string> {
    let chain = new MarkovChain<Word>(chainId, this.chainProperties);
    return Phraser.wordsToString(
      await chain.getRandomWalk(new InitialWord(), (word) => word.isTerminal())
    );
  }

  /**
   * Generates a random phrase using the Markov chain whose identifier
   * is passed as a parameter.
   *
   * Note: the algorithms used to split words in syllabes and for rhymes are
   * tuned for the Spanish language.
   *
   * @param chainId The identifier of the Markov chain to be used.
   * @param maxTries How many times to try building a haiku before giving up.
   * @param initialString A initial string from which to generate the haiku.
   */
  async generateHaiku(
    chainId: number,
    initialString = "",
    maxTries = 20
  ): Promise<string[]> {
    let chain = new MarkovChain<Word>(chainId, this.chainProperties);
    for (let timesTried = 0; timesTried < maxTries; timesTried += 1) {
      try {
        const haiku = new Haiku(initialString);
        await chain.getRandomWalk(
          new InitialWord(),
          (word) => {
            haiku.extendWith(word.string);
            return haiku.isValid();
          },
          "forwards",
          async (word) => {
            if (word.isTerminal()) {
              return false;
            } else {
              const canBeExtended = haiku.canBeExtendedWithWord(word.string);
              return (
                canBeExtended === "incomplete" ||
                (canBeExtended === "complete" &&
                  (await chain.transitionsFrom(word)).some(([word]) =>
                    word.isTerminal()
                  ))
              );
            }
          }
        );
        return haiku.toStrings();
      } catch (err) {
        // we just go on trying
      }
    }
    throw Error("Unable to build a haiku for this chain");
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
  async extendPhrase(
    chainId: number,
    phrase: string,
    addWordsBefore: boolean,
    addWordsAfter: boolean
  ): Promise<string> {
    let chain = new MarkovChain<Word>(chainId, this.chainProperties);
    let words = phrase.split(" ");
    let extendedPhrase = phrase;
    if (words.length > 0) {
      if (
        addWordsBefore && // fix this, ridiculously underperforming
        (await chain.transitionsTo(new Word(words[0]))).length > 0
      ) {
        extendedPhrase =
          Phraser.wordsToString(
            (
              await chain.getRandomWalk(
                new Word(words[0]),
                (word) => word.isInitial(),
                "backwards"
              )
            )
              .slice(1)
              .reverse()
          ) +
          " " +
          extendedPhrase;
      }
      if (
        addWordsAfter &&
        (await chain.transitionsFrom(new Word(words[words.length - 1])))
          .length > 0
      ) {
        extendedPhrase =
          extendedPhrase +
          " " +
          Phraser.wordsToString(
            (
              await chain.getRandomWalk(
                new Word(words[words.length - 1]),
                (word) => word.isTerminal()
              )
            ).slice(1)
          );
      }
    }
    return extendedPhrase;
  }

  /**
   * Feeds the Markov chain passed as a parameter with a new phrase.
   * @param chainId The Markov chain to feed.
   * @param phrase The phrase to add to the Markov chain.
   */
  async storePhrase(chainId: number, phrase: string): Promise<void> {
    let chain = new MarkovChain<Word>(chainId, this.chainProperties);
    let words = Phraser.stringToWords(phrase);
    chain.addTransitions(words);
  }

  /**
   * A list of all the transitions out of a certain word in the Markov
   * chain passed as a parameter.
   * @param chainId The Markov chain to be used.
   * @param word The word from which the transitions come out.
   */
  async transitionsFrom(
    chainId: number,
    word: string
  ): Promise<[string, number][]> {
    let chain = new MarkovChain<Word>(chainId, this.chainProperties);
    return (await chain.transitionsFrom(new Word(word))).map(
      (p) => [p[0].print(), p[1]] as [string, number]
    );
  }

  /**
   * A list of all the transitions into a certain word in the Markov
   * chain passed as a parameter.
   * @param chainId The Markov chain to be used.
   * @param word The word to which the transitions arrive.
   */
  async transitionsTo(
    chainId: number,
    word: string
  ): Promise<[string, number][]> {
    let chain = new MarkovChain<Word>(chainId, this.chainProperties);
    return (await chain.transitionsTo(new Word(word))).map(
      (p) => [p[0].print(), p[1]] as [string, number]
    );
  }
}
