import { FrequencySet, Serializable } from "./FrequencySet"
import { DatabaseQuerier } from "../Database/Database"
export { MarkovChain, MarkovChainProperties }

// TODO: Add mutations to generation

interface MarkovChainProperties<T> {
    mutationProbability: number;
}

/**
 * A Markov chain is a mathematical structure that represents a stochastic
 * proccess, i.e., a series of state transitions in which the probability 
 * for a certain transition to occur depends solely on the current state
 * of the proccess (and not on any of the previous states).
 * This class allows the representation of a Markov chain in which the
 * states are elements of the type T.
 */
class MarkovChain<T extends Serializable<T>> {
    id: number;
    properties: MarkovChainProperties<T>;

    /**
     * @param id An identifier for the chain. It allows the data to be
     * persisted.
     * @param properties Options for modifying the behaviour of the chain.
     */
    constructor(id: number, properties: MarkovChainProperties<T>) {
        this.id = id;
        this.properties = properties;
    }

    /**
     * Generates a node for a certain state of the chain.
     */
    private generateNode(state: T): MarkovChainNode<T> {
        return new MarkovChainNode<T>(state, this);
    }

    /**
     * Generates a node for a certain state of the chain and perform a
     * callback function with this node as a parameter.
     * Returns the result of the callback function.
     */
    private withNodeDo<S>(state: T, callback: (node: MarkovChainNode<T>) => S): S {
        return callback(this.generateNode(state));
    }

    /**
     * Increments in one the frequency of the transition between two states
     * of the chain.
     * @param fromState The initial state of the transition to add.
     * @param toState The final state of the transition to add.
     */
    async addTransition(fromState: T, toState: T): Promise<void> {
        this.withNodeDo(fromState, node => node.addTransitionTo(toState));
    }

    /**
     * Recieves an array of states of the chain and adds a transition
     * between each pair of consecutive elements of the array,
     */
    async addTransitions(states: T[]): Promise<void> {
        for (let index = 1; index < states.length; index++) {
            this.addTransition(states[index - 1], states[index]);
        }
    }

    /**
     * Generates a random instance of the stochastic proccess represented by
     * the chain. Returns an array containing a node for each staet of the
     * walk.
     * @param startingNode The first node to visit. 
     * @param stoppingCriteria A predicate that takes up to two parameters,
     * a node and an index, and determines whether the walk should finish
     * immediately after the current node.
     * @param advancingFunction A function that determines how to obtain the
     * next node to visit.
     */
    private async getRandomWalkNodes(
        startingNode: MarkovChainNode<T>,
        stoppingCriteria: (node: MarkovChainNode<T>, index?: number) => boolean,
        advancingFunction: (node: MarkovChainNode<T>) => Promise<MarkovChainNode<T>>
    ): Promise<MarkovChainNode<T>[]> {
        let walk: MarkovChainNode<T>[] = [];
        let currentNode = startingNode;
        let index = 0;
        walk.push(currentNode);
        while (!stoppingCriteria(currentNode, index)) {
            currentNode = await advancingFunction(currentNode);
            index++;
            walk.push(currentNode);
        }
        return walk;
    }

    /**
     * Generates a random instance of the stochastic proccess represented by
     * the chain.
     * @param startingState The first state of the walk.
     * @param stoppingCriteria A predicate that takes up to two parameters,
     * a state and an index, and determines whether the walk should finish
     * immediately after the current state.
     * @param direction The direction in which to walk; it can be 'forwards'
     * or 'backwards'.
     */
    async getRandomWalk(
        startingState: T,
        stoppingCriteria: (state: T, index?: number) => boolean,
        direction: "forwards" | "backwards" = "forwards"
    ): Promise<T[]> {
        let startingNode = this.generateNode(startingState);
        let advancingFunction = direction == "forwards"
            ? (node: MarkovChainNode<T>) => node.getRandomNextNode()
            : (node: MarkovChainNode<T>) => node.getRandomPreviousNode()
        let walkNodes = await this.getRandomWalkNodes(
            startingNode,
            (node, index) => stoppingCriteria(node.content, index),
            advancingFunction
        )
        return walkNodes.map(node => node.content);
    }

