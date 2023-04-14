module.exports.MarkovChain = function(size = 1) {
  this.stateSize = size;
  this.chain = {};
  this.startWords = {};
  this.endWords = {};

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
      if (!this.chain[word]?.refs) {
        this.chain[word] = {
          refs: {},
          nextWords: {},
          nw: 0,
          previousWords: {},
          pw: 0,
        };
      }

      this.chain[word].refs[timestamp] = {timestamp, ...metadata};
      // If is a start word, and isn't already indexed as a start word
      if(i === 0 && !this.startWords[word]) {
        this.startWords[word] = this.chain[word];
      }

      // If is an end word, and isn't already indexed as an end word
      if(i == (words.length - (this.stateSize-1)) && !this.endWords[word]) {
        this.endWords[word] = this.chain[word];
      }

      // If there is a next word, add it to the list of next words for the current word
      if (i < words.length - (this.stateSize-1)) {
        const nextWord = words.slice(i+1,i+this.stateSize+1).join(" ");
        this.chain[word].nextWords[nextWord] = (this.chain[word].nextWords[nextWord] || 0) + 1;
        this.chain[word].nw++;
      }

      //If there is a previous word, add it to the list of previous words for the current word
      if (i > 0) {
        const previousWord = words.slice(i-1,i-1+this.stateSize).join(" ");
        this.chain[word].previousWords[previousWord] = (this.chain[word].previousWords[previousWord] || 0) + 1;
        this.chain[word].pw++;
      }
    }
  };

  this.addString = function(sentence, data) {
    if(Array.isArray(sentence)) {
      sentence.forEach(str => {
        if(typeof str === 'string') {
          this.addString(str, data);
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
      this.buildChain(words, { ...data, sentence: sentence });
    }
  }

  this.generateSentence = async function(options = {}) {
    return new Promise((resolve, reject) => {
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
      prng = Math.random,
    } = options;

    let sentence = '';
    const inputStates = [];
    input?.split(' ').forEach((inWord, index, array) => {
      inputStates.push(array.slice(index, index + this.stateSize).join(" "));
    })
    input = inputStates.some(inputState => this.chain[inputState] !== undefined) ? input : undefined;

    console.debug('Generating', `input: ${input}`)

    for(let i = 0; i < retries; i++) {
      const sWords = Object.keys(this.startWords);
      let referenced = {};
      // sWords[Math.floor(prng()*sWords.length)];
      input = input ?? sWords[Math.floor(prng()*sWords.length)];
      // Start the sentence with the starting word
      sentence = this.startWords[input] ? input.split(' ').shift() : input;

      // Set the current word to the starting word
      let currentWord = input;

      let initTime = Date.now()
      // Keep generating words until we reach the end of the chain
      while (currentWord && this.chain[currentWord] && !this.endWords[currentWord]) {
        if(Date.now() - initTime > 6000) {
          console.warn('Markov took too long.', sentence, currentWord);
          currentWord = sWords[Math.floor(prng()*sWords.length)];
          sentence = input = currentWord;
          break;
        }
        // Choose a random next word from the list of next words for the current word
        const nextWord = this.chooseRandomNextWord(currentWord, prng);
        // console.log(this.chain[nextWord]);
        // If we couldn't choose a next word, break out of the loop
        if (!nextWord) {
          break;
        }

        // Add the next word to the sentence
        sentence += ' ' + nextWord.split(' ').shift();

        // Set the current word to the next word
        currentWord = nextWord;
        referenced = {...referenced, ...this.chain[nextWord]?.refs};
      }

      // Return to the seed word
      currentWord = input;

      initTime = Date.now();
      // Keep generating words until we reach the start of the chain
      while (currentWord && this.chain[currentWord] && !this.startWords[currentWord]) {
        // Stop if taking too long
        if(Date.now() - initTime > 6000) {
          console.warn('Markov took too long. Reset:', sentence, currentWord);
          currentWord = sWords[Math.floor(prng()*sWords.length)]
          sentence = input = currentWord
          break;
        }

        // Choose a random previous word from the list of previous words for the current word
        const previousWord = this.chooseRandomPreviousWord(currentWord, prng);

        // If we couldn't choose a previous word, break out of the loop
        if(!previousWord) {
          break;
        }

        // Prenpend to previous word to the sentence
        sentence = previousWord.slice(' ').pop() + ' ' + sentence;

        // Set the current word to the previous word
        currentWord = previousWord;
        referenced = {...referenced, ...this.chain[previousWord]?.refs};
      }
      const result = {
        refs: referenced,
        text: sentence,
        string: sentence,
      }
      // Check if the sentence passes the filter
      if(filter(result)) {
        // Resolve and return sentence
        resolve(result);
        break;
      }
    }
    // Return the generated sentence
    reject(`Could not generate sentence after ${retries} attempts`);
    });
  };

  // A helper function that chooses a random next word from the list of next words for a given word
  this.chooseRandomNextWord = function(word, prng = Math.random) {
    // Get the list of next words for the given word
    const nextWords = this.chain[word].nextWords;

    // If there are no next words, return null
    if (Object.keys(nextWords).length === 0 || this.endWords[word] !== undefined) {
      return null;
    }

    // Choose a random index from the list of next words
    const nextWordIndex = Math.floor(prng() * Object.keys(nextWords).length);

    // Choose the next word based on it's weight.
    const select = prng() * this.chain[word].nw + 1;
    let accumulate = this.chain[word].nw;
    let picked = Object.keys(nextWords)[nextWordIndex];
    for( const next in nextWords ) {
      accumulate -= nextWords[next];
      if(accumulate <= select && next !== word) {
        picked = next;
        break;
      }
    }
    // Return the next word picked.
    return picked;

  };

  // A helper function that chooses a random previous word form the list of previous words for a given word
  this.chooseRandomPreviousWord = function(word, prng = Math.random) {
    // Get the list of previous words for the given word
    const previousWords = this.chain[word].previousWords;
    // If there are no previous words, return null
    if (Object.keys(previousWords).length === 0 || this.startWords[word] !== undefined) {
      return null;
    }

    // Choose a random index from the list of previous words
    const previousWordIndex = Math.floor(prng() * Object.keys(previousWords).length);

    // Return the previous word at the chosen index

     // Choose the next word based on it's weight.
     const select = prng() * this.chain[word].pw + 1;
     let accumulate = this.chain[word].pw;
     let picked = Object.keys(previousWords)[previousWordIndex];
     for( const previous in previousWords ) {
       accumulate += previousWords[previous];
       if(accumulate <= select && previous !== word) {
         picked = previous;
         break;
       }
     }
     // Return the previous word picked.
     return picked;
  }
};

// Example
module.exports.example = function() {
  const markovChain = new exports.MarkovChain('hello world this is a string with metadata');
  markovChain.buildChain();

  const sentence = markovChain.generateSentence('hello');
  // "hello world this is a string"
  console.log(sentence);
  return(sentence);
};
