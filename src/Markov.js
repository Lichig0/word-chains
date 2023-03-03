module.exports.MarkovChain = function() {
  this.chain = {};
  this.startWords = {};
  this.endWords = {};

  this.buildChain = function(words, metadata = {}) {
    // Iterate over the words and add each word to the chain
    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // If the word is not already in the chain, add it
      if (!this.chain[word]) {
        this.chain[word] = {
          data: metadata,
          refs: {},
          nextWords: {},
          previousWords: {},
        };
      }
      this.chain[word].refs[words.reduce((accumulator, currentWord) => accumulator + ' ' + currentWord)] = Date.now();
      // If is a start word, and isn't already indexed as a start word
      if(i === 0 && !this.startWords[word]) {
        this.startWords[word] = this.chain[word];
      }

      // If is an end word, and isn't already indexed as an end word
      if(i == (words.length - 1) && !this.endWords[word]) {
        this.endWords[word] = this.chain[word];
      }

      // If there is a next word, add it to the list of next words for the current word
      if (i < words.length - 1) {
        const nextWord = words[i + 1];
        this.chain[word].nextWords[nextWord] = (this.chain[word].nextWords[nextWord] || 0) + 1;
      }

      //If there is a previous word, add it to the list of previous words for the current word
      if (i > 0) {
        const previousWord = words[i-1];
        this.chain[word].previousWords[previousWord] = (this.chain[word].previousWords[previousWord] || 0) + 1;
      }
    }
  };

  this.addString = function(sentence, data) {
    // This is bad- feeding this an array of arrays could go poorly.
    if(Array.isArray(sentence)) {
      console.warn('DO NOT ACCEPT ARRAY ANYMORE');
      // sentence.forEach(str => {
      //   this.addString(str, data);
      // });
    } else if(sentence === undefined || sentence === ' ' || sentence === '') {
      console.warn(sentence, 'not defined, skipping...');
      return;
    } else if (sentence) {
      if(!sentence.split) {
        console.warn(sentence, 'is a bad egg');
        return;
      }
      const words = sentence.split(' ');
      this.buildChain(words, data);
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
      filter = (sentence) => sentence.split(' ').length >= 2,
      prng = Math.random,
    } = options;

    let sentence = '';
    for(let i = 0; i < retries; i++) {
      const sWords = Object.keys(this.startWords);
      const meta = [];
      let referenced = {};
      sWords[Math.floor(prng()*sWords.length)];
      input = input ?? sWords[Math.floor(prng()*sWords.length)];
      // Start the sentence with the starting word
      sentence = input;

      // Set the current word to the starting word
      let currentWord = input;

      // Keep generating words until we reach the end of the chain
      while (currentWord && this.chain[currentWord]) {
        // Choose a random next word from the list of next words for the current word
        const nextWord = this.chooseRandomNextWord(currentWord, prng);
        // console.log(this.chain[nextWord]);
        // If we couldn't choose a next word, break out of the loop
        if (!nextWord) {
          break;
        }

        // Add the next word to the sentence
        sentence += ' ' + nextWord;

        // Set the current word to the next word
        currentWord = nextWord;
        meta.push(this.chain[nextWord].data)
        referenced = {...referenced, ...this.chain[nextWord].refs};
      }

      // Return to the seed word
      currentWord = input;
      // Keep generating words until we reach the start of the chain
      while (currentWord && this.chain[currentWord]) {
        // Choose a random previous word from the list of previous words for the current word
        const previousWord = this.chooseRandomPreviousWord(currentWord, prng);

        // If we couldn't choose a previous word, break out of the loop
        if(!previousWord) {
          break;
        }

        // Prenpend to previous word to the sentence
        sentence = previousWord + ' ' + sentence;

        // Set the current word to the previous word
        currentWord = previousWord;
        meta.push(this.chain[previousWord].data)
        referenced = {...referenced, ...this.chain[previousWord].refs};
      }
      // Check if the sentence passes the filter
      if(filter(sentence)) {
        // Resolve and return sentence
        resolve({
          refs: referenced,
          data: meta,
          text: sentence
        });
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
    if (Object.keys(nextWords).length === 0) {
      return null;
    }

    // Choose a random index from the list of next words
    const nextWordIndex = Math.floor(prng() * Object.keys(nextWords).length);

    // Return the next word at the chosen index
    return Object.keys(nextWords)[nextWordIndex];
  };

  // A helper function that chooses a random previous word form the list of previous words for a given word
  this.chooseRandomPreviousWord = function(word, prng = Math.random) {
    // Get the list of previous words for the given word
    const previousWords = this.chain[word].previousWords;
    // If there are no previous words, return null
    if (Object.keys(previousWords).length === 0) {
      return null;
    }

    // Choose a random index from the list of previous words
    const previousWordIndex = Math.floor(prng() * Object.keys(previousWords).length);

    // Return the previous word at the chosen index
    return Object.keys(previousWords)[previousWordIndex];
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
