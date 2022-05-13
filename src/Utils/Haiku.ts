const S_VOWEL = /[aeoáéóíú]/i; // Strong vowel
const W_VOWEL = /[iuüÜ]/i; // Weak vowel
const L_CONSONANT = /[lr]/i; // Liquid Consonant
const O_CONSONANT = /[bcdfgpt]/i; // Obstruent Consonant
const VOWEL = /^[aeiouáéíóúü]/i; // Vowel
const CONSONANT = /^[b-df-hj-np-tv-zñ]/i; // Consonant
const A_VOWEL = /[áéóíú]/i; // Accented Vowel
const NSVOWEL = /[nsaeiou]/i; // N, S or Vowel
const H = /^[h]/i; // H
const Y = /^[y]/i; // Y

const DIPHTHONG = new RegExp(
  `(?!^ií)^(${S_VOWEL.source}h?${W_VOWEL.source}|${W_VOWEL.source}h?${S_VOWEL.source}|ui|iu|uy|yu)`,
  "i"
);
const TRIPHTHONG = new RegExp(
  `^(${W_VOWEL.source}${S_VOWEL.source}(?:${W_VOWEL.source}|y))`,
  "i"
);
const CONSONANT_GROUPS = new RegExp(
  `^(${O_CONSONANT.source}${L_CONSONANT.source}|dr|kr|ll|rr|ch)`,
  "i"
);

const syllabeSplit = (word: string) => {
  word = word || "";
  const syllables = [];

  for (
    let letter = 0, jump = 0, len = word.length;
    letter < len;
    letter = jump
  ) {
    // Onset
    if (CONSONANT_GROUPS.test(word.substr(jump))) {
      jump += 2;
    } else if (CONSONANT.test(word[jump])) {
      jump += 1;
    }

    // Nucleus
    if (TRIPHTHONG.test(word.substr(jump))) {
      jump += 3;
    } else if (DIPHTHONG.test(word.substr(jump))) {
      jump += 2;
    } else if (VOWEL.test(word[jump]) || Y.test(word[jump])) {
      // sometimes y can act as a vowel
      jump += 1;
    } else {
      throw new Error("A vowel was expected");
    }

    // Coda
    if (len - jump < 2 && CONSONANT.test(word[jump])) {
      jump += 1;
    } else if (len - jump > 1 && CONSONANT_GROUPS.test(word.substr(jump))) {
      jump += 0;
    } else if (
      len - jump > 1 &&
      CONSONANT.test(word[jump]) &&
      VOWEL.test(word[jump + 1])
    ) {
      jump += 0;
    } else if (
      len - jump > 2 &&
      CONSONANT.test(word[jump]) &&
      CONSONANT.test(word[jump + 1]) &&
      VOWEL.test(word[jump + 2])
    ) {
      jump += 1;
    } else if (
      len - jump > 3 &&
      CONSONANT.test(word[jump]) &&
      CONSONANT_GROUPS.test(word.substr(jump + 1)) &&
      VOWEL.test(word[jump + 3])
    ) {
      jump += 1;
    } else if (
      len - jump > 3 &&
      CONSONANT.test(word[jump]) &&
      CONSONANT.test(word[jump + 1]) &&
      CONSONANT.test(word[jump + 2]) &&
      VOWEL.test(word[jump + 3])
    ) {
      jump += 2;
    } else if (
      len - jump > 3 &&
      CONSONANT.test(word[jump]) &&
      CONSONANT.test(word[jump + 1]) &&
      CONSONANT.test(word[jump + 2]) &&
      CONSONANT.test(word[jump + 3])
    ) {
      jump += 2;
    }

    syllables.push(word.substring(letter, jump));
  }

  return syllables;
};

const findAccentedSyllabe = (word: string, syllabes: string[]): number => {
  let accentedSyllabe = syllabes.findIndex((s) => A_VOWEL.test(s));
  if (accentedSyllabe < 0) {
    accentedSyllabe = NSVOWEL.test(word[word.length])
      ? syllabes.length - 2
      : syllabes.length - 1;
  }
  accentedSyllabe = syllabes.length - accentedSyllabe - 1;
  return accentedSyllabe;
};

type Word = {
  word: string;
  syllabes: string[];
  accentedSyllabe: number;
  startsWithVowel: boolean;
  endsWithVowel: boolean;
};
class Verse {
  public words: Word[] = [];
  private precomputedMetricLength: number | null = null;

