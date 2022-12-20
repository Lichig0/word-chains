module.exports.MarkovChain = function() {
  this.chain = {};
  this.startWords = {};
  this.endWords = {};

  this.buildChain = function(words) {
    // Iterate over the words and add each word to the chain
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const metadata = word.metadata; // The metadata for the current word

      // If the word is not already in the chain, add it
      if (!this.chain[word]) {
        this.chain[word] = {
          metadata: metadata,
          nextWords: {},
          previousWords: {},
        };
      }
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

  this.addString = function(strings) {
    if(Array.isArray(strings)) {
      strings.forEach(str => {
        this.addString(str);
      });
    } else if(strings === undefined || strings === ' ' || strings === '') {
      console.warn(strings, 'not defined, skipping...');
      return;
    } else if (strings) {
      if(!strings.split) {
        console.warn(strings, 'is a bad egg');
        return;
      }
      const words = strings.split(' ');
      this.buildChain(words);
    }
  }

  this.generateSentence = function(options = {}) {
    // If options are just a string, set it as the input option
    if(typeof options === 'string') {
      options = {
        input: options
      };
    }
    let seedWord = options.input;
    const sWords = Object.keys(this.startWords);
    sWords[Math.floor(Math.random()*sWords.length)];
    seedWord = seedWord ?? sWords[Math.floor(Math.random()*sWords.length)];
    // Start the sentence with the starting word
    let sentence = seedWord;

    // Set the current word to the starting word
    let currentWord = seedWord;

    // Keep generating words until we reach the end of the chain
    while (currentWord && this.chain[currentWord]) {
      // Choose a random next word from the list of next words for the current word
      const nextWord = this.chooseRandomNextWord(currentWord);

      // If we couldn't choose a next word, break out of the loop
      if (!nextWord) {
        break;
      }

      // Add the next word to the sentence
      sentence += ' ' + nextWord;

      // Set the current word to the next word
      currentWord = nextWord;
    }

    // Return to the seed word
    currentWord = seedWord;
    // Keep generating words until we reach the start of the chain
    while (currentWord && this.chain[currentWord]) {
      // Choose a random previous word from the list of previous words for the current word
      const previousWord = this.chooseRandomPreviousWord(currentWord);
      // If we couldn't choose a previous word, break out of the loop
      if(!previousWord) {
        break;
      }

      // Prenpend to previous word to the sentence
      sentence = previousWord + ' ' + sentence;

      // Set the current word to the previous word
      currentWord = previousWord;
    }

    // Return the generated sentence
    return sentence;
  };

  // A helper function that chooses a random next word from the list of next words for a given word
  this.chooseRandomNextWord = function(word) {
    // Get the list of next words for the given word
    const nextWords = this.chain[word].nextWords;

    // If there are no next words, return null
    if (Object.keys(nextWords).length === 0) {
      return null;
    }

    // Choose a random index from the list of next words
    const nextWordIndex = Math.floor(Math.random() * Object.keys(nextWords).length);

    // Return the next word at the chosen index
    return Object.keys(nextWords)[nextWordIndex];
  };

  // A helper function that chooses a random previous word form the list of previous words for a given word
  this.chooseRandomPreviousWord = function(word) {
    // Get the list of previous words for the given word
    const previousWords = this.chain[word].previousWords;
    // If there are no previous words, return null
    if (Object.keys(previousWords).length === 0) {
      return null;
    }

    // Choose a random index from the list of previous words
    const previousWordIndex = Math.floor(Math.random() * Object.keys(previousWords).length);

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
};