    /**
     * Given a certain state of the chain, returns an array of all the
     * possible transitions departing from it and the probability for each
     * of them to occur.
     */
    async transitionsFrom(state: T): Promise<[T, number][]> {
        let transitions = await this.withNodeDo(state, node => node.getTransitionsFromHere())
        return transitions.getAllElements().map(state =>
            [state, transitions.getProbability(state)] as [T, number]
        );
    }

    /**
     * Given a certain state of the chain, returns an array of all the
     * possible transitions arriving to it and the probability for each
     * of them to occur.
     */
    async transitionsTo(state: T): Promise<[T, number][]> {
        let transitions = await this.withNodeDo(state, node => node.getTransitionsToHere())
        return transitions.getAllElements().map(state =>
            [state, transitions.getProbability(state)] as [T, number]
        );
    }
}

/**
 * A temporary and auxiliary structure that wraps a state of a Markov chain.
 * It encapsulates the logic necessary for querying, modifying and persisting
 * the transitions in and out of a certain state.
 */
class MarkovChainNode<T extends Serializable<T>> {
    content: T;
    chain: MarkovChain<T>;

    /**
     * @param content The state represented by this node.
     * @param chain The Markov chain to which this node is associated.
     */
    constructor(content: T, chain: MarkovChain<T>) {
        this.content = content;
        this.chain = chain;
    }

    /**
     * Creates and returns a DatabaseQuerier for the Markov chain to which
     * this node is associated.
     */
    private createQuerier(): DatabaseQuerier<T> {
        return new DatabaseQuerier<T>(this.chain.id);
    }

    /**
     * Creates a DatabaseQuerier for the Markov chain to which this node is
     * associated, and perform a callback function that recieves this querier
     * as a parameter. Returns the result of the callback function.
     */
    private withQuerierDo<S>(callback: (querier: DatabaseQuerier<T>) => S): S {
        let querier = this.createQuerier();
        return callback(querier);
    }

    /**
     * Adds an persists a transition from the state represented by this node
     * to the state passed as a parameter.
     */
    async addTransitionTo(toState: T): Promise<void> {
        this.withQuerierDo(querier => querier.addTransition(this.content, toState));
    }

    /**
     * Gets a node representing a random state following from the state
     * represented by this node.
     */
    async getRandomNextNode(): Promise<MarkovChainNode<T>> {
        let transitions = await this.getTransitionsFromHere();
        if (!transitions.isEmpty()) {
            return new MarkovChainNode<T>(transitions.getRandomElement(), this.chain);
        }
        else {
            throw Error("There are no transitions going out of this state");
        }
    }

    /**
     * Gets a node representing a random state preceding the state represented
     * by this node.
     */
    async getRandomPreviousNode(): Promise<MarkovChainNode<T>> {
        let transitions = await this.getTransitionsToHere();
        if (!transitions.isEmpty()) {
            return new MarkovChainNode<T>(transitions.getRandomElement(), this.chain);
        }
        else {
            throw Error("There are no transitions arriving to this state");
        }
    }

    /**
     * Gets a FrequencySet with all the states that may follow the current
     * state and the probability of the transition to occur.
     */
    async getTransitionsFromHere(): Promise<FrequencySet<T>> {
        return this.withQuerierDo(async querier => await querier.getTransitionsFrom(this.content))
    }

    /**
     * Gets a FrequencySet with all the states that may precede the current
     * state and the probability of the transition to occur.
     */
    async getTransitionsToHere(): Promise<FrequencySet<T>> {
        return this.withQuerierDo(async querier => await querier.getTransitionsTo(this.content))
    }
}