  constructor(...words: string[]) {
    this.addWords(...words);
  }

  public addWords(...words: string[]) {
    this.words.push(...words.map((word) => Verse.enrichWord(word)));
    this.precomputedMetricLength = null;
  }

  public metricLength(...additionalWords: string[]): number {
    if (additionalWords.length === 0 && this.precomputedMetricLength !== null) {
      return this.precomputedMetricLength;
    }
    let length = 0;
    const words = [
      ...this.words,
      ...additionalWords.map((w) => Verse.enrichWord(w)),
    ];
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let wordSyllabeCount = word.syllabes.length;
      if (
        i > 0 &&
        words[i - 1].endsWithVowel &&
        word.startsWithVowel &&
        word.accentedSyllabe !== word.syllabes.length - 1
      ) {
        wordSyllabeCount -= 1;
      }
      if (i === words.length - 1) {
        wordSyllabeCount += Math.max(-1, 1 - word.accentedSyllabe);
      }
      length += wordSyllabeCount;
    }
    if (additionalWords.length === 0) {
      this.precomputedMetricLength = length;
    }
    return length;
  }

  public toString(): string {
    return this.words.map((w) => w.word).join(" ");
  }

  private static enrichWord(word: string): Word {
    const syllabes = syllabeSplit(word);
    const accentedSyllabe = findAccentedSyllabe(word, syllabes);
    return {
      word,
      syllabes,
      accentedSyllabe,
      startsWithVowel:
        VOWEL.test(word[0]) || (H.test(word[0]) && VOWEL.test(word[1])),
      endsWithVowel:
        VOWEL.test(word[word.length - 1]) || Y.test(word[word.length - 1]),
    };
  }
}

export class Haiku {
  private static expectedStructure = [5, 7, 5];
  public verses: Verse[] = [new Verse()];

  constructor(...initialWords: string[]) {
    initialWords.forEach((word) => this.extendWith(word));
  }

  canBeExtendedWithWord(word: string): "complete" | "incomplete" | "false" {
    try {
      if (
        this.verses[this.verses.length - 1].metricLength() <
        Haiku.expectedStructure[this.verses.length - 1]
      ) {
        // There is still room in the current verse
        const verseLengthWithNewWord =
          this.verses[this.verses.length - 1].metricLength(word);
        const expectedVerseLength =
          Haiku.expectedStructure[this.verses.length - 1];
        if (
          this.verses.length === Haiku.expectedStructure.length &&
          verseLengthWithNewWord === expectedVerseLength
        ) {
          // The new word completes the last verse
          return "complete";
        } else if (verseLengthWithNewWord <= expectedVerseLength) {
          // The new word fits in the verse and there is extra space,
          // or the verse is not the last one
          return "incomplete";
        } else {
          // The new word is too long for fitting the next verse
          return "false";
        }
      } else {
        // We need to add a new verse
        if (this.verses.length < Haiku.expectedStructure.length) {
          // We still can add verses
          const newWordLength = new Verse(word).metricLength();
          const expectedVerseLength =
            Haiku.expectedStructure[this.verses.length];
          if (
            this.verses.length === Haiku.expectedStructure.length - 1 &&
            newWordLength === expectedVerseLength
          ) {
            // The new word completes the last verse
            return "complete";
          } else if (newWordLength <= expectedVerseLength) {
            // The new word fits in the next verse and there is extra space,
            // or the verse is not the last one
            return "incomplete";
          } else {
            // The new word is too long for fitting the next verse
            return "false";
          }
        } else {
          // There are no room for more verses
          return "false";
        }
      }
    } catch {
      // There was a problem trying to add the word (probably, splitting it
      // into syllabes)
      return "false";
    }
  }

  extendWith(word: string) {
    if (
      this.verses[this.verses.length - 1].metricLength() <
      Haiku.expectedStructure[this.verses.length - 1]
    ) {
      this.verses[this.verses.length - 1].addWords(word);
    } else {
      this.verses.push(new Verse(word));
    }
  }

  isValid(): boolean {
    return (
      this.verses.length === 3 &&
      this.verses.every(
        (verse, i) => verse.metricLength() === Haiku.expectedStructure[i]
      )
    );
  }

  toStrings(): string[] {
    return this.verses.map((v) => v.toString());
  }
}
