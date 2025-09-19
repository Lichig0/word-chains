const { parentPort, workerData } = require('node:worker_threads');

const JOBS = {
    CREATE_SENTENCE: 'create_sentence',
    CHOOSE_RANDOM_PREV_WORD: 'find_rand_prev_word',
    CHOOSE_RANDOM_NEXT_WORD: 'find_rand_next_word',
    FIND_END_PATHS: 'find_end_paths',
};

const MESSAGES = {
    ERROR: 'error',
    DONE: 'done',
    REQUEST: 'request',
    RESPONSE: 'response'
}

const CORPUS_REQUESTS = {
    GET_CHAIN_DATA: 'get_chain_data',
    GET_START_WORDS: 'get_start_words', 
    GET_END_WORDS: 'get_end_words',
    GET_WORD_DATA: 'get_word_data'
}

const __END__ = 1;
const __START__ = 0;

// Helper functions for requesting corpus data
const requestWordData = async (word) => {
    parentPort.postMessage({ type: MESSAGES.REQUEST, request: CORPUS_REQUESTS.GET_WORD_DATA, word });
    return new Promise((resolve) => {
        parentPort.once('message', (message) => {
            if (message.type === MESSAGES.RESPONSE && message.request === CORPUS_REQUESTS.GET_WORD_DATA) {
                resolve(message.data);
            }
        });
    });
};

const requestStartWords = async () => {
    parentPort.postMessage({ type: MESSAGES.REQUEST, request: CORPUS_REQUESTS.GET_START_WORDS });
    return new Promise((resolve) => {
        parentPort.once('message', (message) => {
            if (message.type === MESSAGES.RESPONSE && message.request === CORPUS_REQUESTS.GET_START_WORDS) {
                resolve(message.data);
            }
        });
    });
};

const requestEndWords = async () => {
    parentPort.postMessage({ type: MESSAGES.REQUEST, request: CORPUS_REQUESTS.GET_END_WORDS });
    return new Promise((resolve) => {
        parentPort.once('message', (message) => {
            if (message.type === MESSAGES.RESPONSE && message.request === CORPUS_REQUESTS.GET_END_WORDS) {
                resolve(message.data);
            }
        });
    });
};
const _generateSentence = async (corpus, input) => {
    const chainWorkers = [
        _createStartChainWorker(corpus, input),
        _createEndChainWorker(corpus, input)
      ];
    try {
        const [startChain, endChain] = await Promise.all(chainWorkers)
        sentence = _removeOverlap(startChain.list.concat(input).concat(endChain.list)).join(' ');
        referenced = {...startChain.referenced, ...endChain.referenced};

        return Promise.resolve({
            refs: referenced,
            text: sentence,
            string: sentence,
        })
    } catch (e) {
        return Promise.reject(e);
    }

}

const _findChainEnd = async (word) => {
    let referenced = {};
    let initTime = Date.now();
    let currentWord = word;
    let sentence = '';
    let list = [];
    const pickedWords = new Set();

    const _addToken = (token) => {
        pickedWords.add(token);
        list.push(token);
    };

    // Get initial set of end words for reference
    const endWords = await requestEndWords();

    // const pathEnd = _pathToEnd(corpus, currentWord);
    // console.log(pathEnd);

    // Keep generating words until we reach the end of the chain
    while (currentWord && currentWord !== 1) {
        const wordData = await requestWordData(currentWord);
        if (!wordData) break;

        if (Date.now() - initTime > 6000) {
            const eWords = Array.from(endWords.keys());
            currentWord = eWords[Math.floor(Math.random() * eWords.length)];
            console.warn(`Markov took too long("${sentence}"). Forcing: " ${currentWord}"`);
            _addToken(currentWord);
            sentence = ` ${currentWord}`;
            break;
        }

        // Choose a random next word from the list of next words for the current word
        const nextWord = await _chooseRandomNextWord(currentWord, wordData);
        
        // If we couldn't choose a next word, break out of the loop
        if (!nextWord || ((sentence + sentence).indexOf(sentence, 1) != sentence.length)) {
            break;
        }

        if(pickedWords.size > 0 && list.length > (pickedWords.size * 2)) {
            break;
        }

        // Add the next word to the sentence
        sentence += ' ' + nextWord.split(' ').shift();

        _addToken(nextWord)
        // Set the current word to the next word
        currentWord = nextWord;
        const nextWordData = await requestWordData(currentWord)
        referenced = { ...referenced, ...nextWordData?.refs };
    }
    return {sentence, referenced, list};
}

