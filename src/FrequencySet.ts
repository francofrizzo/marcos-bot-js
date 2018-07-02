export { FrequencySet, EqComparable }

/**
 * An object which can be compared by observational equality (`equals()`) with
 * an object of class T.
 */
interface EqComparable<T> {
    equals(other: T): boolean;
}

/**
 * This class represents a multiset, i.e., a set whose elements can appear
 * more than once.
 * It allows to retrieve a random element, with the probability of retrieving
 * a certain element of the set being the element's relative frequency.
 */
class FrequencySet<T extends EqComparable<T>> {
    public elementWrappers: FrequencySetElementWrapper<T>[] = [];
    public totalAppearences: number = 0;

    /**
     * Returns the wrapper of the element passed as a parameter, if the
     * element is already part of the set.
     * Otherwise, creates and returns a wrapper for the element or returns
     * undefined, depending on the value of the parameter
     * `createIfUnexistent`.
     * @param element The element whose wrapper is required.
     * @param createIfUnexistent If the required wrapper is unexistent,
     * defines whether it should be created.
     */
    private getWrapperFor(
        element: T, createIfUnexistent: boolean = true
    ): FrequencySetElementWrapper<T> {
        let wrapper = this.elementWrappers.filter(
            wrapper => wrapper.element.equals(element))[0];
        if (wrapper === undefined && createIfUnexistent) {
            wrapper = new FrequencySetElementWrapper<T>(element);
            this.elementWrappers.push(wrapper);
        }
        return wrapper;
    }

    /**
     * Gets the wrapper for an element (creating it if unexistent) and
     * executes a callback function with the wrapper as a parameter.
     * @param element The element whose wrapper is required.
     * @param callback A function to be called with the obtained wrapper.
     */
    private getWrapperAndDo<S>(
        element: T,
        callback: (wrapper: FrequencySetElementWrapper<T>) => S
    ): S {
        let wrapper = this.getWrapperFor(element);
        return callback(wrapper);
    }

    /**
     * Gets the wrapper for an element (only it if exists) and
     * executes a callback function with the wrapper as a parameter.
     * @param element The element whose wrapper is required.
     * @param callback A function to be called with the obtained wrapper,
     * if it exists.
     * @param elseCallback A function to be called or a value to be returned
     * if the required wrapper does not exist.
     */
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

    /**
     * Returns the number of times that an element appears in the set.
     */
    getFrequency(element: T): number {
        return this.ifWrapperExistsDo(element, wrapper => wrapper.frequency, 0);
    }

    /**
     * Returns the probability (between 0 and 1) of an element to be randomly
     * retrieved from the set.
     */
    getProbability(element: T): number {
        if (this.totalAppearences > 0)
            return this.getFrequency(element) / this.totalAppearences;
        else
            return 0;
    }

    /**
     * Returns the wrapper for a random element of the set, according to the
     * relative frequencies of each element.
     */
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

    /**
     * Returns a random element of the set, according to the relative
     * frequencies of each element.
     */
    getRandomElement(): T {
        return this.getRandomWrapper().element;
    }


    /**
     * Increments in `count` the number of times that an element appears in
     * the set.
     */
    addAppearences(element: T, count: number): void {
        this.getWrapperAndDo(element, wrapper => wrapper.addAppearences(count));
        this.totalAppearences += count;
    }

    /**
     * Reduces in `count` the number of times that an element appears in the
     * set.
     */
    removeAppearences(element: T, count: number): void {
        this.ifWrapperExistsDo(element, (wrapper) => {
            let effectiveCount = Math.min(count, wrapper.frequency);
            wrapper.removeAppearences(effectiveCount);
            this.totalAppearences -= count;
        });
    }

    /**
     * Increments in one the number of times that an element appears in the
     * set.
     */
    addAppearence(element: T): void {
        this.addAppearences(element, 1);
    }

    /**
     * Reduces in one the number of times that an element appears in the set.
     */
    removeAppearence(element: T): void {
        this.removeAppearences(element, 1);
    }

    /**
     * Returns an array with all the (unique) elements of the set.
     */
    getAllElements(): T[] {
        return this.elementWrappers.map(wrapper => wrapper.element);
    }
}

/**
 * Internal representation for the elements of a `FrequencySet`.
 * Contains the element itself and its frequency, and handles the logic
 * for modifying the frequency of the element.
 */
class FrequencySetElementWrapper<T extends EqComparable<T>> {
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
