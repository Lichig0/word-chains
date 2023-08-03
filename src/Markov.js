const { Worker } = require('node:worker_threads');

const JOBS = {
  CREATE_SENTENCE: 'create_sentence',
  CHOOSE_RANDOM_PREV_WORD: 'find_rand_prev_word',
  CHOOSE_RANDOM_NEXT_WORD: 'find_rand_next_word',
};

module.exports.MarkovChain = function(size = 1) {
  this.stateSize = size;
  this.chain = new Map();
  this.startWords = new Map();
  this.endWords = new Map();
  this.corpus = {
    chain: this.chain,
    startWords: this.startWords,
    endWords: this.endWords
  };

  this.buildChain = function(words, metadata) {
    //Inject timestamp to ID metadata
    const timestamp = Date.now();
    metadata = {
      ...metadata,
      mid: timestamp,
    }
    // Iterate over the words and add each word to the chain
    for (let i = 0; i < words.length-(this.stateSize-1); i++) {
      const word = words.slice(i,i+this.stateSize).join(" ");
      if(word === '' || !word) {
        // console.error(`Cannot index ${word}: `, word);
        return;
      }
      // If the word is not already in the chain, add it
      if (!this.chain.has(word)) {
        this.chain.set(word, {
          refs: {},
          nextWords: new Map(),
          nw: 0,
          previousWords: new Map(),
          pw: 0,
        });
      }

      this.chain.get(word).refs[timestamp] = {timestamp, ...metadata};
      // If is a start word, and isn't already indexed as a start word
      if(i === 0 && !this.startWords[word]) {
        this.startWords.set(word, this.chain.get(word));
      }

      // If is an end word, and isn't already indexed as an end word
      if(i == (words.length - (this.stateSize-1)) && !this.endWords.has(word)) {
        this.endWords.set(word, this.chain.get(word));
      }

      // If there is a next word, add it to the list of next words for the current word
      if (i < words.length - (this.stateSize-1)) {
        const nextWord = words.slice(i+1,i+this.stateSize+1).join(" ");
        this.chain.get(word).nextWords.set(nextWord, (this.chain.get(word).nextWords.get(nextWord) || 0) + 1);
        this.chain.get(word).nw++;
      }

      //If there is a previous word, add it to the list of previous words for the current word
      if (i > 0) {
        const previousWord = words.slice(i-1,i-1+this.stateSize).join(" ");
        this.chain.get(word).previousWords.set(previousWord, (this.chain.get(word).previousWords.get(previousWord) || 0) + 1);
        this.chain.get(word).pw++;
      }
    }
  };

  this.addString = function(sentence, data) {
    if(Array.isArray(sentence)) {
      sentence.forEach( (str, index, arr) => {
        if(typeof str === 'string') {
          this.addString(str, data, arr[index+1]);
        } else {
          // Perhapse flatten incoming arrays?
          console.warn('Do not feed Arrays of Arrays');
          return;
        }
      });
    } else if(sentence === undefined || sentence === ' ' || sentence === '') {
      console.warn(sentence, 'not defined, skipping...');
      return;
    } else if (sentence) {
      if(!sentence.split) {
        console.warn(sentence, 'is a bad egg');
        return;
      }
      const words = sentence.trim().split(' ');
      if(!Array.isArray(words)) {
        console.error(words, 'is not array');
        return;
      }
      this.buildChain(words, { ...data});
    }
  }

  this.generateSentence = async function(options = {}) {
    // If options are just a string, set it as the input option
    if(typeof options === 'string') {
      options = {
        input: options
      };
    }

    let {
      input,
      retries = 20,
      filter = (result) => result.text.split(' ').length >= 2,
    } = options;

    let sentence = '';
    const inputStates = [];
    input?.split(' ').forEach((inWord, index, array) => {
      inputStates.push(array.slice(index, index + this.stateSize).join(" "));
    })
    input = inputStates.some(inputState => this.chain.has(inputState)) ? input : undefined;

    console.debug('Generating', `input: ${input}`)

    for(let i = 0; i < retries; i++) {
      const sWords = Array.from(this.startWords.keys());
      let referenced = {};
      // sWords[Math.floor(Math.random()*sWords.length)];
      input = input ?? sWords[Math.floor(Math.random()*sWords.length)];
      // Start the sentence with the starting word
      sentence = this.startWords.get(input) ? input.split(' ').shift() : input;

      // Set the current word to the starting word
      const chainWorkers = [
        _createStartChainWorker(this.corpus, input),
        _createEndChainWorker(this.corpus, input)
      ];

      const [startChain, endChain] = await Promise.all(chainWorkers)
      sentence = `${startChain.sentence ? startChain.sentence : ''}${input}${endChain.sentence ? endChain.sentence : '...'}`;
      referenced = {...startChain.referenced, ...endChain.referenced};

      const result = {
        refs: referenced,
        text: sentence,
        string: sentence,
      }
      // Check if the sentence passes the filter
      if(filter(result)) {
        // Resolve and return sentence
        return(result);
      }
    }
    throw(`Could not generate sentence after ${retries} attempts`);
  };

  const _createEndChainWorker = (corpus, word) => {
    return new Promise((resolve, reject) => {
      const endChainWorker = new Worker(`${__dirname}/Workers.js`, {
        workerData: {
          corpus,
          job: JOBS.CHOOSE_RANDOM_NEXT_WORD,
          options: {
            word          
          }
        }
      });
      endChainWorker.on('message', resolve);
      endChainWorker.on('messageerror', reject);
    });
  }

  const _createStartChainWorker = (corpus, word) => {
    return new Promise((resolve, reject) => {
      const endChainWorker = new Worker(`${__dirname}/Workers.js`, {
        workerData: {
          corpus,
          job: JOBS.CHOOSE_RANDOM_PREV_WORD,
          options: {
            word          
          }
        }
      });
      endChainWorker.on('message', resolve);
      endChainWorker.on('messageerror', reject);
    });
  }
}

// Example
module.exports.example = function() {
  const markovChain = new exports.MarkovChain('hello world this is a string with metadata');
  markovChain.buildChain();

  const sentence = markovChain.generateSentence('hello');
  // "hello world this is a string"
  console.log(sentence);
  return(sentence);
}