// const _findChainEndPaths = (corpus, startingPoint) => {
//     const { chain, endWords } = corpus;
//     let outcomes = [];
//     let referenced = {}; // Do we need this?
//     let initTime = Date.now();
//     let currentToken = startingPoint;
//     let sentence = ''; // I don't think we're going to do this here.
//     let list = []; // Make this a counter probably
//     const pickedTokens = new Set();

//     while(currentToken && chain.has(currentToken) && currentToken !== __END__) {

//     }
// }

const _pathToEnd = ( corpus, currentToken, visits = 1, visited = new Set().add(currentToken)) => {
    const { chain, endWords } = corpus;
    const nextTokens = chain.get(currentToken).nextWords;
    // console.log(currentToken, visits, visited )
    // If we're at the end of the road
    if(nextTokens.size === 0 || endWords.get(currentToken)) {
        return [currentToken];
    }

    //TEMPORARY MEASURES
    if(visits > 10) {
        return [currentToken];
    }

    // If we've added the same thing too many times
    if(visits > visits.size * 2) {
        return [currentToken];
    }

    //TEMPORARY MEASURES
    if(endWords.get(currentToken)) {
        console.warn(currentToken, 'IS AN END WORD AND WE DID NOT END');
    }

    const paths = [...nextTokens].map(([word, totalValue]) => { return { word , totalValue}});

    const cookieTrail = [];
    console.log('STARTS: ', paths);
    paths.forEach((path, p) => {
        cookieTrail.push([path.word])
        let forks = [chain.get(path.word).nextWords];
        let gaz = new Set();
        for(i = 0; i < forks.length && forks.length < 100 ; i++) {
            // console.log(forks);
            forks[i].forEach((value, word) => {
                gaz.add(word);
                const nw = chain.get(word).nextWords
                if(nw.size) {
                    forks.push(chain.get(word).nextWords)
                }
            })
        }
        cookieTrail[p].push(forks.map(f=>[...f.keys()]));
    });

    // const paths = [...nextTokens.keys()].map((nextT) => {
    //     return { [currentToken]: _pathToEnd(corpus, nextT, visits+1, visited.add(nextT)) };
    // });
    console.log('DONE', cookieTrail);
    cookieTrail.forEach(t => console.log(t.for));
    return paths;
}

// A helper function that chooses a random next word from the list of next words for a given word
const _chooseRandomNextWord = async (word, wordData) => {
    const nextWords = wordData.nextWords;

    // If there are no next words, return null
    if (nextWords.size === 0) {
        return null;
    }

    // Choose a random index from the list of next words
    const nextWordIndex = Math.floor(Math.random() * nextWords.size);

    const select = Math.random() * wordData.nw + 1;
    let accumulate = wordData.nw;
    let picked = Array.from(nextWords.keys())[nextWordIndex];
    
    for (const next of nextWords.keys()) {
        accumulate -= nextWords.get(next);
        const inAfterWords = Object.values(wordData.refs).some((reference) => {
            return word.split(' ').some(w => {
                return reference?.afterWords?.includes(w);
            });
        });
        if (accumulate <= select && next !== word || inAfterWords) {
            picked = next;
            break;
        }
    }
    // Return the next word picked.
    return picked;

};

const _findChainStart = async (word) => {
    let referenced = {};
    let initTime = Date.now();
    let currentWord = word;
    let sentence = '';
    let list = [];
    const pickedWords = new Set();

    const _addToken = (token) => {
        pickedWords.add(token);
        list.push(token);
    };

    const startWords = await requestStartWords();

    while (currentWord && currentWord !== 0) {
        const wordData = await requestWordData(currentWord);
        if (!wordData) break;

        // Stop if taking too long
        if (Date.now() - initTime > 6000) {
            const sWords = Array.from(startWords.keys());
            currentWord = sWords[Math.floor(Math.random() * sWords.length)];
            console.warn(`Markov took too long("${sentence}"). Forcing: "${currentWord} "`);
            _addToken(currentWord);
            sentence = `${currentWord} `;
            break;
        }

        // Choose a random previous word from the list of previous words for the current word
        const previousWord = _chooseRandomPreviousWord(currentWord, wordData);

        // If we couldn't choose a previous word, break out of the loop
        if (!previousWord || ((sentence + sentence).indexOf(sentence, 1) != sentence.length)) {
            break;
        }

        if (pickedWords.size > 0 && list.length > (pickedWords.size * 2)) {
            break;
        }

        // Prepend to previous word to the sentence
        sentence = previousWord.split(' ').pop() + ' ' + sentence;

        _addToken(previousWord);
        // Set the current word to the previous word
        currentWord = previousWord;
        const previousWordData = await requestWordData(currentWord)
        referenced = { ...referenced, ...previousWordData?.refs };
    }
    return {sentence, referenced, list: list.reverse()};
}

// A helper function that chooses a random previous word form the list of previous words for a given word
const _chooseRandomPreviousWord = function (word, wordData) {
    // Get the list of previous words for the given word
    const previousWords = wordData.previousWords;
    // If there are no previous words, return null
    if (previousWords.size === 0) {
        return null;
    }

    // Choose a random index from the list of previous words
    const previousWordIndex = Math.floor(Math.random() * previousWords.size);

    // Return the previous word at the chosen index

    // Choose the next word based on it's weight.
    const select = Math.random() * wordData.pw + 1;
    let accumulate = wordData.pw;
    let picked = Array.from(previousWords.keys())[previousWordIndex];

    for (const previous of previousWords.keys()) {
        accumulate += previousWords.get(previous);
        const inBeforeWords = Object.values(wordData.refs).some((reference) => {
            return word.split(' ').some(w => {
                return reference?.beforeWords?.includes(w);
            });
        });
        if (accumulate <= select && previous !== word || inBeforeWords) {
            picked = previous;
            break;
        }
    }
    // Return the previous word picked.
    return picked;
}

const _removeOverlap = (tokens) => {
    const resplit = tokens.map((token, index, tokens) => {
      if(index === tokens.length - 1) {
        return token;
      }
      return token.split(' ')[0];
    });
    return resplit
}

switch (workerData?.job) {
    case JOBS.CREATE_SENTENCE:
        _generateSentence(workerData.options).then(parentPort.postMessage);
        break;
    case JOBS.CHOOSE_RANDOM_PREV_WORD:
        _findChainStart(workerData.options.word)
            .then(result => parentPort.postMessage(result))
            .catch(error => parentPort.postMessage({ type: MESSAGES.ERROR, error }));
        break;
    case JOBS.CHOOSE_RANDOM_NEXT_WORD:
        _findChainEnd(workerData.options.word)
            .then(result => parentPort.postMessage(result))
            .catch(error => parentPort.postMessage({ type: MESSAGES.ERROR, error }));
        break;
    case JOBS.FIND_END_PATHS:
        _pathToEnd(workerData.options.word)
            .then(result => parentPort.postMessage(result))
            .catch(error => parentPort.postMessage({ type: MESSAGES.ERROR, error }));
        break;
    default:
        throw (`${workerData?.job} is not a valid job.`)
}

module.exports.JOBS = JOBS;